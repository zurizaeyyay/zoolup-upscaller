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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Original</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {originalImage ? (
              <img
                src={originalImage}
                alt="Original"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-gray-400">No image uploaded</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="[word-spacing:0.2em]">
            {processingComplete ? 'Upscaled Image' : 'Result  (preview)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {processingComplete && resultImage ? (
              <img
                src={resultImage}
                alt="Result"
                className="max-h-full max-w-full object-contain"
              />
            ) : originalImage ? (
              <img
                src={originalImage}
                alt="Placeholder"
                className="max-h-full max-w-full object-contain opacity-50"
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
