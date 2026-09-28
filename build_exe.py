# -*- coding: utf-8 -*-
"""
Mesh2Step 3D Studio - Standalone Executable (.exe) Packager
Uses PyInstaller to bundle the Python backend and HTML/JS/CSS assets into a standalone desktop application.
Generates Mesh2Step_3D_Studio_v3.21_win64_portable.zip in the project root directory.
"""

import os
import sys
import json
import zipfile
import subprocess
import shutil

def get_version_str(base_dir):
    ver_path = os.path.join(base_dir, "version.json")
    if os.path.exists(ver_path):
        try:
            with open(ver_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("version", "3.21")
        except Exception:
            pass
    return "3.21"

def build():
    print("=" * 65)
    print("  Mesh2Step 3D Studio - Standalone Portable Build Automation")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == "dist_repo" else base_dir
    version_str = get_version_str(base_dir)

    ui_dir = os.path.join(base_dir, "ui")
    engine_dir = os.path.join(base_dir, "engine")
    version_json = os.path.join(base_dir, "version.json")
    app_py = os.path.join(base_dir, "app.py")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=Mesh2Step_3D_Studio",
        "--onedir",
        "--windowed",
        "--clean",
        "--noconfirm",
        f"--add-data={ui_dir}{os.pathsep}ui",
        f"--add-data={engine_dir}{os.pathsep}engine",
        f"--add-data={version_json}{os.pathsep}.",
        "--hidden-import=webview",
        "--hidden-import=trimesh",
        "--hidden-import=numpy",
        "--hidden-import=scipy",
        app_py
    ]

    print(f"[*] Running PyInstaller for v{version_str}...")
    result = subprocess.run(cmd, cwd=base_dir)
    if result.returncode != 0:
        print(f"\n❌ Build Failed with exit code {result.returncode}")
        return False

    built_app_dir = os.path.join(base_dir, "dist", "Mesh2Step_3D_Studio")
    if not os.path.exists(built_app_dir):
        print(f"\n❌ Built directory not found at: {built_app_dir}")
        return False

    # Package as Portable ZIP in project root
    zip_filename = f"Mesh2Step_3D_Studio_v{version_str}_win64_portable.zip"
    zip_dest = os.path.join(project_root, zip_filename)
    print(f"\n[*] Creating Portable ZIP archive: {zip_dest}")

    with zipfile.ZipFile(zip_dest, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(built_app_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, os.path.dirname(built_app_dir))
                zipf.write(file_path, arcname)

    size_mb = round(os.path.getsize(zip_dest) / (1024 * 1024), 2)
    print("=" * 65)
    print(f"  [OK] BASARILI! Portable ZIP paketi hazirlandi:")
    print(f"  Konum: {zip_dest}")
    print(f"  Dosya: {zip_filename} ({size_mb} MB)")
    print("=" * 65)
    return True

if __name__ == "__main__":
    build()
