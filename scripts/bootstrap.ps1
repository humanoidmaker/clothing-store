[CmdletBinding()]
param(
  [string]$RepoUrl = "https://github.com/humanoidmaker/clothing-store.git",
  [string]$TargetDir = "humanoidmaker_ecommerce",
  [string]$Branch = "",
  [switch]$Seed,
  [switch]$SkipSeed,
  [switch]$SkipBuild,
  [switch]$InstallMongoDb
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host ("[{0}] >>> {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message) -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Message)
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

function Fail {
  param([string]$Message)
  throw ("[{0}] ERROR: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

function Invoke-External {
  param(
    [string]$Description,
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    Fail ("{0} failed with exit code {1}" -f $Description, $LASTEXITCODE)
  }
}

function Command-Exists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Ensure-Git {
  if (Command-Exists "git") {
    Write-Info ("Git found: {0}" -f (& git --version))
    return
  }

  Write-Step "Git not found. Installing Git"
  if (Command-Exists "winget") {
    Invoke-External -Description "winget Git installation" -Command {
      winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    }
  } elseif (Command-Exists "choco") {
    Invoke-External -Description "choco Git installation" -Command { choco install git -y }
  } else {
    Fail "Git is required. Install Git manually (or install winget/choco) and re-run."
  }

  Refresh-Path
  if (-not (Command-Exists "git")) {
    Fail "Git installation did not complete successfully."
  }
  Write-Info ("Git installed: {0}" -f (& git --version))
}

function Ensure-Node {
  $hasNode = Command-Exists "node"
  $hasNpm = Command-Exists "npm"
  if ($hasNode -and $hasNpm) {
    Write-Info ("Node found: {0}, npm: {1}" -f (& node --version), (& npm --version))
  } else {
    Write-Step "Node.js not found. Installing Node.js LTS"
    if (Command-Exists "winget") {
      Invoke-External -Description "winget Node.js installation" -Command {
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
      }
    } elseif (Command-Exists "choco") {
      Invoke-External -Description "choco Node.js installation" -Command { choco install nodejs-lts -y }
    } else {
      Fail "Node.js 18+ is required. Install Node.js manually (or install winget/choco) and re-run."
    }

    Refresh-Path
    if (-not (Command-Exists "node") -or -not (Command-Exists "npm")) {
      Fail "Node.js installation did not complete successfully."
    }
  }

  $nodeVersion = (& node -p "process.versions.node").Trim()
  $major = [int]($nodeVersion.Split('.')[0])
  if ($major -lt 18) {
    Fail ("Node.js 18+ is required. Current version: {0}" -f (& node --version))
  }
  Write-Info ("Node ready: {0}, npm: {1}" -f (& node --version), (& npm --version))
}

function Clone-OrUpdateRepo {
  $gitDir = Join-Path $TargetDir ".git"
  if (Test-Path $gitDir) {
    Write-Step ("Updating existing repository in {0}" -f $TargetDir)
    Push-Location $TargetDir
    try {
      Invoke-External -Description "git fetch" -Command { git fetch --all --prune }
      if ($Branch) {
        & git checkout $Branch
        if ($LASTEXITCODE -ne 0) {
          Invoke-External -Description "git checkout branch from origin" -Command { git checkout -B $Branch "origin/$Branch" }
        }
        Invoke-External -Description "git pull" -Command { git pull --ff-only origin $Branch }
      } else {
        Invoke-External -Description "git pull" -Command { git pull --ff-only }
      }
    } finally {
      Pop-Location
    }
    return
  }

  if (Test-Path $TargetDir) {
    Fail ("Target path '{0}' already exists and is not a git repository." -f $TargetDir)
  }

  Write-Step "Cloning repository"
  if ($Branch) {
    Invoke-External -Description "git clone" -Command { git clone --depth 1 --branch $Branch $RepoUrl $TargetDir }
  } else {
    Invoke-External -Description "git clone" -Command { git clone --depth 1 $RepoUrl $TargetDir }
  }
}

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )
  if (-not (Test-Path $FilePath)) {
    return ""
  }

  $regex = "^{0}=(.*)$" -f [regex]::Escape($Key)
  foreach ($line in Get-Content $FilePath) {
    $match = [regex]::Match($line, $regex)
    if ($match.Success) {
      return $match.Groups[1].Value.Trim()
    }
  }
  return ""
}

function Set-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  $lines = @()
  if (Test-Path $FilePath) {
    $lines = @(Get-Content $FilePath)
  }

  $updated = $false
  $pattern = "^{0}=" -f [regex]::Escape($Key)

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) {
      $lines[$i] = "$Key=$Value"
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += "$Key=$Value"
  }

  Set-Content -Path $FilePath -Value $lines
}

