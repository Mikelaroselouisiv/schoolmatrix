# Build de l'application Electron Parallele SchoolMatrix (installateur / mise à jour)
# À exécuter depuis la racine du projet : .\build-desktop.ps1

Set-Location -Path $PSScriptRoot\desktop
npm run build
Set-Location -Path $PSScriptRoot
