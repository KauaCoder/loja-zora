<?php
$host     = "dpg-db3r3s7avr4c73askskg-a.oregon-postgres.render.com";
$port     = "5432";
$dbname   = "meu_banco_dados_jrqo";
$user     = "kaiwff";
$password = "4k0eIcxlkuIztCiyqAGrh9bUJnHyaysU";

try {
    // DSN do PostgreSQL especificando sslmode=require
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
    
    $conexao = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die("Erro ao conectar com o banco de dados do Render: " . $e->getMessage());
}
?>