function New-HexSecret {
  param([int]$Bytes = 32)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $rng.Dispose()
  return (-join ($buffer | ForEach-Object { $_.ToString("x2") }))
}

function Prepare-EnvFile {
  Write-Step "Preparing environment file"
  $envFile = ".env"
  if (-not (Test-Path $envFile)) {
    if (Test-Path ".env.example") {
      Copy-Item ".env.example" $envFile
      Write-Info "Created .env from .env.example"
    } else {
      @(
        "PORT=3000",
        "MONGO_URI=mongodb://127.0.0.1:27017/clothing_store_ecommerce",
        "JWT_SECRET=",
        "SETTINGS_ENCRYPTION_SECRET=",
        "NEXT_PUBLIC_API_URL=/api"
      ) | Set-Content $envFile
      Write-Info "Created minimal .env file"
    }
  } else {
    Write-Info ".env already exists. Keeping existing values where possible."
  }

  $jwtSecret = Get-EnvValue -FilePath $envFile -Key "JWT_SECRET"
  if ([string]::IsNullOrWhiteSpace($jwtSecret) -or $jwtSecret.StartsWith("replace_with_")) {
    Set-EnvValue -FilePath $envFile -Key "JWT_SECRET" -Value (New-HexSecret)
    Write-Info "Generated JWT_SECRET"
  }

  $settingsSecret = Get-EnvValue -FilePath $envFile -Key "SETTINGS_ENCRYPTION_SECRET"
  if ([string]::IsNullOrWhiteSpace($settingsSecret) -or $settingsSecret.StartsWith("replace_with_")) {
    Set-EnvValue -FilePath $envFile -Key "SETTINGS_ENCRYPTION_SECRET" -Value (New-HexSecret)
    Write-Info "Generated SETTINGS_ENCRYPTION_SECRET"
  }

  $port = Get-EnvValue -FilePath $envFile -Key "PORT"
  if ([string]::IsNullOrWhiteSpace($port)) {
    $port = "3000"
    Set-EnvValue -FilePath $envFile -Key "PORT" -Value $port
  }

  $clientUrl = Get-EnvValue -FilePath $envFile -Key "CLIENT_URL"
  if ([string]::IsNullOrWhiteSpace($clientUrl)) {
    Set-EnvValue -FilePath $envFile -Key "CLIENT_URL" -Value ("http://localhost:{0}" -f $port)
    Write-Info ("Set CLIENT_URL=http://localhost:{0}" -f $port)
  }
}

function Test-LocalMongoUri {
  param([string]$MongoUri)
  if ([string]::IsNullOrWhiteSpace($MongoUri)) {
    return $true
  }
  return $MongoUri -match '^mongodb(\+srv)?://([^/@]+@)?(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/,]|$)'
}

