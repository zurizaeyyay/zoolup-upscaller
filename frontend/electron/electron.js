const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const dotenv = require('dotenv');
const { spawn, execSync } = require('child_process');
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
const openDevtools = process.env.OPEN_DEVTOOLS == 'True' && !isPacked;

let mainWindow;
let webContent;
let backendProcess = null;
const controller = new AbortController();

// Suppress security warnings only in development to avoid console noise
if (isDev) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

app.whenReady().then(async () => {
    if (!isDev || process.env.FROZEN_BACKEND == 'True') {
        const backend = startBackend();
        if (backend) {
            try {
                await backendReady({ port: 8000 });
                console.log('Backend is ready.');
            } catch (err) {
                console.error('Backend readiness check failed:', err.message);
            }
        }
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
        // Note: Be careful of creating window here as the backend might not be ready
    }
});

app.on('before-quit', async () => {
    await stopBackendIfRunning().catch((e) => console.error('Error in stopBackendIfRunning:', e));
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 800,
        minWidth: 700,
        minHeight: 500,
        title: 'Zoolup Image Upscaler',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    webContent = mainWindow.webContents;

    // Try to detect the Next.js dev server port, default to 3000
    const devPort = process.env.NEXT_DEV_PORT || '3000';
    let startUrl;

    if (isDev) {
        startUrl = isDev
            ? `http://localhost:${devPort}`
            : `${path.join(__dirname, '../out/index.html')}`;
    } else {
        // Production: Load from static export with protocol
        startUrl = new URL(`file://${path.join(__dirname, '../out/index.html')}`).href;
        console.log('Loading from:', startUrl);
    }

    console.log('Loading URL:', startUrl);
    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
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

// Trys to test backend connection to prevent window loading
// Will keep trying connection until timeout reached
async function backendReady({
    host = '127.0.0.1',
    port = 8000,
    timeoutMs = 20000,
    intervalMs = 250,
}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://${host}:${port}/`);
            const data = await response.json();
            if (data.message) {
                return true; // backend is ready
            }
        } catch (error) {}
        // Wait for time interval before retrying
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Backend not reachable at ${host}:${port} within ${timeoutMs}ms`);
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
        darwin: 'Apple ',
        linux: 'Linux',
    };
    const mappedPlatform = process_map[platform] || platform;
    const mappedArch = arch === 'arm64' ? 'arm' : arch;

    // Handle resource path resolving to node modules when not packaged
    const resourcePath = isPacked ? process.resourcesPath : path.join(__dirname, '../resources');

    // Asssumes either in dev and running backend manually or
    // Not in dev and binary packaged to resources/backends/<platform>/<arch>/
    const bin_path =
        isDev && process.env.FROZEN_BACKEND !== 'True'
            ? null
            : path.join(resourcePath, 'backends', mappedPlatform, mappedArch, binaryName);
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
            backendProcess = spawn(backendPath, [], { stdio: 'pipe', signal: controller.signal });
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

async function stopBackendIfRunning() {
    console.log('Stopping backend process...');

    // Always run taskkill first - most reliable way to ensure all related processes are killed
    if (process.platform === 'win32') {
        try {
            console.log('Running taskkill for backend.exe');
            execSync('taskkill /F /IM backend.exe /T 2>NUL', { timeout: 5000 });
            console.log('Taskkill completed');
        } catch (e) {
            console.log('Taskkill completed with error (likely no process found):', e.message);
        }
    } else if (process.platform === 'darwin') {
        // macOS
        try {
            // pkill is available on macOS by default
            execSync('pkill -f backend || true', { stdio: 'ignore' });
            console.log('macOS pkill cleanup attempted');
        } catch (e) {
            console.log('pkill completed with error (likely no process found):', e.message);
        }
    }

    // Also try to kill the specific sub porcess
    if (backendProcess && backendProcess.pid) {
        console.log('Stopping backend process with PID:', backendProcess.pid);

        try {
            const killPromise = new Promise((resolve, reject) => {
                treeKill(backendProcess.pid, 'SIGKILL', (err) => {
                    if (err) {
                        console.warn('tree-kill reported error:', err.message);
                        reject(err);
                    } else {
                        console.log('tree-kill reported success');
                        resolve();
                    }
                });

                // Added timeout to prevent hanging
                setTimeout(() => {
                    reject(new Error('tree-kill timeout'));
                }, 3000);
            });

            await killPromise.catch((e) => {
                console.log('tree-kill failed (this is expected):', e.message);
            });
        } catch (e) {
            console.error('Exception in kill process:', e);
            if (process.platform === 'darwin') {
                try {
                    execSync(`pkill -9 -f backend || true`);
                    console.log('macOS pkill fallback executed');
                } catch (e) {
                    console.error('macOS fallback kill failed:', e.message);
                }
            }
        }
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
