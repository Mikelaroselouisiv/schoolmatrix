#Requires -Version 5.1
<#
.SYNOPSIS
  Pipeline de livraison SchoolMatrix : version → commit/push GitHub → backend GCP → installateurs GCS.

.DESCRIPTION
  À lancer quand le développement est terminé. Une seule commande pour tout mettre à jour :

    powershell -ExecutionPolicy Bypass -File infra/scripts/ship-all.ps1 -Bump patch -Commit

  Ce que fait le script (par défaut) :
    1. Assert projet GCP = parallele-schoolmatrix
    2. Bump semver apps/desktop/package.json (Remote + Server partagent la version)
    3. Commit + push origin (si -Commit)
    4. Backend : déclenche / laisse tourner CI « Backend - build and push to GCP »
    5. Desktop :
         -Mode Local (défaut) : build NSIS + upload GCS (notifications MAJ Remote/Server)
         -Mode -UseCI : tag desktop-vX.Y.Z → workflow GitHub Actions

.PARAMETER Bump
  patch | minor | major | none

.PARAMETER Desktop
  both | remote | server | none

.PARAMETER Commit
  Commit les changements (y compris le bump) puis push origin.

.PARAMETER Message
  Message de commit. Défaut : Ship SchoolMatrix desktop X.Y.Z

.PARAMETER UseCI
  Ne pas builder le desktop en local — pousser le tag desktop-v* pour GitHub Actions.

.PARAMETER SkipPush
  Commit éventuel sans push.

.PARAMETER SkipBackend
  Ne pas déclencher le workflow backend (le push main le fera quand même si paths match).

.PARAMETER DryRun
  Affiche les actions sans les exécuter.

.EXAMPLE
  # Livraison complète après un fix UI
  powershell -ExecutionPolicy Bypass -File infra/scripts/ship-all.ps1 -Bump patch -Commit

.EXAMPLE
  # Backend seulement (pas d'installateurs)
  powershell -ExecutionPolicy Bypass -File infra/scripts/ship-all.ps1 -Bump none -Desktop none -Commit -Message "fix sync pull"

.EXAMPLE
  # Build desktop via GitHub Actions (machine sans Docker)
  powershell -ExecutionPolicy Bypass -File infra/scripts/ship-all.ps1 -Bump minor -Commit -UseCI
#>
param(
  [ValidateSet('patch', 'minor', 'major', 'none')]
  [string] $Bump = 'patch',

  [ValidateSet('both', 'remote', 'server', 'none')]
  [string] $Desktop = 'both',

  [switch] $Commit,
  [string] $Message = '',
  [switch] $UseCI,
  [switch] $SkipPush,
  [switch] $SkipBackend,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $ScriptDir '..\..')).Path
$DesktopPkg = Join-Path $RepoRoot 'apps\desktop\package.json'
$AssertScript = Join-Path $ScriptDir 'assert-schoolmatrix-gcp.ps1'
$UploadScript = Join-Path $ScriptDir 'upload-desktop-installer.ps1'

