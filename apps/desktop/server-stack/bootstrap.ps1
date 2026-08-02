#Requires -Version 5.1
param(
  [Parameter(Mandatory = $true)]
  [string] $StackDir
)

$ErrorActionPreference = 'Stop'
Set-Location $StackDir

function Assert-Docker {
  docker version | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop doit être installé et démarré.'
  }
}

Assert-Docker

$envFile = Join-Path $StackDir '.env.server'
$example = Join-Path $StackDir 'defaults.env.example'
if (-not (Test-Path $envFile)) {
  if (-not (Test-Path $example)) { throw 'defaults.env.example manquant' }
  Copy-Item $example $envFile
  # Générer secrets
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  function New-Secret([int]$n=24) {
    $b = New-Object byte[] $n
    $rng.GetBytes($b)
    return ([Convert]::ToBase64String($b) -replace '[/+=]','x')
  }
  $c = Get-Content $envFile -Raw
  $c = $c -replace 'DB_PASS=CHANGE_ME', "DB_PASS=$(New-Secret 18)"
  $c = $c -replace 'JWT_SECRET=CHANGE_ME', "JWT_SECRET=$(New-Secret 32)"
  # SYNC_API_KEY : laisser CHANGE_ME si absent — l'admin doit aligner avec le cloud
  Set-Content -Path $envFile -Value $c -Encoding utf8
  Write-Host 'Créé .env.server — renseignez SYNC_API_KEY (même clé que le cloud).'
}

$imagesDir = Join-Path $StackDir 'images'
if (Test-Path $imagesDir) {
  Get-ChildItem $imagesDir -Filter '*.tar' | ForEach-Object {
    Write-Host "docker load $($_.Name)"
    docker load -i $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "docker load failed: $($_.Name)" }
  }
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  if (docker compose version 2>$null) {
    docker compose --env-file .env.server -f docker-compose.yml up -d
  } else {
    docker-compose --env-file .env.server -f docker-compose.yml up -d
  }
}

if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }
Write-Host 'Stack Server démarrée.'
