FROM php:8.2-apache

# Instala o driver do PostgreSQL para o PHP
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copia os arquivos do projeto para o diretório web do Apache
COPY . /var/www/html/

# Configura a pasta src como raiz da aplicação
ENV APACHE_DOCUMENT_ROOT /var/www/html/src
RUN sed -ri -e 'sub!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 'sub!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/conf-available/*.conf

# Ativa o módulo mod_rewrite do Apache
RUN a2enmod rewrite

EXPOSE 80

