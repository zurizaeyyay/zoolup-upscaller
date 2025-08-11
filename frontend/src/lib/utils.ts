import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isElectron = () => {
  // injected by preload via contextIsolation
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

export function getApiBase() {
  // Prefer explicit envs when provided (web deployments)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // In Electron dev, assume local FastAPI on 127.0.0.1:8000
  // In packaged app, same default unless overridden via process env passed from main
  return 'http://127.0.0.1:8000';
}
