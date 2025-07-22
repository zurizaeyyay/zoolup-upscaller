'use client';

import { forwardRef, useCallback, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IMAGE_FORMATS } from '@/types/upscaler';
import { gsap } from 'gsap';

interface FileUploadProps {
  fileName: string;
  onFileUpload: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ fileName, onFileUpload, onDrop, onDragOver }, ref) => {

    const uploadAreaRef = useRef(null);

    // Animation for drag enter
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      gsap.to(uploadAreaRef.current, {
        scale: 1.02,
        borderColor: 'var(--primary-400)',
        backgroundColor: 'rgba(248, 56, 146, 0.05)',
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    // Animation for drag leave
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      gsap.to(uploadAreaRef.current, {
        scale: 1,
        borderColor: 'var(--border)',
        backgroundColor: 'transparent',
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    // Handler to trigger file input click
    const handleBrowseClick = useCallback(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.click();
      }
    }, [ref]);

    // Separate handler for button to prevent bubbling (when it triggers twice)
    const handleButtonClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to parent div
        handleBrowseClick();
      },
      [handleBrowseClick]
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload an Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={uploadAreaRef}
            onDrop={(e) => {
              handleDragLeave(e);
              onDrop(e);
            }}
            onDragOver={onDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
            onClick={handleBrowseClick}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg">Drag and drop file here</p>
            <p className="mb-4 text-sm text-gray-500">
              Limit 200MB per file • PNG, JPG, JPEG, TIFF, BMP, GIF, TIF
            </p>
            <Button variant="outline" type="button" onClick={handleButtonClick}>
              Browse files
            </Button>
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
            <div className="mt-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
              <p className="text-sm">Filename: {fileName}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

FileUpload.displayName = 'FileUpload';

export default FileUpload;
