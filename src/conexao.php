<?php
/* =========================================================
   ZORA - CONEXÃO COM BANCO DE DADOS (SUPABASE + RENDER)
   ========================================================= */

// 1. Lê a URL do banco configurada nas variáveis de ambiente do Render
$db_url = getenv('DATABASE_URL');

if (!$db_url) {
    http_response_code(500);
    error_log("Erro Crítico: A variável DATABASE_URL não foi configurada no Render.");
    die(json_encode([
        "sucesso" => false,
        "mensagem" => "Erro de configuração no servidor de banco de dados."
    ]));
}

// 2. Extração segura dos parâmetros da URL
$dbopts = parse_url($db_url);

if ($dbopts === false || !isset($dbopts["host"])) {
    // Fallback usando expressões regulares caso a senha possua caracteres especiais
    preg_match('/postgres:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/', $db_url, $matches);
    $user     = $matches[1] ?? '';
    $password = urldecode($matches[2] ?? '');
    $host     = $matches[3] ?? 'aws-0-us-east-1.pooler.supabase.com';
    $port     = $matches[4] ?? 6543;
    $dbname   = $matches[5] ?? 'postgres';
} else {
    $host     = $dbopts["host"] ?? 'aws-0-us-east-1.pooler.supabase.com';
    $port     = $dbopts["port"] ?? 6543;
    $user     = $dbopts["user"] ?? '';
    $password = isset($dbopts["pass"]) ? urldecode($dbopts["pass"]) : '';
    $dbname   = isset($dbopts["path"]) ? ltrim($dbopts["path"], '/') : 'postgres';
}

// Corrige inconsistências de parsing no host
if (empty($host) || str_contains($host, 'port=')) {
    $host = 'aws-0-us-east-1.pooler.supabase.com';
}

// 3. Conexão PDO com Supabase PostgreSQL
try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";

    $conexao = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false
    ]);

} catch (PDOException $e) {
    // Registra o erro detalhado nos logs do Render sem expor na resposta HTTP
    error_log("Erro de Conexão Supabase: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Não foi possível conectar ao banco de dados."
    ]);
    exit;
}
