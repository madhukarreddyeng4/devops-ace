#!/usr/bin/env bash
# One-shot bootstrap for a fresh Ubuntu 22.04 EC2 box.
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/selfhost/bootstrap-ec2.sh | sudo bash
# or just scp this file to the box and: sudo bash bootstrap-ec2.sh
set -euo pipefail

echo "▶ apt update + base packages"
apt-get update -y
apt-get install -y \
  ca-certificates curl gnupg lsb-release ufw git \
  nginx postgresql-client-15 unattended-upgrades

echo "▶ Install Docker Engine + compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "▶ Allow ubuntu user to run docker without sudo"
usermod -aG docker ubuntu || true

echo "▶ UFW firewall: allow SSH + HTTP + HTTPS only"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "▶ Install certbot for Let's Encrypt"
apt-get install -y certbot python3-certbot-nginx

echo "▶ Enable automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "✅ Bootstrap done. Log out and back in so the docker group takes effect."
echo "   Next: clone the repo and run selfhost/generate-secrets.sh > selfhost/.env"
