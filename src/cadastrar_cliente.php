<?php
/* =========================================================
   ZORA - CONEXÃO COM BANCO DE DADOS (SUPABASE + RENDER)
   ========================================================= */

$db_url = getenv('DATABASE_URL');

if (!$db_url) {
    http_response_code(500);
    error_log("Erro Crítico: A variável DATABASE_URL não foi configurada no Render.");
    header("Content-Type: application/json; charset=UTF-8");
    die(json_encode([
        "sucesso" => false,
        "mensagem" => "Erro de configuração no servidor de banco de dados."
    ], JSON_UNESCAPED_UNICODE));
}

$dbopts = parse_url($db_url);

if ($dbopts === false || !isset($dbopts["host"])) {
    preg_match('/postgres:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/', $db_url, $matches);
    $user     = $matches[1] ?? '';
    $password = urldecode($matches[2] ?? '');
    $host     = $matches[3] ?? 'aws-0-us-east-1.pooler.supabase.com';
    $port     = $matches[4] ?? 6543;
    $dbname   = $matches[5] ?? 'postgres';
} else {
    $host     = $dbopts["host"] ?? 'aws-0-us-east-1.pooler.supabase.com';
    $port     = $dbopts["port"] ?? 6543;
    $user     = $dbopts["user"] ?? '';
    $password = isset($dbopts["pass"]) ? urldecode($dbopts["pass"]) : '';
    $dbname   = isset($dbopts["path"]) ? ltrim($dbopts["path"], '/') : 'postgres';
}

if (empty($host) || str_contains($host, 'port=')) {
    $host = 'aws-0-us-east-1.pooler.supabase.com';
}

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";

    $conexao = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false
    ]);

} catch (PDOException $e) {
    error_log("Erro de Conexão Supabase: " . $e->getMessage());

    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Não foi possível conectar ao banco de dados."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
