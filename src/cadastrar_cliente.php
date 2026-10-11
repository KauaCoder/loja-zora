<?php

ob_start();
header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão
$caminho_conexao = __DIR__ . '/src/conexao.php';
if (!file_exists($caminho_conexao)) {
    $caminho_conexao = __DIR__ . '/conexao.php';
}

require_once $caminho_conexao;

try {

    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("Conexão com o banco de dados não foi inicializada.");
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        throw new Exception("Método não permitido. Utilize POST.");
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    // =============================================
    // DADOS DO CLIENTE
    // =============================================
    $nome     = trim($dados["nome"] ?? "");
    $email    = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha    = $dados["senha"] ?? "";

    // =============================================
    // DADOS DO ENDEREÇO
    // =============================================
    $endereco = $dados["endereco"] ?? [];

    $cep         = trim($endereco["cep"] ?? $dados["cep"] ?? "");
    $rua         = trim($endereco["rua"] ?? $endereco["endereco"] ?? $dados["rua"] ?? $dados["endereco"] ?? "");
    $numero      = trim($endereco["numero"] ?? $dados["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? $dados["complemento"] ?? "");
    $bairro      = trim($endereco["bairro"] ?? $dados["bairro"] ?? "");
    $cidade      = trim($endereco["cidade"] ?? $dados["cidade"] ?? "");
    $estado      = strtoupper(trim($endereco["estado"] ?? $dados["estado"] ?? ""));

    // Validações básicas
    if ($nome === "") throw new Exception("O nome é obrigatório.");
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception("Forneça um e-mail válido.");
    if ($senha === "" || strlen($senha) < 6) throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    if ($cep === "") throw new Exception("O CEP é obrigatório.");
    if ($rua === "") throw new Exception("A rua/endereço é obrigatória.");
    if ($numero === "") throw new Exception("O número do endereço é obrigatório.");
    if ($bairro === "") throw new Exception("O bairro é obrigatório.");
    if ($cidade === "") throw new Exception("A cidade é obrigatória.");
    if ($estado === "") throw new Exception("O estado (UF) é obrigatório.");

    // Verifica e-mail duplicado na coluna "e-mail" (aspas duplas para tratar o hífen)
    $sqlEmail = 'SELECT id_cliente FROM cliente WHERE "e-mail" = :email LIMIT 1';
    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([":email" => $email]);

    if ($stmtEmail->fetch(PDO::FETCH_ASSOC)) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    // =============================================
    // INICIAR TRANSAÇÃO
    // =============================================
    $conexao->beginTransaction();

    // 1. Insert na Tabela cliente (com "e-mail" entre aspas)
    $sqlCliente = '
        INSERT INTO cliente (nome, "e-mail", senha, telefone)
        VALUES (:nome, :email, :senha, :telefone)
        RETURNING id_cliente
    ';

    $stmtCliente = $conexao->prepare($sqlCliente);
    $stmtCliente->execute([
        ":nome"     => $nome,
        ":email"    => $email,
        ":senha"    => $senhaHash,
        ":telefone" => $telefone
    ]);

    $idCliente = (int) $stmtCliente->fetchColumn();

    if (!$idCliente) {
        throw new Exception("Erro ao gerar o ID do cliente.");
    }

    // 2. Insert na Tabela endereco
    $sqlEndereco = "
        INSERT INTO endereco (id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado)
        VALUES (:id_cliente, :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado)
    ";

    $stmtEndereco = $conexao->prepare($sqlEndereco);
    $stmtEndereco->execute([
        ":id_cliente"  => $idCliente,
        ":cep"         => $cep,
        ":endereco"    => $rua,
        ":numero"      => $numero,
        ":complemento" => $complemento,
        ":bairro"      => $bairro,
        ":cidade"      => $cidade,
        ":estado"      => $estado
    ]);

    $conexao->commit();

    ob_end_clean();
    echo json_encode([
        "sucesso"    => true,
        "mensagem"   => "Cadastro realizado com sucesso!",
        "id_cliente" => $idCliente
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    $msg = $e->getMessage();
    if (strpos($msg, "e-mail") !== false || strpos($msg, "23505") !== false) {
        $msg = "Este e-mail já está cadastrado no sistema.";
    }

    ob_end_clean();
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $msg
    ], JSON_UNESCAPED_UNICODE);
}
