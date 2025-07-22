'use client';

import { useState, useCallback, useRef, startTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

// Import types
import { ProcessingState, IMAGE_FORMATS } from '@/types/upscaler';

// Import components
import {
  SettingsSidebar,
  ImageDisplay,
  ProgressDisplay,
  FileUpload,
  DownloadButton,
  IterationsControl
} from '@/components';

// Import hooks
import { useUpscalingService } from '@/hooks/useUpscalingService';

export default function ImageUpscaler() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [dimmingFactor, setDimmingFactor] = useState([2.0]);
  const [showProgress, setShowProgress] = useState(true);
  const [resampleMode, setResampleMode] = useState<string>('nearest-exact');
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
  const { performUpscaling } = useUpscalingService();

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

  const isUpscaleReady = (): boolean => {
    const count = iterationCount[0];
    return !!(originalImage &&
      selectedFactors.slice(0, count).every(factor => factor !== null) &&
      !processingState.isProcessing);
  };

  const handleUpscale = async () => {
    if (!originalImage || !fileInputRef.current?.files?.[0]) return;

    //Clear previous results immediately when starting new upscale
    setResultImage(null);
    setProcessingComplete(false);

    const count = iterationCount[0];
    const factors = selectedFactors.slice(0, count).filter(f => f !== null) as string[];
    const file = fileInputRef.current.files[0];

    startTransition(() => {
      setProcessingState({
        isProcessing: true,
        progress: 0,
        currentStep: 'Starting upscale...',
        currentIteration: 0,
        totalIterations: count
      });
    });

    const jobId = crypto.randomUUID();

    await performUpscaling({
      jobId,
      file,
      factors,
      resampleMode,
      showProgress,
      count,
      setProcessingState,
      setResultImage,
      setResultName,
      setProcessingComplete,
      toast
    });
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = resultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <SettingsSidebar
            dimmingFactor={dimmingFactor}
            setDimmingFactor={setDimmingFactor}
            showProgress={showProgress}
            setShowProgress={setShowProgress}
            resampleMode={resampleMode}
            setResampleMode={setResampleMode}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">🖼️ Image Upscaler</h1>
              <p className="text-gray-600 dark:text-gray-400">Upload an image to upscale using RealESRGAN</p>
            </div>

            {/* Image Display */}
            <ImageDisplay
              originalImage={originalImage}
              resultImage={resultImage}
              processingComplete={processingComplete}
              dimmingFactor={dimmingFactor[0]}
            />

            {/* Progress */}
            <ProgressDisplay
              processingState={processingState}
              showProgress={showProgress}
            />

            {/* File Upload */}
            <FileUpload
              ref={fileInputRef}
              fileName={fileName}
              onFileUpload={handleFileUpload}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />

            {/* Download Button */}
            <DownloadButton
              processingComplete={processingComplete}
              resultImage={resultImage}
              onDownload={handleDownload}
            />

            {/* Iterations Control */}
            <IterationsControl
              originalImage={originalImage}
              iterationCount={iterationCount}
              selectedFactors={selectedFactors}
              isUpscaleReady={isUpscaleReady()}
              isProcessing={processingState.isProcessing}
              onIterationCountChange={updateIterationCount}
              onFactorChange={updateFactor}
              onUpscale={handleUpscale}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
