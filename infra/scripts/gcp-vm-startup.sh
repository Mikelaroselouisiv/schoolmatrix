#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose nginx

systemctl enable --now docker
# Compose V2 plugin is optional; binary docker-compose (v1) is enough as fallback
usermod -aG docker "$(logname 2>/dev/null || echo root)" || true

install -d -m 0750 /opt/schoolmatrix

cat >/etc/nginx/sites-available/schoolmatrix-api <<'NGINX_CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
NGINX_CONF

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/schoolmatrix-api /etc/nginx/sites-enabled/schoolmatrix-api
nginx -t
systemctl enable nginx
systemctl restart nginx