function Write-Step([string] $Text) {
  Write-Host ""
  Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Invoke-OrDry([string] $Label, [scriptblock] $Action) {
  if ($DryRun) {
    Write-Host "[dry-run] $Label" -ForegroundColor Yellow
    return
  }
  Write-Host "→ $Label" -ForegroundColor Gray
  & $Action
}

function Get-DesktopVersion {
  $raw = Get-Content -LiteralPath $DesktopPkg -Raw -Encoding UTF8
  if ($raw -match '"version"\s*:\s*"([^"]+)"') { return $Matches[1] }
  throw "Impossible de lire version dans $DesktopPkg"
}

function Set-DesktopVersion([string] $NewVersion) {
  $raw = Get-Content -LiteralPath $DesktopPkg -Raw -Encoding UTF8
  $updated = [regex]::Replace($raw, '("version"\s*:\s*")[^"]+(")', "`${1}$NewVersion`${2}", 1)
  if ($updated -eq $raw) { throw "Bump version échoué ($NewVersion)" }
  Set-Content -LiteralPath $DesktopPkg -Value $updated -Encoding UTF8 -NoNewline
}

function Bump-SemVer([string] $Current, [string] $Kind) {
  $parts = $Current.Split('.')
  if ($parts.Count -lt 3) { throw "Version invalide: $Current (attendu X.Y.Z)" }
  $major = [int]$parts[0]; $minor = [int]$parts[1]; $patch = [int]$parts[2]
  switch ($Kind) {
    'major' { return "$( $major + 1 ).0.0" }
    'minor' { return "$major.$( $minor + 1 ).0" }
    'patch' { return "$major.$minor.$( $patch + 1 )" }
    default { return $Current }
  }
}

Set-Location -LiteralPath $RepoRoot

Write-Step "SchoolMatrix ship-all"
Write-Host "Repo: $RepoRoot"
Write-Host "Bump=$Bump Desktop=$Desktop Commit=$Commit UseCI=$UseCI DryRun=$DryRun"

# --- 1. GCP assert (sauf desktop none + skip backend + dry) ---
if (-not $DryRun -and ($Desktop -ne 'none' -or -not $SkipBackend)) {
  Write-Step "Assert GCP SchoolMatrix"
  try {
    & gcloud config configurations activate schoolmatrix 2>$null | Out-Null
  } catch { }
  & $AssertScript
}

# --- 2. Version bump ---
$version = Get-DesktopVersion
if ($Bump -ne 'none' -and $Desktop -ne 'none') {
  Write-Step "Bump desktop $version → …"
  $version = Bump-SemVer $version $Bump
  Invoke-OrDry "Écrire version $version dans apps/desktop/package.json" {
    Set-DesktopVersion $version
  }
  Write-Host "Version desktop: $version"
} else {
  Write-Host "Version desktop (inchangée): $version"
}

# --- 3. Git commit + push ---
if ($Commit) {
  Write-Step "Git commit + push"
  if (-not $Message) {
    if ($Desktop -ne 'none' -and $Bump -ne 'none') {
      $Message = "Ship SchoolMatrix desktop $version"
    } else {
      $Message = "Ship SchoolMatrix"
    }
  }

  Invoke-OrDry "git add -A (hors secrets)" {
    git add -A
    # Sécurité : retirer secrets / pem / env si jamais stageés
    git reset HEAD -- secrets/ 2>$null
    git diff --cached --name-only | ForEach-Object {
      if ($_ -match '\.pem$' -or $_ -match '(^|/)\.env$' -or $_ -match '(^|/)\.env\.(dev|prod|local)$') {
        git reset HEAD -- $_ 2>$null
        Write-Host "  (exclu) $_" -ForegroundColor Yellow
      }
    }
  }

  $staged = @()
  if (-not $DryRun) {
    $staged = @(git diff --cached --name-only)
  }
  if ($DryRun -or $staged.Count -gt 0) {
    Invoke-OrDry "git commit -m `"$Message`"" {
      git commit -m $Message
      if ($LASTEXITCODE -ne 0) { throw "git commit a échoué (rien à committer ?)" }
    }
  } else {
    Write-Host "Rien à committer (working tree déjà propre hors bump éventuel)." -ForegroundColor Yellow
  }

  if (-not $SkipPush) {
    Invoke-OrDry "git push origin HEAD" {
      git push -u origin HEAD
      if ($LASTEXITCODE -ne 0) { throw "git push a échoué" }
    }
  }
} else {
  Write-Host "Skip git commit (passe -Commit pour commit+push)." -ForegroundColor Yellow
}

# --- 4. Backend CI ---
if (-not $SkipBackend) {
  Write-Step "Backend → GCP (Artifact Registry + VM)"
  if ($UseCI -or $Commit) {
    # Push main avec paths backend déclenche déjà backend-gcp.yml.
    # On force aussi un workflow_dispatch si gh est dispo (même sans changement backend).
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if ($gh -and -not $SkipPush) {
      Invoke-OrDry "gh workflow run `"Backend - build and push to GCP`"" {
        gh workflow run "Backend - build and push to GCP" --ref (git branch --show-current)
        if ($LASTEXITCODE -ne 0) {
          Write-Host "Avertissement: déclenchement manuel backend échoué (CI push peut suffire)." -ForegroundColor Yellow
        } else {
          Write-Host "Workflow backend déclenché."
        }
      }
    } else {
      Write-Host "Backend: déployé automatiquement par push main si fichiers backend/infra touchés."
      Write-Host "         Ou : Actions → Backend - build and push to GCP → Run workflow"
    }
  } else {
    Write-Host "Backend: -Commit ou -UseCI recommandé pour déclencher le déploiement."
  }
}

# --- 5. Desktop Remote / Server ---
if ($Desktop -eq 'none') {
  Write-Host "Desktop: skip (-Desktop none)"
} elseif ($UseCI) {
  Write-Step "Desktop via GitHub Actions (tag desktop-v$version)"
  $tag = "desktop-v$version"
  if (-not $SkipPush) {
    Invoke-OrDry "git tag $tag && git push origin $tag" {
      $exists = git rev-parse -q --verify "refs/tags/$tag" 2>$null
      if (-not $exists) {
        git tag $tag
      }
      git push origin $tag
      if ($LASTEXITCODE -ne 0) { throw "Push tag $tag échoué" }
    }
    Write-Host "Workflow Desktop - release to GCS va builder + uploader $Desktop."
  } else {
    Write-Host "[dry/skip] Tag $tag non poussé"
  }
} else {
  Write-Step "Desktop build local + upload GCS"
  $editions = @()
  if ($Desktop -eq 'both' -or $Desktop -eq 'remote') { $editions += 'remote' }
  if ($Desktop -eq 'both' -or $Desktop -eq 'server') { $editions += 'server' }

  Push-Location (Join-Path $RepoRoot 'apps\desktop')
  try {
    foreach ($ed in $editions) {
      Invoke-OrDry "npm run dist:win:$ed" {
        npm run "dist:win:$ed"
        if ($LASTEXITCODE -ne 0) { throw "Build dist:win:$ed échoué" }
      }
    }
  } finally {
    Pop-Location
  }

  foreach ($ed in $editions) {
    Invoke-OrDry "upload-desktop-installer.ps1 -Edition $ed -Version $version" {
      & $UploadScript -Edition $ed -Version $version
    }
  }
}

# --- 6. Rapport ---
Write-Step "Livraison terminée"
Write-Host "Desktop version : $version"
Write-Host "Feeds MAJ :"
Write-Host "  Remote: https://storage.googleapis.com/parallele-schoolmatrix-assets/installers/remote/latest.yml"
Write-Host "  Server: https://storage.googleapis.com/parallele-schoolmatrix-assets/installers/server/latest.yml"
Write-Host "API cloud  : http://34.95.43.132/"
Write-Host "GitHub     : https://github.com/Mikelaroselouisiv/schoolmatrix"
Write-Host ""
Write-Host "Sur les machines installées : notification → télécharger → redémarrer."
if ($DryRun) {
  Write-Host "(DryRun : aucune action réelle.)" -ForegroundColor Yellow
}
