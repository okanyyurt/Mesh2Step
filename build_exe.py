# -*- coding: utf-8 -*-
"""
Mesh2Step 3D Studio - Standalone Executable (.exe) Packager
Uses PyInstaller to bundle the Python backend and HTML/JS/CSS assets into a single desktop application.
"""

import os
import sys
import subprocess
import shutil

def build():
    print("=" * 60)
    print("  Mesh2Step 3D Studio - PyInstaller Build Automation")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    ui_dir = os.path.join(base_dir, "ui")
    engine_dir = os.path.join(base_dir, "engine")
    app_py = os.path.join(base_dir, "app.py")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=Mesh2Step_3D_Studio",
        "--onedir",  # or --onefile
        "--windowed", # No console window
        f"--add-data={ui_dir}{os.pathsep}ui",
        f"--add-data={engine_dir}{os.pathsep}engine",
        "--hidden-import=webview",
        "--hidden-import=trimesh",
        "--hidden-import=numpy",
        "--hidden-import=scipy",
        "--hidden-import=OCP",
        app_py
    ]

    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=base_dir)
    if result.returncode == 0:
        print("\n✅ Build Successful! Executable is located in dist/Mesh2Step_3D_Studio/")
    else:
        print(f"\n❌ Build Failed with exit code {result.returncode}")

if __name__ == "__main__":
    build()
