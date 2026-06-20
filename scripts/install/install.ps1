# Custom Fork of Kimi Code CLI (Windows Source Build Installer)
# Requires Node.js >= 24.15.0 and pnpm 10.33.0
# Run: irm https://your-repo-url/install.ps1 | iex

<#
.SYNOPSIS
  Kimi Code CLI (Custom Fork) source build installer for Windows (PowerShell 5.1+).

.DESCRIPTION
  This script clones the fork repository, installs dependencies with pnpm,
  builds the CLI from source, and adds it to the user PATH.
  Unlike the upstream installer, this does NOT download precompiled binaries
  from a CDN — it builds everything from source so the custom fork code is used.

.EXAMPLE
  irm https://your-repo-url/install.ps1 | iex

.NOTES
  Optional env:
    KIMI_INSTALL_DIR     Installation directory, default %USERPROFILE%\.kimi-code
    KIMI_NO_MODIFY_PATH  Skip PATH modification when set to a non-empty value
    KIMI_REPO_URL        Git repository URL, default https://github.com/MoonshotAI/kimi-code.git
#>

$ErrorActionPreference = 'Stop'

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$RepoUrl          = $env:KIMI_REPO_URL ?? 'https://github.com/MoonshotAI/kimi-code.git'
$InstallDir       = $env:KIMI_INSTALL_DIR ?? (Join-Path $env:USERPROFILE '.kimi-code')
$BuildDir         = Join-Path $InstallDir 'src'
$KimiCodeHomeEnv  = 'KIMI_CODE_HOME'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Die($msg)        { Write-Host "error: $msg" -ForegroundColor Red; exit 1 }

function Check-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Die "Node.js is required but not found. Install Node.js >= 24.15.0 first."
  }
  $version = (node -v).TrimStart('v')
  $minVersion = [version]'24.15.0'
  $actualVersion = [version]$version
  if ($actualVersion -lt $minVersion) {
    Die "Node.js version $version is too old. Need >= 24.15.0."
  }
  Write-Step "Node.js $version ok"
}

function Check-Pnpm {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Die "pnpm is required but not found. Install with: npm install -g pnpm"
  }
  $version = (pnpm -v).TrimStart('v')
  Write-Step "pnpm $version ok"
}

function Clone-OrUpdate {
  if (Test-Path (Join-Path $BuildDir '.git')) {
    Write-Step "Updating existing source at $BuildDir"
    Push-Location $BuildDir
    try {
      git pull --ff-only
      if ($LASTEXITCODE -ne 0) { Die "git pull failed" }
    } finally { Pop-Location }
  } else {
    Write-Step "Cloning repository to $BuildDir"
    New-Item -ItemType Directory -Path (Split-Path $BuildDir) -Force | Out-Null
    git clone $RepoUrl $BuildDir
    if ($LASTEXITCODE -ne 0) { Die "git clone failed" }
  }
}

function Build-Source {
  Write-Step "Installing dependencies..."
  Push-Location $BuildDir
  try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { Die "pnpm install failed" }

    Write-Step "Building packages..."
    pnpm build
    if ($LASTEXITCODE -ne 0) { Die "pnpm build failed" }
  } finally { Pop-Location }
}

function Install-Binary {
  $binDir = Join-Path $InstallDir 'bin'
  New-Item -ItemType Directory -Path $binDir -Force | Out-Null

  $exeSrc = Join-Path $BuildDir 'apps\kimi-code\dist\kimi.exe'
  $exeDest = Join-Path $binDir 'kimi.exe'

  if (-not (Test-Path $exeSrc)) {
    # Try JS entry if .exe not found (dev build)
    $jsSrc = Join-Path $BuildDir 'apps\kimi-code\dist\main.mjs'
    if (Test-Path $jsSrc) {
      Write-Step "Using JS entry point (no native binary built): $jsSrc"
      # Create a shim batch file
      $shim = Join-Path $binDir 'kimi.cmd'
      "@echo off`nnode `"$jsSrc`" %*" | Set-Content $shim -Encoding UTF8
      Write-Step "Created shim: $shim"
      return
    }
    Die "Build artifact not found. Expected: $exeSrc or $jsSrc"
  }

  Copy-Item $exeSrc $exeDest -Force
  Write-Step "Installed $exeDest"
}

function Add-ToUserPath {
  param([string]$dir)
  if ($env:KIMI_NO_MODIFY_PATH) {
    Write-Step "Skipping PATH modification (KIMI_NO_MODIFY_PATH set)"
    return
  }
  $current = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($current -and ($current.Split(';') -contains $dir)) {
    Write-Step "$dir already in user PATH"
    return
  }
  $newPath = if ($current) { "$dir;$current" } else { $dir }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
  Write-Step "Added $dir to user PATH (open a new terminal for it to take effect)"
}

function Set-EnvVar {
  param([string]$name, [string]$value)
  $current = [Environment]::GetEnvironmentVariable($name, 'User')
  if ($current -eq $value) { return }
  [Environment]::SetEnvironmentVariable($name, $value, 'User')
  Write-Step "Set ${name}=${value}"
}

function Print-Done {
  Write-Step "Installation complete!"
  Write-Host ""
  Write-Host "  Run in a new terminal: kimi --version"
  Write-Host ""
  Write-Host "  To update this custom build:"
  Write-Host "    cd $BuildDir"
  Write-Host "    git pull"
  Write-Host "    pnpm build"
  Write-Host ""
  Write-Host "  This is a custom fork. Auto-update is disabled."
}

# ---------- main ----------

try {
  Write-Step "Kimi Code CLI (Custom Fork) source installer"
  Check-Node
  Check-Pnpm
  Clone-OrUpdate
  Build-Source
  Install-Binary

  $binDir = Join-Path $InstallDir 'bin'
  Add-ToUserPath $binDir
  Set-EnvVar $KimiCodeHomeEnv $InstallDir

  Print-Done
} catch {
  Write-Host ""
  Write-Host "ERROR: $_" -ForegroundColor Red
  Write-Host ""
  Write-Host "Installation failed." -ForegroundColor Yellow
  Read-Host "Press Enter to exit"
  exit 1
}
