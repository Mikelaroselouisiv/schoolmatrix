# Stockage fichiers — Google Cloud Storage

Remplace AWS S3 pour SchoolMatrix.

## Bucket

| Clé | Valeur |
|-----|--------|
| Bucket | `gs://parallele-schoolmatrix-assets` |
| Préfixe fichiers | `schoolmatrix/uploads/`, `schoolmatrix/profiles/`, `schoolmatrix/backups/` |
| Installers (Phase 4) | `installers/remote/`, `installers/server/` |

## Variables d’environnement

```env
GCS_BUCKET=parallele-schoolmatrix-assets
GCS_PREFIX=schoolmatrix
GCS_PROJECT_ID=parallele-schoolmatrix
```

Sur la **VM GCP**, pas de clé JSON : le client utilise l’ADC du compte de service `schoolmatrix-vm@…` (rôle `roles/storage.objectAdmin`).

Sur la **machine Server locale**, soit ADC utilisateur (`gcloud auth application-default login`), soit `GOOGLE_APPLICATION_CREDENTIALS` vers une clé SA avec accès écriture au bucket.

## Comportement upload

1. Écriture locale (`STORAGE_ROOT`)
2. Copie vers GCS si `GCS_BUCKET` défini
3. Métadonnée `file_metadata.s3_key` = clé objet GCS (nom de colonne historique)

S3 AWS n’est plus utilisé sauf si les variables AWS_* sont encore renseignées (legacy).
