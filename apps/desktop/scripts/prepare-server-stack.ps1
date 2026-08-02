#Requires -Version 5.1
<#
  Prépare les images Docker tar pour l'installeur Server.
#>
$ErrorActionPreference = 'Stop'
$StackImages = Join-Path $PSScriptRoot '..\server-stack\images'
New-Item -ItemType Directory -Force -Path $StackImages | Out-Null

$Registry = 'northamerica-northeast1-docker.pkg.dev/parallele-schoolmatrix/schoolmatrix-backend'
$Backend = "${Registry}/backend:latest"
$Postgres = 'postgres:16'

Write-Host '==> Pull images'
docker pull $Backend
docker pull $Postgres

# sync-agent : build local
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$AgentDir = Join-Path $Root 'apps\sync-agent'
docker build -t schoolmatrix/sync-agent:bundle $AgentDir

docker tag $Backend schoolmatrix/backend:bundle
docker tag $Postgres schoolmatrix/postgres:bundle

Write-Host '==> docker save'
docker save schoolmatrix/backend:bundle -o (Join-Path $StackImages 'backend.tar')
docker save schoolmatrix/postgres:bundle -o (Join-Path $StackImages 'postgres.tar')
docker save schoolmatrix/sync-agent:bundle -o (Join-Path $StackImages 'sync-agent.tar')

Copy-Item (Join-Path $PSScriptRoot '..\server-stack\defaults.env.example') (Join-Path $PSScriptRoot '..\server-stack\defaults.env') -Force
Write-Host 'server-stack images prêts.'
