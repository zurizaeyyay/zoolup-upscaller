export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  currentIteration: number;
  totalIterations: number;
}

export interface ResampleMode {
  value: string;
  label: string;
}

export const MAX_NODES = 5;
export const FACTORS = ['x2', 'x4', 'x8'];
export const IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'];

export const RESAMPLE_MODES: ResampleMode[] = [
  { value: 'nearest', label: 'Nearest Neighbor - Fast and sharp lines' },
  { value: 'bilinear', label: 'Bilinear - Smooth interpolation' },
  { value: 'bicubic', label: 'Bicubic - High quality, smooth (recommended)' },
  { value: 'area', label: 'Area - Good for downsampling' },
  { value: 'nearest-exact', label: 'Nearest Neighbor Exact - Newer nearest neighbor algorithm' },
];
