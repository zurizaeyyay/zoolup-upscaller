const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (defaultPath) => ipcRenderer.invoke('save-file', defaultPath),
  // Future: Add upscaling methods
  // upscaleImage: (imagePath, options) => ipcRenderer.invoke('upscale-image', imagePath, options)
});
