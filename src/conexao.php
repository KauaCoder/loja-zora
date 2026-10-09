<?php
// 1. Lê a URL do banco de dados das variáveis de ambiente do Render
$db_url = getenv('DATABASE_URL');

if (!$db_url) {
    http_response_code(500);
    die("Erro: A variável DATABASE_URL não foi configurada nas Environment Variables do Render.");
}

// 2. Extrai os parâmetros da URL de conexão do Supabase
$dbopts = parse_url($db_url);

$host     = $dbopts["host"] ?? '';
$port     = $dbopts["port"] ?? 6543; // Utiliza a porta do Transaction Pooler do Supabase (6543)
$user     = $dbopts["user"] ?? '';
$password = $dbopts["pass"] ?? '';
$dbname   = isset($dbopts["path"]) ? ltrim($dbopts["path"], '/') : 'postgres';

// 3. Conecta ao PostgreSQL utilizando PDO
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
