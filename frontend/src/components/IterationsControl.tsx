'use client';

import { ImageUpscale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MAX_NODES, FACTORS } from '@/types/upscaler';

interface IterationsControlProps {
  originalImage: string | null;
  iterationCount: number[];
  selectedFactors: (string | null)[];
  isUpscaleReady: boolean;
  isProcessing: boolean;
  onIterationCountChange: (value: number[]) => void;
  onFactorChange: (index: number, factor: string) => void;
  onUpscale: () => void;
}

export default function IterationsControl({
  originalImage,
  iterationCount,
  selectedFactors,
  isUpscaleReady,
  isProcessing,
  onIterationCountChange,
  onFactorChange,
  onUpscale
}: IterationsControlProps) {
  if (!originalImage) {
    return null;
  }

  return (
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
              onValueChange={onIterationCountChange}
              min={1}
              max={MAX_NODES}
              step={1}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-sm text-gray-500">
              <span>1</span>
              <span>{iterationCount[0]}</span>
              <span>{MAX_NODES}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
                      onChange={() => onFactorChange(i, factor)}
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

        <div className="flex w-full justify-center">
          <Button
            onClick={onUpscale}
            disabled={!isUpscaleReady}
            variant="outline"
            className="w-q-full"
            size="lg"
          >
            <ImageUpscale className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Upscale'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
