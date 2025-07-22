const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    title: 'Zoolup Image Upscaler',
    icon: path.join(__dirname, 'icon.png'), 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // Try to detect the Next.js dev server port, default to 3000
  const devPort = process.env.NEXT_DEV_PORT || '3000';
  const startUrl = isDev 
    ? `http://localhost:3000` 
    : `file://${path.join(__dirname, '../out/index.html')}`;

  console.log('Loading URL:', startUrl);

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation for SPA
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -6) { // ERR_FILE_NOT_FOUND
      mainWindow.loadURL(startUrl);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for future Python backend communication
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif'] }
    ]
  });
  
  return result.filePaths[0];
});

ipcMain.handle('save-file', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif'] }
    ]
  });
  
  return result.filePath;
});

// Future: Add handlers for Python backend communication
// ipcMain.handle('upscale-image', async (event, imagePath, options) => {
//   // Call Python backend here
// });
