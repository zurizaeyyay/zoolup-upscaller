const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');

// Prevent multiple instances
app.requestSingleInstanceLock();

const isPacked = app.isPackaged;

// Load environment variables in the next.js style
// 1. Always load base .env first (shared variables)
const baseEnvPath = path.join(__dirname, '../.env');
console.log('Loaded base .env from:', baseEnvPath);

// 2. Conditionally load environment-specific .env (overrides)
const extraEnvPath = isPacked
    ? path.join(__dirname, '../.env.production')
    : path.join(__dirname, '../.env.local');
if (fs.existsSync(extraEnvPath)) {
    dotenv.config({ path: [baseEnvPath, extraEnvPath] });
    console.log('Loaded environment-specific .env from:', extraEnvPath);
} else {
    dotenv.config({ path: baseEnvPath });
}

const isDev = process.env.NODE_ENV === 'development' && !isPacked;
const openDevtools = process.env.OPEN_DEVTOOLS === 'true' && !isPacked;

let mainWindow;
let webContent;
let backendProcess = null;

// Suppress security warnings only in development to avoid console noise
if (isDev) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

app.whenReady().then(() => {
    if (!isDev || process.env.FROZEN_BACKEND == 'True') {
        startBackend();
        /* if (true) {
            try {
                await waitForBackendReady({ port: 8000 });
                console.log('Backend is ready.');
            } catch (err) {
                console.error('Backend readiness check failed:', err.message);
            }
        } */
    }
    createWindow();
});

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

app.on('before-quit', () => {
    stopBackendIfRunning();
});

process.on('exit', () => {
    stopBackendIfRunning();
});

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

    webContent = mainWindow.webContents;

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
            webContent.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle navigation for SPA
    webContent.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        if (errorCode === -6) {
            // ERR_FILE_NOT_FOUND
            mainWindow.loadURL(startUrl);
        }
    });
}

// Trys to test backend connection
// Will keep trying connection until timeout reached
function waitForBackendReady({
    host = '127.0.0.1',
    port = 8000,
    timeoutMs = 15000,
    intervalMs = 250,
}) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        (function tryConnect() {
            const socket = net.connect({ host, port }, () => {
                socket.end();
                resolve(true);
            });
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() > deadline) {
                    reject(
                        new Error(`Backend not reachable at ${host}:${port} within ${timeoutMs}ms`)
                    );
                } else {
                    setTimeout(tryConnect, intervalMs);
                }
            });
        })();
    });
}

// Configure environment variable BACKEND_BINARY_PATH to an absolute or app.asar.unpacked-relative path
function resolveBinaryPath() {
    // Allow override from env for local testing
    if (process.env.BACKEND_BINARY_PATH) return process.env.BACKEND_BINARY_PATH;

    // electron-builder extraResources land under process.resourcesPath
    const platform = process.platform; // 'win32' | 'darwin' | 'linux'
    const arch = process.arch; // 'x64' | 'arm64' | ...
    const binaryName = platform === 'win32' ? 'backend.exe' : 'backend';

    // Folder mapping for cleanliness
    const process_map = {
        win32: 'Win',
        darwin: 'Apple',
        linux: 'Linux',
    };
    const mappedPlatform = process_map[platform] || platform;
    const mappedArch = arch === 'arm64' ? 'arm' : arch;

    // Handle resource path resolving to node modules when not packaged
    resourcePth = isPacked ? process.resourcesPath : path.join(__dirname, '../resources');

    // Asssumes either in dev and running backend manually or
    // Not in dev and binary packaged to resources/backends/<platform>/<arch>/
    const bin_path =
        isDev && !process.env.FROZEN_BACKEND == 'True'
            ? null
            : path.join(resourcePth, 'backends', mappedPlatform, mappedArch, binaryName);
    return bin_path;
}

// Spawn backend process in silently background when in production
// Otherwise if in development start in foreground for easier debugging
// NOTE: FROZEN_BACKEND env var will need to be set to true to test frozen backend in dev
function startBackend() {
    const backendPath = resolveBinaryPath();
    try {
        if (!backendPath || !fs.existsSync(backendPath)) {
            console.warn('Backend binary not found at', backendPath);
            return false;
        }

        if (!isDev) {
            // Spawn quietly; inherit no stdio, hide window on Windows
            backendProcess = spawn(backendPath, [], {
                stdio: 'ignore',
                windowsHide: true,
            });
        } else {
            backendProcess = spawn(backendPath, [], { stdio: 'pipe' });
            backendProcess.stdout.on('data', (d) => console.log('[backend]', d.toString()));
            backendProcess.stderr.on('data', (d) => console.error('[backend]', d.toString()));
        }

        backendProcess.on('exit', (code) => {
            console.log('Backend exited:', code);
            backendProcess = null;
        });
        return true;
    } catch (e) {
        console.error('Failed to spawn backend:', e);
        return false;
    }
}

// TODO: FIX Wierd second zombie process spawn when using frozen exe in dev
function stopBackendIfRunning() {
    try {
        if (backendProcess && !backendProcess.killed) {
            console.log('Stopping backend process...');
            backendProcess.kill();
        }
    } catch (e) {
        console.error('Failed to stop backend:', e);
    }
    backendProcess = null;
}

/////////////////////////////////////////////////////////////
// IPC handlers for native file handling if needed later
/* ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif'] }],
    });

    return result.filePaths[0];
});

ipcMain.handle('save-file', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif'] }],
    });

    return result.filePath;
});

ipcMain.handle('read-file', async (event, filePath) => {
    // Return a base64 string so renderer can construct a Blob if needed
    const data = await fs.promises.readFile(filePath);
    return data.toString('base64');
}); */
