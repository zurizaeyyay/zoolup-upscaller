Place platform-specific PyInstaller outputs here before packaging.
- Windows: resources/backends/win32/x64/backend.exe
- macOS Intel: resources/backends/darwin/x64/backend
- macOS Apple Silicon: resources/backends/darwin/arm64/backend
- Linux: resources/backends/linux/x64/backend

The Electron main process resolves the path at runtime.
