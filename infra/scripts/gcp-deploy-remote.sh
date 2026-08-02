#!/usr/bin/env bash
# Déploie la stack GCP (miroir) sur la VM : pull image + compose up.
# Appelé par .github/workflows/backend-gcp.yml après push Artifact Registry.
#
# Variables requises :
#   GCP_PROJECT_ID, GCP_VM_NAME, GCP_VM_ZONE
# Optionnel :
#   GCP_REMOTE_DIR (défaut /opt/schoolmatrix)

set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID requis}"
: "${GCP_VM_NAME:?GCP_VM_NAME requis}"
: "${GCP_VM_ZONE:?GCP_VM_ZONE requis}"

REMOTE_DIR="${GCP_REMOTE_DIR:-/opt/schoolmatrix}"
COMPOSE_LOCAL="infra/docker/docker-compose.gcp.yml"
ONVM_LOCAL="infra/scripts/gcp-deploy-on-vm.sh"

case "${GCP_PROJECT_ID}" in
  *freres*|*bazile*|*israel*|*eau-cascade*)
    echo "ABORT: projet GCP interdit pour SchoolMatrix: ${GCP_PROJECT_ID}" >&2
    exit 1
    ;;
esac

if [[ ! -f "${COMPOSE_LOCAL}" ]]; then
  echo "Fichier introuvable: ${COMPOSE_LOCAL}" >&2
  exit 1
fi
if [[ ! -f "${ONVM_LOCAL}" ]]; then
  echo "Fichier introuvable: ${ONVM_LOCAL}" >&2
  exit 1
fi

SSH_OPTS=(--zone="${GCP_VM_ZONE}" --project="${GCP_PROJECT_ID}" --tunnel-through-iap)

echo "==> Nettoyage /tmp sur ${GCP_VM_NAME}"
gcloud compute ssh "${GCP_VM_NAME}" \
  "${SSH_OPTS[@]}" \
  --command="sudo rm -f /tmp/docker-compose.gcp.yml /tmp/gcp-deploy-on-vm.sh"

echo "==> Copie compose + script deploy"
gcloud compute scp "${COMPOSE_LOCAL}" \
  "${GCP_VM_NAME}:/tmp/docker-compose.gcp.yml" \
  "${SSH_OPTS[@]}"
gcloud compute scp "${ONVM_LOCAL}" \
  "${GCP_VM_NAME}:/tmp/gcp-deploy-on-vm.sh" \
  "${SSH_OPTS[@]}"

echo "==> Déploiement sur ${GCP_VM_NAME} (${GCP_VM_ZONE})"
gcloud compute ssh "${GCP_VM_NAME}" \
  "${SSH_OPTS[@]}" \
  --command="sudo REMOTE_DIR='${REMOTE_DIR}' bash /tmp/gcp-deploy-on-vm.sh"

echo "==> Déploiement GCP SchoolMatrix terminé"
