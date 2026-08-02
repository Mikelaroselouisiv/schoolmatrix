#Requires -Version 5.1
<#
  Bootstrap machine Server SchoolMatrix - appelé au 1er lancement (et à chaque relance).
  Prérequis : dossier server-stack avec docker-compose.yml, images/*.tar, defaults.env*
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $StackDir
)

$ErrorActionPreference = 'Stop'
$StackDir = (Resolve-Path -LiteralPath $StackDir).Path
$ComposeFile = Join-Path $StackDir 'docker-compose.yml'
$EnvFile = Join-Path $StackDir '.env.server'
$DefaultsFile = Join-Path $StackDir 'defaults.env'
$DefaultsExample = Join-Path $StackDir 'defaults.env.example'
$ImagesDir = Join-Path $StackDir 'images'
$StateFile = Join-Path $StackDir '.bootstrap-done'
$TaskName = 'Parallele-SchoolMatrix-Server-Stack'
$StartScript = Join-Path $StackDir 'stack-start.ps1'

function Write-Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function New-RandomSecret([int]$ByteLength = 32) {
  $bytes = New-Object byte[] $ByteLength
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { '{0:x2}' -f $_ })
}

function Test-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  docker info 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

function Install-DockerDesktop {
  if (Test-DockerReady) { return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop est requis. Installez-le manuellement puis relancez SchoolMatrix Server.'
  }
  Write-Step 'Installation de Docker Desktop (winget)...'
  winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
  $deadline = (Get-Date).AddMinutes(5)
  while ((Get-Date) -lt $deadline) {
    if (Test-DockerReady) { return }
    Start-Sleep -Seconds 5
  }
  throw 'Docker Desktop installé mais pas prêt. Redémarrez le PC puis relancez SchoolMatrix Server.'
}

function Ensure-EnvFile {
  if (Test-Path -LiteralPath $EnvFile) { return }

  $source = $null
  if (Test-Path -LiteralPath $DefaultsFile) { $source = $DefaultsFile }
  elseif (Test-Path -LiteralPath $DefaultsExample) { $source = $DefaultsExample }
  else { throw 'defaults.env / defaults.env.example manquant dans server-stack' }

  $lines = Get-Content -LiteralPath $source
  $map = @{}
  foreach ($line in $lines) {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
      $map[$Matches[1].Trim()] = $Matches[2].Trim()
    }
  }

  function Test-Placeholder([string]$Value) {
    return (-not $Value) -or ($Value -match '^CHANGE_ME')
  }

  if (Test-Placeholder $map['DB_PASS']) { $map['DB_PASS'] = New-RandomSecret -ByteLength 18 }
  if (Test-Placeholder $map['JWT_SECRET']) { $map['JWT_SECRET'] = New-RandomSecret -ByteLength 32 }
  if (Test-Placeholder $map['SYNC_API_KEY']) { $map['SYNC_API_KEY'] = New-RandomSecret -ByteLength 32 }

  if (-not $map.ContainsKey('DB_USER') -or -not $map['DB_USER']) { $map['DB_USER'] = 'schoolmatrix' }
  if (-not $map.ContainsKey('DB_NAME') -or -not $map['DB_NAME']) { $map['DB_NAME'] = 'schoolmatrix' }
  if (-not $map.ContainsKey('REMOTE_API_URL') -or -not $map['REMOTE_API_URL']) {
    $map['REMOTE_API_URL'] = 'http://34.95.43.132'
  }

  $out = foreach ($key in @($map.Keys)) { "$key=$($map[$key])" }
  Set-Content -LiteralPath $EnvFile -Value ($out -join "`n") -Encoding UTF8
  Write-Step 'Secrets locaux generes (.env.server) - alignez SYNC_API_KEY avec le cloud si besoin'
}

function Import-BundledImages {
  if (-not (Test-Path -LiteralPath $ImagesDir)) {
    throw "Dossier images introuvable: $ImagesDir"
  }
  $tars = @(Get-ChildItem -LiteralPath $ImagesDir -Filter '*.tar' -File -ErrorAction SilentlyContinue)
  if ($tars.Count -eq 0) {
    throw "Aucune image .tar dans $ImagesDir - rebuild l'installeur Server (prepare:server-stack)."
  }
  foreach ($tar in $tars) {
    Write-Step "Chargement image $($tar.Name)..."
    docker load -i $tar.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker load a échoué pour $($tar.Name)" }
  }
}

function Test-LocalApi {
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/setup/status' -UseBasicParsing -TimeoutSec 3
    return $true
  } catch {
    # 403 = setup déjà fait → API vivante
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) { return $true }
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 3
      return $true
    } catch {
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) { return $true }
      return $false
    }
  }
}

function Test-PortInUse([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Assert-PortsFree {
  if (-not (Test-PortInUse -Port 3000)) { return }
  if (Test-LocalApi) {
    Write-Step 'API locale déjà active sur le port 3000'
    return
  }
  throw "Le port 3000 est déjà utilisé. Arrêtez l'autre service puis relancez SchoolMatrix Server."
}

function Start-Stack {
  Assert-PortsFree
  Write-Step 'Démarrage Postgres + API + sync-agent...'
  Push-Location $StackDir
  try {
    if (docker compose version 2>$null) {
      docker compose -f $ComposeFile --env-file $EnvFile up -d
    } else {
      docker-compose -f $ComposeFile --env-file $EnvFile up -d
    }
    if ($LASTEXITCODE -ne 0) { throw "docker compose up a échoué (code $LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
}

function Write-StackStartScript {
  @"
#Requires -Version 5.1
`$ErrorActionPreference = 'Stop'
`$StackDir = '$StackDir'
`$ComposeFile = Join-Path `$StackDir 'docker-compose.yml'
`$EnvFile = Join-Path `$StackDir '.env.server'
`$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt `$deadline) {
  docker info 2>`$null | Out-Null
  if (`$LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 3
}
Set-Location `$StackDir
if (docker compose version 2>`$null) {
  docker compose -f `$ComposeFile --env-file `$EnvFile up -d
} else {
  docker-compose -f `$ComposeFile --env-file `$EnvFile up -d
}
"@ | Set-Content -LiteralPath $StartScript -Encoding UTF8
}

function Register-ScheduledTask {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) { return }
  Write-StackStartScript
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
  $trigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME
  $trigger.Delay = 'PT1M'
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
      -Description 'Stack SchoolMatrix Server (Postgres + API + sync-agent)' | Out-Null
    Write-Step "Tâche planifiée créée: $TaskName"
  } catch {
    Write-Warning 'Tâche planifiée non créée (droits admin). La stack tourne quand même.'
  }
}

function Invoke-ComposeUpQuiet {
  Push-Location $StackDir
  try {
    if (docker compose version 2>$null) {
      docker compose -f $ComposeFile --env-file $EnvFile up -d 2>$null | Out-Null
    } else {
      docker-compose -f $ComposeFile --env-file $EnvFile up -d 2>$null | Out-Null
    }
  } finally {
    Pop-Location
  }
}

if (Test-Path -LiteralPath $StateFile) {
  if (Test-DockerReady) {
    Import-BundledImages
    Invoke-ComposeUpQuiet
  }
  exit 0
}

# Reprise après échec partiel : .env existe, stack déjà opérationnelle
if ((Test-Path -LiteralPath $EnvFile) -and (Test-LocalApi)) {
  if (Test-DockerReady) {
    Invoke-ComposeUpQuiet
  }
  Set-Content -LiteralPath $StateFile -Value (Get-Date).ToString('o') -Encoding UTF8
  exit 0
}

Write-Step 'Configuration machine Server (premier lancement)'
Install-DockerDesktop
Ensure-EnvFile
Import-BundledImages
Start-Stack
Register-ScheduledTask
Set-Content -LiteralPath $StateFile -Value (Get-Date).ToString('o') -Encoding UTF8
Write-Step 'Machine Server prete - API http://127.0.0.1:3000'
