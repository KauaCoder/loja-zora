FROM php:8.2-apache

# Instala extensões para suporte ao PostgreSQL no PHP
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copia todos os arquivos do projeto para o Apache (mantendo a raiz principal)
COPY . /var/www/html/

# Concede permissão de acesso e ativa o mod_rewrite na raiz
RUN echo "<Directory /var/www/html/>\n\tOptions Indexes FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>" >> /etc/apache2/apache2.conf
RUN a2enmod rewrite

# Expõe a porta 80 do Apache
EXPOSE 80
