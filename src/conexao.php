<?php
declare(strict_types=1);

/* =========================================================
   ZORA - CONEXÃO COM BANCO DE DADOS (SUPABASE + RENDER)
   ========================================================= */

$dbUrl = getenv('DATABASE_URL');

if (!$dbUrl || !is_string($dbUrl)) {
    error_log("ZORA Erro Crítico: A variável DATABASE_URL não foi configurada no ambiente Render.");
    
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro de configuração no servidor de banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Tenta parsear a URL de conexão do PostgreSQL
$dbopts = parse_url($dbUrl);

if ($dbopts !== false && isset($dbopts['host'])) {
    $host     = $dbopts['host'];
    $port     = $dbopts['port'] ?? 6543;
    $user     = $dbopts['user'] ?? '';
    $password = isset($dbopts['pass']) ? urldecode($dbopts['pass']) : '';
    $dbname   = isset($dbopts['path']) ? ltrim($dbopts['path'], '/') : 'postgres';
} else {
    // Regex de fallback para senhas com caracteres especiais
    if (preg_match('/pgsql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/', $dbUrl, $matches)) {
        $user     = $matches[1];
        $password = urldecode($matches[2]);
        $host     = $matches[3];
        $port     = (int) $matches[4];
        $dbname   = strtok($matches[5], '?');
    } else {
        $host     = 'aws-0-us-east-1.pooler.supabase.com';
        $port     = 6543;
        $user     = '';
        $password = '';
        $dbname   = 'postgres';
    }
}

// Sanitização de host
if (empty($host) || str_contains($host, 'port=')) {
    $host = 'aws-0-us-east-1.pooler.supabase.com';
}

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";

    $conexao = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => true, // Essencial para PgBouncer/Supabase Pooler
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8'"
    ]);

} catch (PDOException $e) {
    error_log("ZORA: Erro de Conexão Supabase/PDO: " . $e->getMessage());

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }

    echo json_encode([
        'sucesso'  => false,
        'mensagem' => 'Não foi possível conectar ao banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
