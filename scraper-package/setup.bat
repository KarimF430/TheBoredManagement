@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  Scraper Codebase — Quick Setup Script
REM  Run this after copying files into your project
REM ═══════════════════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Scraper Codebase Setup                        ║
echo  ╚══════════════════════════════════════════════════╝
echo.

REM Step 1: Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    exit /b 1
)
echo       OK

REM Step 2: Check Python
echo [2/5] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Python not found. Instagram scraper won't work without it.
    echo          Install from https://python.org
) else (
    echo       OK
)

REM Step 3: Install npm dependencies
echo [3/5] Installing npm dependencies...
call npm install @supabase/supabase-js
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    exit /b 1
)
echo       OK

REM Step 4: Install Python dependencies
echo [4/5] Installing Python dependencies...
pip install instaloader requests >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: pip install failed. Instagram scraper may not work.
) else (
    echo       OK
)

REM Step 5: Create .env
echo [5/5] Setting up environment...
if not exist .env (
    copy .env.example .env >nul
    echo       Created .env from .env.example
    echo       *** EDIT .env WITH YOUR CREDENTIALS ***
) else (
    echo       .env already exists, skipping
)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Setup Complete!                               ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║                                                 ║
echo  ║   1. Edit .env with your Supabase credentials   ║
echo  ║   2. Add YOUTUBE_API_KEY for YouTube scraper    ║
echo  ║   3. Run: npm run dev                           ║
echo  ║   4. Open: http://localhost:3000/scraper        ║
echo  ║                                                 ║
echo  ╚══════════════════════════════════════════════════╝
echo.
