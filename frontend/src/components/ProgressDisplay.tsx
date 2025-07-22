'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

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

  const progressBarRef = useRef(null);
  const { isProcessing, progress } = processingState;
  
  // Animate progress bar width using GSAP
  useEffect(() => {
    if (isProcessing && progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${progress}%`,
        duration: 0.5,
        ease: 'power1.out',
      });
    }
  }, [progress, isProcessing]);

  if (!isProcessing || !showProgress) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{processingState.currentStep}</div>
            <div className="text-muted-foreground text-sm">{Math.round(progress)}%</div>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div ref={progressBarRef} className="bg-primary-500 h-full" style={{ width: '0%' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
