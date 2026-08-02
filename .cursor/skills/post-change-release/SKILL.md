---
name: post-change-release
description: >-
  Post-modification release for Parallele SchoolMatrix: bump desktop semver,
  run ship-all.ps1 (git push, backend GCP, Remote/Server GCS installers so
  installed apps get update notifications). Use when the user finished changes
  and asks to ship, publier, push, release, déployer, GCS, GCP, or mettre à jour partout.
---

# Post-change release — SchoolMatrix

Ne lance ce workflow **que sur demande explicite** (ex. « ship », « publie », « fais les pushs », « mets à jour partout »).

## Checklist

```
Post-change SchoolMatrix:
- [ ] 1. Diff + périmètre
- [ ] 2. ship-all.ps1 (ou étapes manuelles équivalentes)
- [ ] 3. Rapport (version, URLs feeds, CI)
```

## Commande préférée

```powershell
powershell -ExecutionPolicy Bypass -File infra/scripts/ship-all.ps1 -Bump patch -Commit
```

| Besoin | Flags |
|--------|--------|
| Fix / UI | `-Bump patch -Commit` |
| Feature | `-Bump minor -Commit` |
| Backend only | `-Bump none -Desktop none -Commit -Message "…"` |
| CI build desktop | `-Bump patch -Commit -UseCI` |
| Simulation | `-DryRun` |

Détails : [docs/RELEASE.md](../../../docs/RELEASE.md).

## Périmètre

| Chemins | Effet via ship / CI |
|---------|---------------------|
| `parallele-schoolmatrix-backend/**`, `infra/docker/**` | Deploy VM GCP |
| `apps/desktop/**` | Bump + installers GCS → notif MAJ |
| `apps/sync-agent/**` | Commit/push ; rebuild Server si stack |
| `docs/**`, `.github/**` | Push GitHub |

Remote Git : **`origin`** → `https://github.com/Mikelaroselouisiv/schoolmatrix.git`  
GCP : projet **`parallele-schoolmatrix`** uniquement (`assert-schoolmatrix-gcp.ps1`).

## Anti-patterns

- Pousser vers un projet Israel / Frères / Eau Cascade
- Committer `secrets/`, `*.pem`, `.env`, `release/*.exe`
- Builder sans bump si on publie un nouvel installateur (les clients ne verraient pas de MAJ)
