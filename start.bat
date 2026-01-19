@echo off
title TakeVid Backend Server
echo Starting TakeVid Server...
echo.

:: Navigate to the script's directory
cd /d "%~dp0"

:: Check if python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python not found on PATH. Trying specific path...
    "C:\Users\hp\AppData\Local\Programs\Python\Python311\python.exe" app.py
) else (
    python app.py
)

if %errorlevel% neq 0 (
    echo.
    echo Server crashed or closed.
    pause
)
