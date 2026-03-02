# Build des images ET démarrage des conteneurs (db + api + web).
# Les conteneurs s'afficheront dans Docker Desktop une fois démarrés.
# À lancer à la racine du projet : .\start-prod.ps1

$env:CACHEBUST = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
docker compose --profile prod up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Conteneurs demarres. API: http://localhost:3000  Frontend: http://localhost:3001"
