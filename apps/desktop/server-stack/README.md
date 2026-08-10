# server-stack — bundle installateur **école**

Ce dossier est **embarqué** dans l’exe SchoolMatrix Server. Sur site, `bootstrap.ps1` charge les images `.tar` dans le Docker **de l’école**.

Ce n’est **pas** :

- l’environnement de développement quotidien
- le compose GCP (`infra/docker/docker-compose.gcp.yml`)
- quelque chose à « up » manuellement sur le laptop sauf test volontaire du bootstrap

Préparation des images : `npm run prepare:server-stack` (depuis `apps/desktop`) — tire `backend:latest` depuis Artifact Registry.

Voir [docs/ENVIRONMENTS.md](../../../docs/ENVIRONMENTS.md).
