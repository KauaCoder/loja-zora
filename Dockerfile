# =========================================================
# ZORA — Dockerfile para Imagem PHP 8.2 + Apache (Render)
# =========================================================

FROM php:8.2-apache

# Instala dependências do sistema e extensões nativas do PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql \
    && apt-get clean \
    && rm -rf /var/var/lib/apt/lists/*

# Copia todos os arquivos do repositório para o diretório padrão do Apache
COPY . /var/www/html/

# Aponta o DocumentRoot do Apache diretamente para o diretório /src
RUN sed -i 's|/var/www/html|/var/www/html/src|g' /etc/apache2/sites-available/000-default.conf

# Concede permissões e permite reescrita com .htaccess (AllowOverride All)
RUN echo "<Directory /var/www/html/src/>\n\tOptions -Indexes +FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>" >> /etc/apache2/apache2.conf

# Ativa o módulo de reescrita do Apache (mod_rewrite)
RUN a2enmod rewrite

# Exposição da porta padrão
EXPOSE 80

# Inicia o servidor Apache em primeiro plano
CMD ["apache2-foreground"]
