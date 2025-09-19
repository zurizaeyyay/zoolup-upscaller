Place platform-specific PyInstaller outputs here before packaging.
- Windows x64: resources/backends/win/x64
- Windows Arm: resources/backends/win/arm
- macOS Intel: resources/backends/apple/x64
- macOS Apple Silicon: resources/backends/apple/arm
- Linux x64: resources/backends/linux

The Electron main process resolves the path at runtime.
