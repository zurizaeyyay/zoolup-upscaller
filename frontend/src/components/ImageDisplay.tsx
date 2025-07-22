'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageDisplayProps {
  originalImage: string | null;
  resultImage: string | null;
  processingComplete: boolean;
  dimmingFactor: number;
}

export default function ImageDisplay({
  originalImage,
  resultImage,
  processingComplete,
  dimmingFactor
}: ImageDisplayProps) {
  return (
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
                style={{ filter: `brightness(${1 / dimmingFactor})` }}
              />
            ) : (
              <div className="text-gray-400">Result will appear here</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
