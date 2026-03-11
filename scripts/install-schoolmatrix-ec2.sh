#!/usr/bin/env bash
# Installation / préparation du dossier de production SchoolMatrix sur EC2.
# Idempotent : ne crée pas ni n'écrase les données existantes.
# À exécuter sur l'instance EC2 (après clonage du repo ou copie des fichiers).
#
# Usage (sur l'EC2, depuis la racine du repo) :
#   chmod +x scripts/install-schoolmatrix-ec2.sh
#   ./scripts/install-schoolmatrix-ec2.sh
#
# Les variables sensibles (AWS, JWT, etc.) doivent être définies dans le .env
# créé sur le serveur — ce script ne contient aucun secret.

set -e

INSTALL_DIR="${INSTALL_DIR:-/home/ubuntu/schoolmatrix-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Répertoire d'installation : $INSTALL_DIR"
echo "Racine du repo : $REPO_ROOT"

# Créer le dossier racine
mkdir -p "$INSTALL_DIR"
echo "[OK] $INSTALL_DIR"

# Sous-dossiers (idempotent : mkdir -p ne fait rien si existant)
mkdir -p "$INSTALL_DIR/storage/uploads"
mkdir -p "$INSTALL_DIR/storage/profiles"
mkdir -p "$INSTALL_DIR/storage/backups"
mkdir -p "$INSTALL_DIR/postgres_data"
echo "[OK] storage/, storage/uploads, storage/profiles, storage/backups, postgres_data/"

# Fichier .env (compose) — ne pas écraser si existant
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$SCRIPT_DIR/env.template" ]; then
    sed "s|^SCHOOLMATRIX_DATA=.*|SCHOOLMATRIX_DATA=$INSTALL_DIR|" "$SCRIPT_DIR/env.template" > "$ENV_FILE"
    echo "[OK] Créé $ENV_FILE depuis env.template (à compléter avec ECR_REGISTRY, secrets, etc.)"
  else
    echo "SCHOOLMATRIX_DATA=$INSTALL_DIR" > "$ENV_FILE"
    echo "# Compléter avec : DB_USER, DB_PASS, DB_NAME, ECR_REGISTRY, IMAGE_TAG, AWS_REGION, JWT_SECRET, AWS_*" >> "$ENV_FILE"
    echo "[OK] Créé $ENV_FILE minimal (à compléter)"
  fi
else
  echo "[OK] $ENV_FILE existe déjà, non modifié"
fi

# Fichier .env.prod (API) — ne pas écraser si existant
ENV_PROD_FILE="$INSTALL_DIR/.env.prod"
if [ ! -f "$ENV_PROD_FILE" ]; then
  if [ -f "$SCRIPT_DIR/env.template" ]; then
    cp "$SCRIPT_DIR/env.template" "$ENV_PROD_FILE"
    echo "[OK] Créé $ENV_PROD_FILE depuis env.template (à compléter)"
  elif [ -f "$SCRIPT_DIR/env.prod.local.template" ]; then
    cp "$SCRIPT_DIR/env.prod.local.template" "$ENV_PROD_FILE"
    echo "[OK] Créé $ENV_PROD_FILE depuis env.prod.local.template (à compléter)"
  else
    echo "DB_HOST=db" > "$ENV_PROD_FILE"
    echo "DB_PORT=5432" >> "$ENV_PROD_FILE"
    echo "DB_USER=schoolmatrix" >> "$ENV_PROD_FILE"
    echo "DB_PASS=schoolmatrix" >> "$ENV_PROD_FILE"
    echo "DB_NAME=schoolmatrix" >> "$ENV_PROD_FILE"
    echo "JWT_SECRET=" >> "$ENV_PROD_FILE"
    echo "[OK] Créé $ENV_PROD_FILE minimal (à compléter)"
  fi
else
  echo "[OK] $ENV_PROD_FILE existe déjà, non modifié"
fi

# Copier docker-compose (idempotent : ne pas écraser docker-compose.yml existant)
COMPOSE_DEST="$INSTALL_DIR/docker-compose.yml"
if [ ! -f "$COMPOSE_DEST" ]; then
  COMPOSE_SRC="$REPO_ROOT/docker-compose.prod-local-ecr.yml"
  if [ -f "$COMPOSE_SRC" ]; then
    cp "$COMPOSE_SRC" "$COMPOSE_DEST"
    echo "[OK] Copié docker-compose.prod-local-ecr.yml → $COMPOSE_DEST"
  else
    echo "[ERREUR] Fichier source introuvable : $COMPOSE_SRC"
    exit 1
  fi
else
  echo "[OK] $COMPOSE_DEST existe déjà, non modifié"
fi

echo ""
echo "Installation terminée. Prochaines étapes :"
echo "  1. Éditer $ENV_FILE (ECR_REGISTRY, IMAGE_TAG, AWS_REGION, etc.)"
echo "  2. Éditer $ENV_PROD_FILE (JWT_SECRET, AWS_* si besoin)"
echo "  3. cd $INSTALL_DIR && docker compose pull && docker compose up -d"
echo "  (Les identifiants AWS doivent être configurés sur le serveur : aws configure ou variables d'environnement.)"