function Prompt-InstallMongoDb {
  param([bool]$Default = $false)

  $suffix = if ($Default) { "[Y/n]" } else { "[y/N]" }
  $prompt = "Local MONGO_URI detected but MongoDB is not reachable on 127.0.0.1:27017. Install/start it now? $suffix"

  while ($true) {
    try {
      $answer = Read-Host $prompt
    } catch {
      Write-Warning "Interactive prompt unavailable. Re-run with -InstallMongoDb to install/start MongoDB."
      return $false
    }

    if ([string]::IsNullOrWhiteSpace($answer)) {
      return $Default
    }

    switch ($answer.Trim().ToLowerInvariant()) {
      "y" { return $true }
      "yes" { return $true }
      "n" { return $false }
      "no" { return $false }
      default { Write-Warning "Please answer y or n." }
    }
  }
}

function Test-TcpPort {
  param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 27017,
    [int]$TimeoutMs = 1500
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($Host, $Port, $null, $null)
    $completed = $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
    if (-not $completed) {
      $client.Close()
      return $false
    }
    [void]$client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-ForMongoPort {
  for ($i = 0; $i -lt 25; $i++) {
    if (Test-TcpPort -Host "127.0.0.1" -Port 27017) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Get-MongodPath {
  $command = Get-Command mongod -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $defaultRoot = "C:\Program Files\MongoDB\Server"
  if (-not (Test-Path $defaultRoot)) {
    return ""
  }

  $candidate = Get-ChildItem -Path $defaultRoot -Recurse -Filter "mongod.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($candidate) {
    return $candidate.FullName
  }

  return ""
}

function Ensure-MongoServiceRunning {
  $mongoService = Get-Service -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'mongo' -or $_.DisplayName -match 'mongo' } |
    Sort-Object Name |
    Select-Object -First 1

  if (-not $mongoService) {
    return $false
  }

  Write-Info ("Using MongoDB service: {0}" -f $mongoService.Name)
  Set-Service -Name $mongoService.Name -StartupType Automatic -ErrorAction SilentlyContinue
  if ($mongoService.Status -ne "Running") {
    Start-Service -Name $mongoService.Name -ErrorAction SilentlyContinue
  }

  return (Wait-ForMongoPort)
}

function Install-MongoDbPackage {
  $installed = $false

  if (Command-Exists "winget") {
    foreach ($pkg in @("MongoDB.Server", "MongoDB.MongoDBServer")) {
      & winget install --id $pkg -e --source winget --accept-source-agreements --accept-package-agreements
      if ($LASTEXITCODE -eq 0) {
        $installed = $true
        break
      }
    }
  }

  if (-not $installed -and (Command-Exists "choco")) {
    foreach ($pkg in @("mongodb", "mongodb.install")) {
      & choco install $pkg -y
      if ($LASTEXITCODE -eq 0) {
        $installed = $true
        break
      }
    }
  }

  if (-not $installed) {
    Fail "Unable to install MongoDB automatically. Install MongoDB manually and re-run."
  }

  Refresh-Path
}

function Start-MongodStandalone {
  param([string]$MongodPath)

  $dbDir = "C:\data\db"
  $logDir = "C:\data\log"
  New-Item -Path $dbDir -ItemType Directory -Force | Out-Null
  New-Item -Path $logDir -ItemType Directory -Force | Out-Null
  $logPath = Join-Path $logDir "mongod.log"

  Write-Info "Starting mongod process in background mode."
  Start-Process -FilePath $MongodPath -ArgumentList @("--dbpath", $dbDir, "--bind_ip", "127.0.0.1", "--port", "27017", "--logpath", $logPath, "--logappend") -WindowStyle Hidden
}

function Ensure-MongoDb {
  Write-Step "Ensuring MongoDB is installed and running"

  $mongodPath = Get-MongodPath
  if ([string]::IsNullOrWhiteSpace($mongodPath)) {
    Install-MongoDbPackage
    $mongodPath = Get-MongodPath
  }

  if ([string]::IsNullOrWhiteSpace($mongodPath)) {
    Fail "MongoDB installation did not expose mongod binary in PATH or default location."
  }

  Write-Info ("MongoDB binary found: {0}" -f $mongodPath)

  if (Test-TcpPort -Host "127.0.0.1" -Port 27017) {
    Write-Info "MongoDB is already reachable on 127.0.0.1:27017"
    return
  }

  if (-not (Ensure-MongoServiceRunning)) {
    Start-MongodStandalone -MongodPath $mongodPath
  }

  if (-not (Wait-ForMongoPort)) {
    Fail "MongoDB installation completed but service/process is not reachable on 127.0.0.1:27017"
  }

  Write-Info "MongoDB is reachable on 127.0.0.1:27017"
}

function Invoke-NpmInstallWithFallback {
  if (Test-Path "package-lock.json") {
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      & npm install --no-audit --no-fund
      if ($LASTEXITCODE -ne 0) {
        Fail "npm install failed."
      }
    }
  } else {
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      Fail "npm install failed."
    }
  }
}

