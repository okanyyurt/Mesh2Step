@echo off
chcp 65001 > nul
title Mesh2Step 3D Studio - EXE Paketleniyor
echo ========================================================
echo   Mesh2Step 3D Studio - Standalone EXE Derleme
echo ========================================================
echo.
echo Gerekli paketler kontrol ediliyor...
python -m pip install pyinstaller
echo.
echo Derleme baslatiliyor...
python build_exe.py
echo.
pause
