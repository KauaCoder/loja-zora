<?php

header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão presente na mesma pasta
require_once __DIR__ . "/conexao.php";

try {

    // =========================
    // VERIFICAR MÉTODO HTTP
    // =========================

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ]);
        exit;
    }

    // =========================
    // RECEBER JSON
    // =========================

    $dados = json_decode(file_get_contents("php://input"), true);

    if (!$dados || !is_array($dados)) {
        throw new Exception("Dados de requisição inválidos.");
    }

    // =========================
    // DADOS DO CLIENTE
    // =========================

    $nome = trim($dados["nome"] ?? "");
    $email = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha = $dados["senha"] ?? "";

    // =========================
    // DADOS DO ENDEREÇO (SUPORTA ANINHADO OU RAIZ)
    // =========================

    $endereco = $dados["endereco"] ?? [];

    $cep = trim($endereco["cep"] ?? $dados["cep"] ?? "");
    $rua = trim($endereco["rua"] ?? $endereco["endereco"] ?? $dados["rua"] ?? $dados["endereco"] ?? "");
    $numero = trim($endereco["numero"] ?? $dados["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? $dados["complemento"] ?? "");
    $bairro = trim($endereco["bairro"] ?? $dados["bairro"] ?? "");
    $cidade = trim($endereco["cidade"] ?? $dados["cidade"] ?? "");
    $estado = strtoupper(trim($endereco["estado"] ?? $dados["estado"] ?? ""));

    // =========================
    // VALIDAÇÕES DOS DADOS
    // =========================

    if ($nome === "") {
        throw new Exception("O nome é obrigatório.");
    }

    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Forneça um endereço de e-mail válido.");
    }

    if ($senha === "" || strlen($senha) < 6) {
        throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    }

    if ($cep === "") {
        throw new Exception("O CEP é obrigatório.");
    }

    if ($rua === "") {
        throw new Exception(" O endereço/rua é obrigatório.");
    }

    if ($numero === "") {
        throw new Exception("O número do endereço é obrigatório.");
    }

    if ($bairro === "") {
        throw new Exception("O bairro é obrigatório.");
    }

    if ($cidade === "") {
        throw new Exception("A cidade é obrigatória.");
    }

    if ($estado === "") {
        throw new Exception("O estado (UF) é obrigatório.");
    }

    // =========================
    // VERIFICAR E-MAIL DUPLICADO
    // =========================

    $sqlEmail = "
        SELECT id_cliente
        FROM cliente
        WHERE e_mail = :email
        LIMIT 1
    ";

    $stmtEmail = $conexao->prepare($sqlEmail);
    $stmtEmail->execute([
        ":email" => $email
    ]);

    if ($stmtEmail->fetch(PDO::FETCH_ASSOC)) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    // =========================
    // HASH DA SENHA
    // =========================

    $senhaHash = password_hash($senha, PASSWORD_DEFAULT);

    // =========================
    // INICIAR TRANSAÇÃO
    // =========================

    $conexao->beginTransaction();

    // =========================
    // CADASTRAR CLIENTE
    // =========================

    $sqlCliente = "
        INSERT INTO cliente
        (
            nome,
            e_mail,
            senha,
            telefone
        )
        VALUES
        (
            :nome,
            :email,
            :senha,
            :telefone
        )
        RETURNING id_cliente
    ";

    $stmtCliente = $conexao->prepare($sqlCliente);
    $stmtCliente->execute([
        ":nome" => $nome,
        ":email" => $email,
        ":senha" => $senhaHash,
        ":telefone" => $telefone
    ]);

    $idCliente = (int) $stmtCliente->fetchColumn();

    if (!$idCliente) {
        throw new Exception("Erro ao obter ID do cliente gerado.");
    }

    // =========================
    // CADASTRAR ENDEREÇO
    // =========================

    $sqlEndereco = "
        INSERT INTO endereco
        (
            id_cliente,
            cep,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        )
        VALUES
        (
            :id_cliente,
            :cep,
            :endereco,
            :numero,
            :complemento,
            :bairro,
            :cidade,
            :estado
        )
    ";

    $stmtEndereco = $conexao->prepare($sqlEndereco);
    $stmtEndereco->execute([
        ":id_cliente" => $idCliente,
        ":cep" => $cep,
        ":endereco" => $rua,
        ":numero" => $numero,
        ":complemento" => $complemento,
        ":bairro" => $bairro,
        ":cidade" => $cidade,
        ":estado" => $estado
    ]);

    // =========================
    // CONFIRMAR TRANSAÇÃO
    // =========================

    $conexao->commit();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Cadastro realizado com sucesso!",
        "id_cliente" => $idCliente
    ]);

} catch (Throwable $e) {

    // Desfaz alterações no banco de dados se houver falhas
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => $e->getMessage()
    ]);
}
