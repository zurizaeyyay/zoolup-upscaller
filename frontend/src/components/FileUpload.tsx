'use client';

import { forwardRef } from 'react';
import { Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IMAGE_FORMATS } from '@/types/upscaler';

interface FileUploadProps {
  fileName: string;
  onFileUpload: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(({
  fileName,
  onFileUpload,
  onDrop,
  onDragOver
}, ref) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload an Image</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
          onClick={() => (ref as React.RefObject<HTMLInputElement>)?.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">Drag and drop file here</p>
          <p className="text-sm text-gray-500 mb-4">
            Limit 200MB per file • PNG, JPG, JPEG, TIFF, BMP, GIF, TIF
          </p>
          <Button variant="outline">Browse files</Button>
          <input
            ref={ref}
            type="file"
            accept={IMAGE_FORMATS.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload(file);
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
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
