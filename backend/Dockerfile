FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends git unzip libpq-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
EXPOSE 8000
CMD ["sh", "-lc", "composer install --no-interaction && if [ -z \"$APP_KEY\" ]; then php artisan key:generate --force; fi && php artisan storage:link --force && php artisan migrate --seed --force && exec php artisan serve --host=0.0.0.0 --port=8000"]
