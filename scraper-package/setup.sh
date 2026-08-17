#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Scraper Codebase — Quick Setup Script
#  Run this after copying files into your project
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Scraper Codebase Setup                        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Step 1: Check Node.js
echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "      OK"

# Step 2: Check Python
echo "[2/5] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "WARNING: Python3 not found. Instagram scraper won't work."
else
    echo "      OK"
fi

# Step 3: Install npm dependencies
echo "[3/5] Installing npm dependencies..."
npm install @supabase/supabase-js
if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed"
    exit 1
fi
echo "      OK"

# Step 4: Install Python dependencies
echo "[4/5] Installing Python dependencies..."
pip3 install instaloader requests 2>/dev/null
if [ $? -ne 0 ]; then
    echo "WARNING: pip install failed. Instagram scraper may not work."
else
    echo "      OK"
fi

# Step 5: Create .env
echo "[5/5] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "      Created .env from .env.example"
    echo "      *** EDIT .env WITH YOUR CREDENTIALS ***"
else
    echo "      .env already exists, skipping"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Setup Complete!                               ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                 ║"
echo "║   1. Edit .env with your Supabase credentials   ║"
echo "║   2. Add YOUTUBE_API_KEY for YouTube scraper    ║"
echo "║   3. Run: npm run dev                           ║"
echo "║   4. Open: http://localhost:3000/scraper        ║"
echo "║                                                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
