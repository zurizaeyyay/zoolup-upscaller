'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Settings, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const MAX_NODES = 5;
const FACTORS = ['x2', 'x4', 'x8'];
const IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'];

const resampleModes = [
  { value: 'nearest', label: 'Nearest Neighbor - Fast' },
  { value: 'linear', label: 'Linear - Basic interpolation' },
  { value: 'bilinear', label: 'Bilinear - Smooth interpolation' },
  { value: 'bicubic', label: 'Bicubic - High quality, smooth (recommended)' },
  { value: 'trilinear', label: 'Trilinear - 3D interpolation' },
  { value: 'nearest-exact', label: 'Nearest Neighbor Exact' }
];

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  currentIteration: number;
  totalIterations: number;
}

export default function ImageUpscaler() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dimmingFactor, setDimmingFactor] = useState([2.0]);
  const [showProgress, setShowProgress] = useState(true);
  const [resampleMode, setResampleMode] = useState<string>('');
  const [iterationCount, setIterationCount] = useState([1]);
  const [selectedFactors, setSelectedFactors] = useState<(string | null)[]>([null]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: '',
    currentIteration: 0,
    totalIterations: 0
  });
  const [processingComplete, setProcessingComplete] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback((file: File) => {
    if (!file) return;
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!IMAGE_FORMATS.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `Please select an image file: ${IMAGE_FORMATS.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setFileName(file.name);
    setProcessingComplete(false);
    setResultImage(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOriginalImage(result);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const updateIterationCount = (newCount: number[]) => {
    setIterationCount(newCount);
    const count = newCount[0];
    setSelectedFactors(prev => {
      const newFactors = [...prev];
      if (newFactors.length < count) {
        // Add null values for new iterations
        while (newFactors.length < count) {
          newFactors.push(null);
        }
      } else if (newFactors.length > count) {
        // Remove excess iterations
        newFactors.splice(count);
      }
      return newFactors;
    });
  };

  const updateFactor = (index: number, factor: string) => {
    setSelectedFactors(prev => {
      const newFactors = [...prev];
      newFactors[index] = factor;
      return newFactors;
    });
  };

  const isUpscaleReady = () => {
    const count = iterationCount[0];
    return originalImage && 
           selectedFactors.slice(0, count).every(factor => factor !== null) &&
           !processingState.isProcessing;
  };

  const simulateUpscaling = async () => {
    if (!originalImage) return;

    const count = iterationCount[0];
    const factors = selectedFactors.slice(0, count).filter(f => f !== null) as string[];
    
    setProcessingState({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting upscale...',
      currentIteration: 0,
      totalIterations: count
    });

    try {
      for (let i = 0; i < factors.length; i++) {
        const factor = factors[i];
        
        // Simulate model initialization
        setProcessingState(prev => ({
          ...prev,
          currentStep: `Initializing model for ${factor} upscaling...`,
          currentIteration: i + 1,
          progress: (i / factors.length) * 100 * 0.1
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate processing steps
        const steps = ['Loading model weights', 'Processing image', 'Applying upscaling', 'Finalizing result'];
        for (let step = 0; step < steps.length; step++) {
          setProcessingState(prev => ({
            ...prev,
            currentStep: `${steps[step]} (${factor})...`,
            progress: ((i + (step + 1) / steps.length) / factors.length) * 100
          }));
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        setProcessingState(prev => ({
          ...prev,
          currentStep: `Finished upscale iteration ${i + 1}/${count} with scale ${factor}`,
          progress: ((i + 1) / factors.length) * 100
        }));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Set the result image (for demo, just use the original)
      setResultImage(originalImage);
      setProcessingComplete(true);
      
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'Image upscaled successfully!',
        progress: 100
      }));

      toast({
        title: "Success!",
        description: "Image upscaled successfully",
      });

      // Clear progress after a delay
      setTimeout(() => {
        setProcessingState(prev => ({
          ...prev,
          currentStep: '',
          progress: 0
        }));
      }, 3000);

    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: '',
        progress: 0
      }));
      
      toast({
        title: "Error",
        description: "Failed to upscale image",
        variant: "destructive"
      });
    }
  };

  const generateFilename = () => {
    if (!fileName) return 'upscaled_image.png';
    
    const count = iterationCount[0];
    const factors = selectedFactors.slice(0, count).filter(f => f !== null) as string[];
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const factorsStr = factors.join(' ');
    
    return `${nameWithoutExt} (${factorsStr})${extension}`;
  };

  const handleDownload = () => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = generateFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Image Dimming Factor</Label>
                  <div className="px-2 py-4">
                    <Slider
                      value={dimmingFactor}
                      onValueChange={setDimmingFactor}
                      min={1.0}
                      max={5.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>1.0</span>
                      <span>{dimmingFactor[0].toFixed(1)}</span>
                      <span>5.0</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-progress" 
                    checked={showProgress}
                    onCheckedChange={(checked) => setShowProgress(checked === true)}
                  />
                  <Label htmlFor="show-progress">Show Image Progress</Label>
                </div>

                <div>
                  <Label>Resample Mode</Label>
                  <Select value={resampleMode} onValueChange={setResampleMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an interpolation method" />
                    </SelectTrigger>
                    <SelectContent>
                      {resampleModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">🖼️ Image Upscaler</h1>
              <p className="text-gray-600 dark:text-gray-400">Upload an image to upscale using RealESRGAN</p>
            </div>

            {/* Image Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Original Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {originalImage ? (
                      <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-gray-400">No image uploaded</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {processingComplete ? 'Upscaled Image' : 'Result Image (Placeholder)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {processingComplete && resultImage ? (
                      <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain" />
                    ) : originalImage ? (
                      <img 
                        src={originalImage} 
                        alt="Placeholder" 
                        className="max-w-full max-h-full object-contain opacity-50" 
                        style={{ filter: `brightness(${1 / dimmingFactor[0]})` }}
                      />
                    ) : (
                      <div className="text-gray-400">Result will appear here</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            {(processingState.isProcessing || processingState.currentStep) && showProgress && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Progress value={processingState.progress} className="w-full" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {processingState.currentStep}
                      {processingState.isProcessing && processingState.totalIterations > 0 && (
                        <span className="ml-2">
                          (Iteration {processingState.currentIteration}/{processingState.totalIterations})
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload an Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">Drag and drop file here</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Limit 200MB per file • PNG, JPG, JPEG, TIFF, BMP, GIF, TIF
                  </p>
                  <Button variant="outline">Browse files</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_FORMATS.join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </div>
                
                {fileName && (
                  <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">filename: {fileName}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Download Button */}
            {processingComplete && resultImage && (
              <Card>
                <CardContent className="pt-6">
                  <Button onClick={handleDownload} className="w-full" size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Download Upscaled Image
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Iterations Control */}
            {originalImage && (
              <Card>
                <CardHeader>
                  <CardTitle>Iterations Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Number of Iterations</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={iterationCount}
                        onValueChange={updateIterationCount}
                        min={1}
                        max={MAX_NODES}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>1</span>
                        <span>{iterationCount[0]}</span>
                        <span>{MAX_NODES}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: iterationCount[0] }, (_, i) => (
                      <div key={i} className="space-y-2">
                        <Label>Iteration {i + 1}</Label>
                        <div className="space-y-2">
                          {FACTORS.map((factor) => (
                            <div key={factor} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`factor-${i}-${factor}`}
                                name={`iteration-${i}`}
                                value={factor}
                                checked={selectedFactors[i] === factor}
                                onChange={() => updateFactor(i, factor)}
                                className="radio"
                              />
                              <Label htmlFor={`factor-${i}-${factor}`} className="text-sm">
                                {factor}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <Button 
                    onClick={simulateUpscaling}
                    disabled={!isUpscaleReady()}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {processingState.isProcessing ? 'Processing...' : 'Upscale'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
