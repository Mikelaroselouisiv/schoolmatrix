#Requires -Version 5.1
<#
  Reparation machine ecole apres le renommage Parallele → Eureka.

  Ne touche PAS aux volumes Docker (aucune donnee n'est effacee).
  Remet l'API locale sur la stack existante avec l'ancien .env.server.

  Sur le PC Server:
    1) Arreter Shekinah dans Docker si tu l'avais lance (les deux se disputent le port 3000).
    2) PowerShell en admin:
       powershell -ExecutionPolicy Bypass -File repair-eureka-server-stack-after-rename.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

$programData = $env:ProgramData
if (-not $programData) { $programData = 'C:\ProgramData' }

$legacyDir = Join-Path $programData 'Parallele SchoolMatrix\server-stack'
$eurekaDir = Join-Path $programData 'Eureka SchoolMatrix\server-stack'
$legacyEnv = Join-Path $legacyDir '.env.server'
$eurekaEnv = Join-Path $eurekaDir '.env.server'

Write-Step 'Aucun volume Docker ne sera supprime.'

$stackDir = $null
if (Test-Path -LiteralPath $legacyEnv) {
  $stackDir = $legacyDir
  Write-Step "Secrets trouves: $legacyEnv"
  if ((Test-Path -LiteralPath $eurekaDir) -and -not (Test-Path -LiteralPath $eurekaEnv)) {
    New-Item -ItemType Directory -Path $eurekaDir -Force | Out-Null
    Copy-Item -LiteralPath $legacyEnv -Destination $eurekaEnv -Force
    $done = Join-Path $legacyDir '.bootstrap-done'
    if (Test-Path -LiteralPath $done) {
      Copy-Item -LiteralPath $done -Destination (Join-Path $eurekaDir '.bootstrap-done') -Force
    }
    Write-Step 'Copie .env.server vers le dossier Eureka (meme mot de passe Postgres)'
  }
} elseif (Test-Path -LiteralPath $eurekaEnv) {
  $stackDir = $eurekaDir
  Write-Step "Secrets Eureka uniquement: $eurekaEnv"
} else {
  throw "Aucun .env.server trouve. Cherche sous $legacyDir"
}

$compose = Join-Path $stackDir 'docker-compose.yml'
$envFile = Join-Path $stackDir '.env.server'
if (-not (Test-Path -LiteralPath $compose)) { throw "docker-compose.yml introuvable: $compose" }
if (-not (Test-Path -LiteralPath $envFile)) { throw ".env.server introuvable: $envFile" }

Write-Step 'Arret des conteneurs Shekinah (port 3000) si presents'
@(
  'shekinah_api_server',
  'shekinah_sync_agent',
  'shekinah_postgres_server'
) | ForEach-Object {
  docker stop $_ 2>$null | Out-Null
}

Write-Step 'Demarrage Postgres ecole existant (volume inchange)'
docker start schoolmatrix_postgres_server 2>$null | Out-Null

Write-Step "Compose up depuis $stackDir"
Push-Location $stackDir
try {
  if (docker compose version 2>$null) {
    docker compose -f $compose --env-file $envFile up -d
  } else {
    docker-compose -f $compose --env-file $envFile up -d
  }
} finally {
  Pop-Location
}

$legacyTask = 'Parallele-SchoolMatrix-Server-Stack'
$eurekaTask = 'Eureka-SchoolMatrix-Server-Stack'
if (Get-ScheduledTask -TaskName $legacyTask -ErrorAction SilentlyContinue) {
  if (Get-ScheduledTask -TaskName $eurekaTask -ErrorAction SilentlyContinue) {
    Disable-ScheduledTask -TaskName $eurekaTask -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $eurekaTask -Confirm:$false -ErrorAction SilentlyContinue
    Write-Step "Tache en double retiree: $eurekaTask"
  }
}

Write-Step 'Attente API http://127.0.0.1:3000'
$ok = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/setup/status' -UseBasicParsing -TimeoutSec 3
    if ([int]$r.StatusCode -lt 500) { $ok = $true; break }
  } catch {
    try {
      $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 3
      if ([int]$r.StatusCode -lt 500) { $ok = $true; break }
    } catch {}
  }
  Start-Sleep -Seconds 3
}

Write-Host ''
Write-Host 'Volumes Docker: intacts. Les eleves / notes n ont pas ete effaces.' -ForegroundColor Green
if ($ok) {
  Write-Host 'API locale OK. Relance Eureka SchoolMatrix Server et connecte-toi.' -ForegroundColor Green
} else {
  Write-Host 'API pas encore prete. Verifie: docker logs schoolmatrix_api_server --tail 80' -ForegroundColor Yellow
  Write-Host 'Puis: docker ps -a --filter name=schoolmatrix_' -ForegroundColor Yellow
}
