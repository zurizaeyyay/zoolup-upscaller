# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
from PyInstaller.building.build_main import Analysis, PYZ, EXE
from PyInstaller.utils.hooks import collect_submodules
import sys

# Paths
# Resolve paths relative to the executing spec location so builds are deterministic
SPEC_DIR = Path(sys.argv[0]).resolve().parent        # backend-wrap/
ROOT = SPEC_DIR.parent                                # project root (Upscaller/)
# backend module now lives inside backend-wrap/backend
BACKEND_DIR = SPEC_DIR / 'backend'

# Make sure the spec directory (which contains the 'backend' package) is importable
if str(SPEC_DIR) not in sys.path:
    sys.path.insert(0, str(SPEC_DIR))

# Include model weights and Real-ESRGAN code (source -> destination)
datas = [
    (str(BACKEND_DIR / 'weights'), 'weights'),
    (str(BACKEND_DIR / 'Real-ESRGAN'), 'Real-ESRGAN')
]
binaries = []

# Hidden imports for all dependencies (from requirements.txt and your CLI example)
hiddenimports = [
    'backend',  # ensure top-level package is present
    'uvicorn', 'fastapi', 'websockets', 'torch', 'torchvision', 'RealESRGAN',
    'python_multipart', 'cv2', 'PIL', 'tqdm'
]
# Collect backend submodules now that SPEC_DIR is on sys.path
hiddenimports += collect_submodules('huggingface_hub')
# Ensure the entire backend package is discoverable when using runpy
hiddenimports += collect_submodules('backend')

# Use the wrapper script located next to this spec so runpy.run_module finds backend as a package
ENTRY_WRAPPER = SPEC_DIR / 'backend_entry.py'

a = Analysis(
    [str(ENTRY_WRAPPER)],
    pathex=[str(SPEC_DIR)],            # make the backend-wrap folder importable so 'backend' package can be found
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='upscaler-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)