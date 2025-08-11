export {};

declare global {
  interface Window {
    electronAPI?: {
      selectFile: () => Promise<string | undefined>;
      saveFile: (defaultPath?: string) => Promise<string | undefined>;
      readFile: (filePath: string) => Promise<string>; // base64
    };
  }
}
