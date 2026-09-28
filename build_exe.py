# -*- coding: utf-8 -*-
"""
Mesh2Step 3D Studio - Standalone Executable (.exe) Packager
Uses PyInstaller to bundle the Python backend and HTML/JS/CSS assets into a lightweight standalone desktop application.
Excludes unnecessary heavy packages (PyTorch, OpenCV, Pandas, Transformers, etc.) to minimize distribution size.
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
    print("  Mesh2Step 3D Studio - Optimized Standalone Build Automation")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == "dist_repo" else base_dir
    version_str = get_version_str(base_dir)

    ui_dir = os.path.join(base_dir, "ui")
    engine_dir = os.path.join(base_dir, "engine")
    version_json = os.path.join(base_dir, "version.json")
    app_py = os.path.join(base_dir, "app.py")

    # Clean old build/dist directories
    for folder in ["build", "dist"]:
        target_f = os.path.join(base_dir, folder)
        if os.path.exists(target_f):
            print(f"[*] Temizleniyor: {target_f}")
            shutil.rmtree(target_f, ignore_errors=True)

    excludes = [
        "torch", "torchvision", "torchaudio",
        "cv2",
        "transformers", "tokenizers", "tiktoken", "huggingface_hub", "safetensors", "accelerate", "hf_xet",
        "pandas", "pyarrow",
        "docling", "docling_core", "docling_parse", "docling_ibm_models", "docling_slim",
        "lxml",
        "matplotlib", "plotly", "altair", "streamlit",
        "flask", "starlette", "uvicorn", "fastapi",
        "pydantic", "pydantic_core", "pydantic_settings",
        "cryptography",
        "tkinter", "customtkinter", "tcl", "tk",
        "openpyxl", "xlsxwriter", "xlrd", "docx", "pptx",
        "Faker", "sympy", "pytest", "IPython", "jupyter", "tornado",
        "shapely", "rtree", "pyclipper", "rapidocr", "pdf2image", "pypdfium2", "fitz", "pymupdf"
    ]

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
        "--hidden-import=scipy"
    ]

    for exc in excludes:
        cmd.append(f"--exclude-module={exc}")

    cmd.append(app_py)

    print(f"[*] Running PyInstaller for v{version_str} with {len(excludes)} excluded heavy modules...")
    result = subprocess.run(cmd, cwd=base_dir)
    if result.returncode != 0:
        print(f"\n[HATA] Build basarisiz oldu. Exit code: {result.returncode}")
        return False

    built_app_dir = os.path.join(base_dir, "dist", "Mesh2Step_3D_Studio")
    if not os.path.exists(built_app_dir):
        print(f"\n[HATA] Cikti klasoru bulunamadi: {built_app_dir}")
        return False

    # Package as Portable ZIP in project root
    zip_filename = f"Mesh2Step_3D_Studio_v{version_str}_win64_portable.zip"
    zip_dest = os.path.join(project_root, zip_filename)
    if os.path.exists(zip_dest):
        try:
            os.remove(zip_dest)
        except Exception:
            pass

    print(f"\n[*] Creating Optimized Portable ZIP archive: {zip_dest}")

    with zipfile.ZipFile(zip_dest, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(built_app_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, os.path.dirname(built_app_dir))
                zipf.write(file_path, arcname)

    size_mb = round(os.path.getsize(zip_dest) / (1024 * 1024), 2)
    print("=" * 65)
    print(f"  [OK] BASARILI! Optimize edilmis Portable ZIP hazirlandi:")
    print(f"  Konum: {zip_dest}")
    print(f"  Dosya: {zip_filename} ({size_mb} MB)")
    print("=" * 65)
    return True

if __name__ == "__main__":
    build()
