'use client';

import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
  processingComplete: boolean;
  resultImage: string | null;
  onDownload: () => void;
}

export default function DownloadButton({
  processingComplete,
  resultImage,
  onDownload
}: DownloadButtonProps) {
  if (!(processingComplete && resultImage)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Button onClick={onDownload} className="w-full" size="lg">
          <Download className="h-4 w-4 mr-2" />
          Download Upscaled Image
        </Button>
      </CardContent>
    </Card>
  );
}
