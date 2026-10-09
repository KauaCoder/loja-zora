FROM php:8.2-apache

# Instala o driver nativo do PostgreSQL (pdo_pgsql e pgsql)
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copia todos os arquivos do projeto para o Apache
COPY . /var/www/html/

# Altera o DocumentRoot do Apache para a pasta src/
RUN sed -i 's|/var/www/html|/var/www/html/src|g' /etc/apache2/sites-available/000-default.conf

# Concede permissão de acesso e ativa o mod_rewrite
RUN echo "<Directory /var/www/html/src/>\n\tOptions Indexes FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>" >> /etc/apache2/apache2.conf
RUN a2enmod rewrite

EXPOSE 80
