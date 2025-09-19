const { contextBridge, ipcRenderer } = require('electron');

// cuurently unused but may be useful later
contextBridge.exposeInMainWorld('electronAPI', {
    /* selectFile: () => ipcRenderer.invoke('select-file'),
    saveFile: (defaultPath) => ipcRenderer.invoke('save-file', defaultPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath), */
});
