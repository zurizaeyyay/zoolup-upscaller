const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
const isPacked = app.isPackaged;
const openDevtools = process.env.OPEN_DEVTOOLS === 'true' && !isPacked;

let mainWindow;
let backendProcess = null;

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
    ? `http://localhost:${devPort}` 
    : `file://${path.join(__dirname, '../out/index.html')}`;

  console.log('Loading URL:', startUrl);

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (openDevtools) {
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

// In production, you can optionally spawn a bundled backend (e.g., a PyInstaller exe)
// Configure environment variable BACKEND_BINARY_PATH to an absolute or app.asar.unpacked-relative path
function startBackendIfAvailable() {
  try {
    const platform = process.platform; // 'win32' | 'darwin' | 'linux'
    const arch = process.arch;         // 'x64' | 'arm64' | ...
    const binaryName = platform === 'win32' ? 'backend.exe' : 'backend';

    // Prefer env override; otherwise resolve from packaged resources
    const defaultPath = isDev
      ? null
      : path.join(process.resourcesPath, 'backends', platform, arch, binaryName);

    const backendPath = process.env.BACKEND_BINARY_PATH || defaultPath;
    if (!backendPath) return;
    if (!fs.existsSync(backendPath)) {
      console.warn('Backend binary not found at', backendPath);
      return;
    }

    backendProcess = spawn(backendPath, [], { stdio: 'pipe' });
    backendProcess.stdout.on('data', (d) => console.log('[backend]', d.toString()));
    backendProcess.stderr.on('data', (d) => console.error('[backend]', d.toString()));
    backendProcess.on('exit', (code) => {
      console.log('Backend exited with code', code);
      backendProcess = null;
    });
  } catch (e) {
    console.error('Failed to start backend:', e);
  }
}

function stopBackendIfRunning() {
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill();
      backendProcess = null;
    }
  } catch (e) {
    console.error('Failed to stop backend:', e);
  }
}

app.on('before-quit', () => {
  stopBackendIfRunning();
});

if (!isDev) {
  app.whenReady().then(() => {
    startBackendIfAvailable();
  });
}

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

ipcMain.handle('read-file', async (event, filePath) => {
  // Return a base64 string so renderer can construct a Blob if needed
  const data = await fs.promises.readFile(filePath);
  return data.toString('base64');
});

// Future: Add handlers for Python backend communication
// ipcMain.handle('upscale-image', async (event, imagePath, options) => {
//   // Call Python backend here
// });
