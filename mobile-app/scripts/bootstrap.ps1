param(
  [string]$ApiUrl = "http://localhost:3000/api"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Resolve-Path (Join-Path $scriptDir "..")

Write-Host "== HumanoidMaker Mobile Bootstrap ==" -ForegroundColor Cyan
Write-Host "App directory: $appDir"

Set-Location $appDir

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found. Install Node.js 18+ first."
}

$envFile = Join-Path $appDir ".env"
$envExample = Join-Path $appDir ".env.example"

if (-not (Test-Path $envExample)) {
  throw ".env.example missing in mobile-app directory."
}

if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile -Force
}

$lines = Get-Content $envFile
$updated = $false
$nextLines = @()

foreach ($line in $lines) {
  if ($line -match '^EXPO_PUBLIC_API_URL=') {
    $nextLines += "EXPO_PUBLIC_API_URL=$ApiUrl"
    $updated = $true
  } else {
    $nextLines += $line
  }
}

if (-not $updated) {
  $nextLines += "EXPO_PUBLIC_API_URL=$ApiUrl"
}

Set-Content -Path $envFile -Value $nextLines

Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Bootstrap completed." -ForegroundColor Green
Write-Host "Next commands:" -ForegroundColor Cyan
Write-Host "  npm run start"
Write-Host "  npm run android"
Write-Host "  npm run ios"
Write-Host "  npm run web"