function Install-Dependencies {
  Write-Step "Installing root dependencies"
  Invoke-NpmInstallWithFallback

  if (Test-Path "client/package.json") {
    Write-Step "Installing client dependencies"
    Push-Location "client"
    try {
      Invoke-NpmInstallWithFallback
    } finally {
      Pop-Location
    }
  }

  if (Test-Path "server/package.json") {
    Write-Step "Installing server dependencies"
    Push-Location "server"
    try {
      Invoke-NpmInstallWithFallback
    } finally {
      Pop-Location
    }
  }
}

function Build-App {
  if ($SkipBuild.IsPresent) {
    Write-Info "Skipping build (--SkipBuild)"
    return
  }
  Write-Step "Building application"
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    Fail "Build failed."
  }
}

function Seed-AppData {
  if ($SkipSeed.IsPresent) {
    Write-Info "Skipping seed (--SkipSeed)"
    return
  }
  Write-Step "Seeding sample data"
  & npm run seed
  if ($LASTEXITCODE -ne 0) {
    Fail "Seed command failed."
  }
}

try {
  Write-Step "Starting bootstrap setup"
  Write-Info ("Repository: {0}" -f $RepoUrl)
  Write-Info ("Target dir: {0}" -f $TargetDir)
  if ($Seed.IsPresent -and $SkipSeed.IsPresent) {
    Fail "-Seed and -SkipSeed cannot be used together."
  }
  if ($Branch) {
    Write-Info ("Branch: {0}" -f $Branch)
  }

  Ensure-Git
  Ensure-Node
  Clone-OrUpdateRepo

  Push-Location $TargetDir
  try {
    Prepare-EnvFile
    $storagePath = Join-Path "storage" "media"
    New-Item -ItemType Directory -Path $storagePath -Force | Out-Null
    $mongoUri = Get-EnvValue -FilePath ".env" -Key "MONGO_URI"
    $shouldEnsureMongoDb = $InstallMongoDb.IsPresent

    if (-not $shouldEnsureMongoDb -and (Test-LocalMongoUri -MongoUri $mongoUri) -and -not (Test-TcpPort -Host "127.0.0.1" -Port 27017)) {
      if (Prompt-InstallMongoDb) {
        $shouldEnsureMongoDb = $true
      } else {
        Write-Warning "Skipping MongoDB installation/start. Ensure MONGO_URI points to an available MongoDB instance."
      }
    }

    if ($shouldEnsureMongoDb) {
      Ensure-MongoDb
    }

    Install-Dependencies
    Build-App
    Seed-AppData

    $port = Get-EnvValue -FilePath ".env" -Key "PORT"
    if ([string]::IsNullOrWhiteSpace($port)) {
      $port = "3000"
    }

    Write-Host ""
    Write-Info "Setup completed successfully."
    Write-Info ("Project path: {0}" -f (Get-Location).Path)
    Write-Info "Start server (dev): npm run dev"
    Write-Info "Start server (prod): npm start"
    Write-Info ("Open app: http://localhost:{0}" -f $port)
  } finally {
    Pop-Location
  }
} catch {
  Write-Error $_
  exit 1
}

