# syntax=docker/dockerfile:1

############################################
# 1) Frontend build (Vite + React)
############################################
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

############################################
# 2) Application image (PHP + Apache)
############################################
FROM php:8.3-apache AS app

# System packages + PHP extensions this app actually needs:
# - pdo_mysql           production database driver
# - gd, zip             maatwebsite/excel, phpoffice/phpword, evidence/profile-pic uploads
# - mbstring, bcmath,
#   exif, pcntl, intl   standard Laravel requirements
# - redis (pecl)        optional cache/session/queue driver (REDIS_CLIENT in .env.example);
#                        cheap to include so switching to it later needs no rebuild
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip \
        libzip-dev libpng-dev libjpeg-dev libfreetype6-dev libonig-dev libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring exif pcntl bcmath gd zip intl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# public/ is the actual document root, not the repo root — the default
# php:*-apache vhost would otherwise serve .env, vendor/, storage/, etc.
# directly.
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

# Install PHP dependencies before copying the rest of the app so this layer
# is only rebuilt when composer.json/composer.lock actually change.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
COPY --from=frontend /app/public/build public/build

# --no-scripts above skipped Laravel's package-discovery (it needs the full
# app tree, not just vendor/) — finish that now that everything is in place.
RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi

RUN chown -R www-data:www-data storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["entrypoint.sh"]
CMD ["apache2-foreground"]
