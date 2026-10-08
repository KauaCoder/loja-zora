<?php

$db_url = "postgresql://kaiwff:4k0eIcxlkuIztCiyqAGrh9bUJnHyaysU@dpg-db3r3s7avr4c73askskg-a.oregon-postgres.render.com/meu_banco_dados_jrqo?sslmode=require";

try {

    $conexao = new PDO($db_url);

    $conexao->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    $conexao->setAttribute(
        PDO::ATTR_DEFAULT_FETCH_MODE,
        PDO::FETCH_ASSOC
    );

} catch (PDOException $e) {

    die("Erro ao conectar ao PostgreSQL: " . $e->getMessage());

}