# CardioSense AI — Windows Development Startup Script
# Run from project root: .\start-dev.ps1
# ─────────────────────────────────────────────────────────────────────────────

param(
    [string]$GeminiKey = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        CardioSense AI — Dev Server  🫀          ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check prerequisites ───────────────────────────────────────────────────────
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: Python not found. Install Python 3.11+." -ForegroundColor Red; exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ERROR: Node.js not found. Install Node.js 20+." -ForegroundColor Red; exit 1
}
$pyver = python --version 2>&1
$nodever = node --version 2>&1
Write-Host "  ✓ $pyver" -ForegroundColor Green
Write-Host "  ✓ Node $nodever" -ForegroundColor Green

# ── Backend venv ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Setting up backend..." -ForegroundColor Yellow
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvDir    = Join-Path $BackendDir ".venv"
$PipExe     = Join-Path $VenvDir "Scripts\python.exe"

if (-not (Test-Path $VenvDir)) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Gray
    python -m venv $VenvDir
}

# Install PyTorch CPU if not present
$TorchCheck = & $PipExe -c "import torch; print(torch.__version__)" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Installing PyTorch CPU (Python 3.13 compatible)..." -ForegroundColor Gray
    & $PipExe -m pip install "torch==2.6.0+cpu" --index-url https://download.pytorch.org/whl/cpu -q
} else {
    Write-Host "  ✓ PyTorch $TorchCheck already installed" -ForegroundColor Green
}

Write-Host "  Installing backend dependencies..." -ForegroundColor Gray
& $PipExe -m pip install -r (Join-Path $BackendDir "requirements.txt") -q
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green

# ── .env setup ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Configuring environment..." -ForegroundColor Yellow
$BackendEnv = Join-Path $BackendDir ".env"

if (-not (Test-Path $BackendEnv)) {
    $SecretKey = & $PipExe -c "import secrets; print(secrets.token_hex(32))"
    $envContent = Get-Content (Join-Path $BackendDir ".env.example") -Raw
    $envContent = $envContent -replace 'your-super-secret-key-change-in-production-minimum-32-chars', $SecretKey
    if ($GeminiKey) {
        $envContent = $envContent -replace 'your-gemini-api-key-here', $GeminiKey
        Write-Host "  ✓ Gemini API key applied" -ForegroundColor Green
    }
    Set-Content -Path $BackendEnv -Value $envContent
    Write-Host "  ✓ Created backend/.env" -ForegroundColor Green
} else {
    # Update Gemini key if provided
    if ($GeminiKey) {
        (Get-Content $BackendEnv) -replace 'GEMINI_API_KEY=.*', "GEMINI_API_KEY=$GeminiKey" |
            Set-Content $BackendEnv
        Write-Host "  ✓ Updated GEMINI_API_KEY in backend/.env" -ForegroundColor Green
    } else {
        Write-Host "  ✓ backend/.env exists" -ForegroundColor Green
        $currentKey = (Get-Content $BackendEnv | Select-String "GEMINI_API_KEY=(.+)").Matches.Groups[1].Value
        if (-not $currentKey -or $currentKey -eq "your-gemini-api-key-here") {
            Write-Host ""
            Write-Host "  ⚠️  GEMINI_API_KEY is not set!" -ForegroundColor Yellow
            Write-Host "  Dr. CardioBot will use keyword fallback mode." -ForegroundColor Yellow
            Write-Host "  To enable full AI: edit backend\.env and set GEMINI_API_KEY" -ForegroundColor Gray
            Write-Host "  Or re-run: .\start-dev.ps1 -GeminiKey 'your-key-here'" -ForegroundColor Gray
            Write-Host ""
        }
    }
}

# Frontend .env
$FrontendEnv = Join-Path $ProjectRoot "frontend\.env"
if (-not (Test-Path $FrontendEnv)) {
    "VITE_API_URL=http://localhost:8000" | Set-Content $FrontendEnv
    Write-Host "  ✓ Created frontend/.env" -ForegroundColor Green
}

# ── Generate ML model weights ─────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Generating ECG autoencoder model..." -ForegroundColor Yellow
$ModelPath = Join-Path $BackendDir "app\ml\ecg_autoencoder.pt"
if (-not (Test-Path $ModelPath)) {
    Push-Location $BackendDir
    & $PipExe -m app.ml.train_mock
    Pop-Location
    Write-Host "  ✓ Model weights saved" -ForegroundColor Green
} else {
    Write-Host "  ✓ Model weights exist" -ForegroundColor Green
}

# ── Frontend ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Setting up frontend..." -ForegroundColor Yellow
$FrontendDir = Join-Path $ProjectRoot "frontend"
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "  Installing npm packages..." -ForegroundColor Gray
    Push-Location $FrontendDir; npm install --silent; Pop-Location
}
Write-Host "  ✓ Frontend ready" -ForegroundColor Green

# ── Launch! ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Launching CardioSense AI..." -ForegroundColor Cyan
Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Backend API:   http://localhost:8000" -ForegroundColor White
Write-Host "    API Docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "    Frontend:      http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "    Press Ctrl+C in each terminal to stop servers." -ForegroundColor Gray
Write-Host ""

$UvicornExe = Join-Path $VenvDir "Scripts\uvicorn.exe"

# Launch backend
$backendCmd = "Write-Host '  ⚡ Backend: http://localhost:8000' -ForegroundColor Cyan; Set-Location '$BackendDir'; & '$UvicornExe' app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Launch frontend
$frontendCmd = "Write-Host '  ⚡ Frontend: http://localhost:5173' -ForegroundColor Cyan; Set-Location '$FrontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "  ✅ Servers launching in new windows!" -ForegroundColor Green
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
