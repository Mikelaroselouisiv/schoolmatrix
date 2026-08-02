#Requires -Version 5.1
<#
.SYNOPSIS
  Ajoute / aligne SYNC_API_KEY dans /opt/schoolmatrix/.env.prod sur la VM GCP.
#>
param(
  [string] $ProjectId = 'parallele-schoolmatrix',
  [string] $VmName = 'schoolmatrix-api',
  [string] $Zone = 'northamerica-northeast1-a',
  [string] $RemoteDir = '/opt/schoolmatrix',
  [string] $SyncKey = ''
)

$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir 'assert-schoolmatrix-gcp.ps1')
if (-not $?) { throw 'assert failed' }

function New-Secret([int] $Bytes = 32) {
  $buf = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  return ([Convert]::ToBase64String($buf) -replace '[/+=]', 'x')
}

if (-not $SyncKey) { $SyncKey = New-Secret 32 }

$remote = @"
set -euo pipefail
ENV='$RemoteDir/.env.prod'
sudo test -f "`$ENV" || { echo 'MISSING_ENV'; exit 1; }
# Eviter collage sur la derniere ligne sans \n
sudo sed -i 's|STORAGE_ROOT=/app/storageSYNC_API_KEY=.*|STORAGE_ROOT=/app/storage|' "`$ENV" || true
sudo sed -i '/^SYNC_API_KEY=/d' "`$ENV"
sudo bash -c "tail -c1 '`$ENV' | read -r _ || echo >> '`$ENV'; printf 'SYNC_API_KEY=$SyncKey\n' >> '`$ENV'"
sudo chmod 600 "`$ENV"
echo SYNC_KEY_OK
"@

& gcloud compute ssh $VmName --zone=$Zone --project=$ProjectId --tunnel-through-iap --command=$remote

$out = Join-Path $ScriptDir '..\..\secrets\sync-api-key.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
Set-Content -LiteralPath $out -Value $SyncKey -Encoding ascii
Write-Host "SYNC_API_KEY ecrite sur la VM et dans secrets/sync-api-key.txt (gitignore)" -ForegroundColor Green
Write-Host "Relancez le backend cloud pour prendre la cle (deploy)." -ForegroundColor Yellow
