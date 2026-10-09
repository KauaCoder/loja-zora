<?php
// 1. Lê a URL do banco configurada no Render (DATABASE_URL)
$db_url = getenv('DATABASE_URL');

if (!$db_url) {
    http_response_code(500);
    die("Erro: A variável DATABASE_URL não foi configurada no Render.");
}

// 2. Extrai os dados da URL de conexão do Supabase
$dbopts = parse_url($db_url);

$host     = $dbopts["host"] ?? '';
$port     = $dbopts["port"] ?? 6543;
$user     = $dbopts["user"] ?? '';
$password = isset($dbopts["pass"]) ? urldecode($dbopts["pass"]) : '';
$dbname   = isset($dbopts["path"]) ? ltrim($dbopts["path"], '/') : 'postgres';

// Caso a URL venha sem a porta explícita ou com formato estendido
if (empty($host) || $host === 'port=6543') {
    $host = 'aws-0-us-east-1.pooler.supabase.com'; // Host padrão do seu projeto Supabase
}

// 3. Monta a DSN do PDO de forma limpa e direta
try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";
    
    $conexao = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die("Erro ao conectar com o banco de dados: " . $e->getMessage());
}
?>
