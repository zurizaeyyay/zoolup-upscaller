'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProcessingState } from '@/types/upscaler';

interface ProgressDisplayProps {
  processingState: ProcessingState;
  showProgress: boolean;
}

export default function ProgressDisplay({
  processingState,
  showProgress
}: ProgressDisplayProps) {
  if (!((processingState.isProcessing || processingState.currentStep) && showProgress)) {
    return null;
  }

  return (
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
  );
}
