// Allows barrel exports for easy imports 
// e.g import { ImageUpscaler, SettingsSidebar, Fileupload } from '@/components';

// Main components
export { default as ImageUpscaler } from './ImageUpscaler';
export { default as SettingsSidebar } from './SettingsSidebar';
export { default as ImageDisplay } from './ImageDisplay';
export { default as ProgressDisplay } from './ProgressDisplay';
export { default as FileUpload } from './FileUpload';
export { default as DownloadButton } from './DownloadButton';
export { default as IterationsControl } from './IterationsControl';

// UI components (re-export for convenience)
export * from './ui/button';
export * from './ui/card';
export * from './ui/checkbox';
export * from './ui/label';
export * from './ui/progress';
export * from './ui/select';
export * from './ui/separator';
export * from './ui/slider';
export * from './ui/toast';
export * from './ui/toaster';
