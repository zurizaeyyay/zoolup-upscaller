'use client';

import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESAMPLE_MODES } from '@/types/upscaler';

interface SettingsSidebarProps {
  dimmingFactor: number[];
  setDimmingFactor: (value: number[]) => void;
  showProgress: boolean;
  setShowProgress: (value: boolean) => void;
  resampleMode: string;
  setResampleMode: (value: string) => void;
}

export default function SettingsSidebar({
  dimmingFactor,
  setDimmingFactor,
  showProgress,
  setShowProgress,
  resampleMode,
  setResampleMode
}: SettingsSidebarProps) {
  return (
    <div className="w-full lg:w-80 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Image Dimming Factor</Label>
            <div className="px-2 py-4">
              <Slider
                value={dimmingFactor}
                onValueChange={setDimmingFactor}
                min={1.0}
                max={5.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1.0</span>
                <span>{dimmingFactor[0].toFixed(1)}</span>
                <span>5.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-progress"
              checked={showProgress}
              onCheckedChange={(checked) => setShowProgress(checked === true)}
            />
            <Label htmlFor="show-progress">Show Image Progress</Label>
          </div>

          <div>
            <Label>Resample Mode</Label>
            <Select value={resampleMode} onValueChange={setResampleMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select an interpolation method" />
              </SelectTrigger>
              <SelectContent>
                {RESAMPLE_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
