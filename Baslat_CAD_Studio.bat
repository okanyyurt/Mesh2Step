@echo off
chcp 65001 > nul
title Mesh2Step 3D Studio

echo ===================================================================
echo               MESH2STEP 3D STUDIO BASLATILIYOR
echo       Mesh (STL / 3MF) -^> STEP B-Rep Kati Model Donusturucu
echo ===================================================================
echo.

cd /d "%~dp0APP"

REM Python calistirma kontrolu
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi! Lutfen Python'in PATH'e eklendiginden emin olun.
    pause
    exit /b 1
)

echo [OK] 3D CAD Studio Arayuzu baslatiliyor...
python app.py

echo.
echo ===================================================================
echo [BILGI] Mesh2Step 3D Studio oturumu tamamlandi.
echo ===================================================================
pause

