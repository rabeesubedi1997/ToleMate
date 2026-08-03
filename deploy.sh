#!/bin/bash
# ============================================================
# ToleMate deployment script for cPanel shared hosting
# Domain: tolemate.kitetool.com  (single domain for web + API)
#
# Usage (on the server, inside the cloned repo):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Assumes:
#   - PHP 8.2+ selected for the subdomain (cPanel MultiPHP)
#   - MySQL database vertexen_tolemate already created in cPanel
#   - Subdomain document root points to: ~/public_html/tolemate/backend/public
#   - SSH access (Terminal / SSH Terminal in cPanel)
# ============================================================
set -e
cd "$(dirname "$0")"

echo "==> ToleMate deploy started ($(date))"

# ---------- 1. Backend dependencies ----------
echo "==> Installing backend dependencies..."
cd backend
if [ ! -f composer.phar ] && ! command -v composer >/dev/null 2>&1; then
    echo "    Downloading composer..."
    curl -sS https://getcomposer.org/installer | php
    COMPOSER="php composer.phar"
else
    COMPOSER="composer"
fi
$COMPOSER install --no-dev --optimize-autoloader --no-interaction

# ---------- 2. Storage + permissions ----------
echo "==> Linking storage..."
php artisan storage:link || true
chmod -R 775 storage bootstrap/cache
chmod -R 775 storage/app/public 2>/dev/null || true

# ---------- 3. Database ----------
echo "==> Running migrations + seeders..."
php artisan migrate --force
php artisan db:seed --force

# ---------- 4. Web frontend ----------
echo "==> Preparing web frontend..."
cd ../frontend
if [ -d build ]; then
    echo "    Using prebuilt frontend from git..."
    cp -r build/* ../backend/public/
elif command -v node >/dev/null 2>&1; then
    echo "    Building frontend with Node..."
    npm install --no-audit --no-fund
    npm run build
    echo "==> Copying build into Laravel public/ ..."
    cp -r build/* ../backend/public/
else
    echo "!! No prebuilt frontend and no Node.js on this server."
    echo "!! Build it locally (cd frontend && npm run build), commit,"
    echo "!! then re-run this script."
fi

# ---------- 5. Laravel caches ----------
echo "==> Optimizing Laravel..."
cd ../backend
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true
php artisan optimize || true

echo "==> Done! https://tolemate.kitetool.com should be live."
echo "    Super admin: superadmin@tolemate.com / password"
