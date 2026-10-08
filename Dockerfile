FROM php:8.2-apache

# Instala extensões para suporte ao PostgreSQL no PHP
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copia todos os arquivos do projeto para o Apache
COPY . /var/www/html/

# Define a pasta 'src' como a raiz do servidor web
ENV APACHE_DOCUMENT_ROOT /var/www/html/src
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/conf-available/*.conf

# Concede permissão de acesso e ativa o mod_rewrite
RUN echo "<Directory /var/www/html/src/>\n\tOptions Indexes FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>" >> /etc/apache2/apache2.conf
RUN a2enmod rewrite

EXPOSE 80

