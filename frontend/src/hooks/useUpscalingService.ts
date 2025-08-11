'use client';

import { startTransition } from 'react';
import { flushSync } from 'react-dom';
import { ProcessingState } from '@/types/upscaler';
import { getApiBase } from '@/lib/utils';

const apiBase = getApiBase();
const apiUrl = apiBase; // full base
const apiHost = apiBase.replace(/^https?:\/\//, '');

interface UpscalingServiceProps {
  jobId: string;
  file: File;
  factors: string[];
  resampleMode: string;
  showProgress: boolean;
  count: number;
  setProcessingState: React.Dispatch<React.SetStateAction<ProcessingState>>;
  setResultImage: React.Dispatch<React.SetStateAction<string | null>>;
  setResultName: React.Dispatch<React.SetStateAction<string>>;
  setProcessingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (options: { title: string; description: string; variant?: 'destructive' }) => void;
}

export const useUpscalingService = () => {
  const performUpscaling = async ({
    jobId,
    file,
    factors,
    resampleMode,
    showProgress,
    count,
    setProcessingState,
    setResultImage,
    setResultName,
    setProcessingComplete,
    toast
  }: UpscalingServiceProps) => {
    // Start WebSocket connection for progress updates
    let ws: WebSocket | null = null;
    let wsReady = false;

    if (showProgress) {
      console.log(`🔌 Connecting WebSocket to: ws://${apiHost}/ws/${jobId}`);
      ws = new WebSocket(`ws://${apiHost}/ws/${jobId}`);

      // Set up all handlers before waiting for connection
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          flushSync(() => {
            console.log('📨 Progress update received:', data);

            startTransition(() => {
              setProcessingState(prev => ({
                ...prev,
                progress: Math.round(data.progress * 100),
                currentStep: data.message || 'Processing...',
                currentIteration: Math.ceil(data.progress * count)
              }));
            });
          });

          // whenever server says 1.0 progress (100%), check if final stage
          if (data.progress === 1) {
            const statusRes = await fetch(`${apiUrl}/job/${jobId}`);
            if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
            const statusData = await statusRes.json() as {
              jobId: string;
              status: string;
              progress: number;
              message: string;
              filename: string;
            };
            
            if (statusData.status === 'completed') {
              // fetch the upscaled image
              const imgResp = await fetch(`${apiUrl}/download/${jobId}`);
              if (!imgResp.ok) {
                throw new Error(`Download failed: ${imgResp.status}`);
              }
              const blob = await imgResp.blob();
              const url = URL.createObjectURL(blob);

              // update UI
              setResultImage(url);
              setResultName(statusData.filename); 
              setProcessingComplete(true);

              startTransition(() => {
                setProcessingState(prev => ({
                  ...prev,
                  isProcessing: false,
                  progress: 100,
                  currentStep: 'Image upscaled successfully!'
                }));
              });

              toast({ title: 'Success!', description: 'Image upscaled successfully.' });

              // TODO: Allow user option (when running client-side) to keep all result images
              // Currently it gets the blob and one the front-end has the result its deleted on the backend.
              // Modify so logic is easier for multiple images
              // cleanup server‐side job
              setTimeout(async () => {
                try {
                  await fetch(`${apiUrl}/job/${jobId}`, { method: 'DELETE' });
                } catch (e) {
                  console.error('Cleanup error:', e);
                }
                startTransition(() => {
                  setProcessingState(prev => ({
                    ...prev,
                    currentStep: '',
                    progress: 0
                  }));
                });
              }, 5000);

              // close socket
              ws?.close();
            }
          }
        } catch (err) {
          console.error('❌ WS handler error:', err);
        }
      };

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        wsReady = true;
      };
      ws.onerror = (e) => console.error('❌ WebSocket error:', e);
      ws.onclose = (e) => console.log('🔌 WS closed', e.code, e.reason);
      
      // wait up to 5s for WS, but don't block UI
      await new Promise<void>(res => {
        setTimeout(() => res(), 5000);
        if (wsReady) res();
      });
    }

    try {
      // Prepare form data and send job request
      const scalesArray = factors.map(f => f.substring(1));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scales', JSON.stringify(scalesArray)); // Remove 'x' prefix
      formData.append('resample_mode', resampleMode);
      formData.append('show_progress', showProgress.toString());
      formData.append('job_id', jobId);

      // Send upscale request
      const response = await fetch(`${apiUrl}/upscale`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      await response.json();
      
    } catch (error) {
      console.error('❌ Upscale API error:', error);
      startTransition(() => {
        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          currentStep: '',
          progress: 0
        }));
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upscale image",
        variant: "destructive"
      });
      ws?.close();
    }
  };

  return { performUpscaling };
};
