<?php

header("Content-Type: application/json; charset=UTF-8");

// Tenta localizar conexao.php na raiz ou na pasta /src
$caminho_conexao = file_exists(__DIR__ . '/src/conexao.php') ? __DIR__ . '/src/conexao.php' : __DIR__ . '/conexao.php';
require_once $caminho_conexao;

try {

    // Recebe os dados enviados pelo JavaScript
    $dados = json_decode(file_get_contents("php://input"), true);

    if (!$dados) {
        throw new Exception("Dados inválidos.");
    }

    // =========================
    // DADOS DO CLIENTE
    // =========================

    $nome     = trim($dados["nome"] ?? "");
    $email    = strtolower(trim($dados["email"] ?? $dados["e_mail"] ?? ""));
    $telefone = trim($dados["telefone"] ?? "");
    $senha    = $dados["senha"] ?? "";

    // =========================
    // DADOS DO ENDEREÇO
    // =========================

    $endereco = $dados["endereco"] ?? [];

    $cep         = trim($endereco["cep"] ?? "");
    $rua         = trim($endereco["rua"] ?? $endereco["endereco"] ?? "");
    $numero      = trim($endereco["numero"] ?? "");
    $complemento = trim($endereco["complemento"] ?? "");
    $bairro      = trim($endereco["bairro"] ?? "");
    $cidade      = trim($endereco["cidade"] ?? "");
    $estado      = strtoupper(trim($endereco["estado"] ?? ""));

    // =========================
    // VALIDAÇÕES
    // =========================

    if ($nome === "")     throw new Exception("Nome é obrigatório.");
    if ($email === "")    throw new Exception("E-mail é obrigatório.");
    if ($senha === "" || strlen($senha) < 6) throw new Exception("A senha deve ter no mínimo 6 caracteres.");
    if ($cep === "")      throw new Exception("CEP é obrigatório.");
    if ($rua === "")      throw new Exception("Rua é obrigatória.");
    if ($numero === "")   throw new Exception("Número é obrigatório.");
    if ($bairro === "")   throw new Exception("Bairro é obrigatório.");
    if ($cidade === "")   throw new Exception("Cidade é obrigatória.");
    if ($estado === "")   throw new Exception("Estado é obrigatório.");

    // =========================
    // VERIFICAR E-MAIL
    // Tabela: cliente (sem aspas)
    // Coluna: "e-mail" (com aspas por conta do hífen)
    // =========================

    $sqlEmail = '
        SELECT id_cliente
        FROM cliente
        WHERE "e-mail" = :email
        LIMIT 1
    ';

    $stmtEmail = $conexao->prepare($sqlEmail);

    $stmtEmail->execute([
        ":email" => $email
    ]);

    if ($stmtEmail->fetch()) {
        throw new Exception("Este e-mail já está cadastrado.");
    }

    // =========================
    // HASH DA SENHA
    // =========================

    $senhaHash = password_hash(
        $senha,
        PASSWORD_DEFAULT
    );

    // =========================
    // INICIAR TRANSAÇÃO
    // =========================

    $conexao->beginTransaction();

    // =========================
    // CADASTRAR CLIENTE
    // =========================

    $sqlCliente = '
        INSERT INTO cliente
        (
            nome,
            "e-mail",
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
        throw new Exception("Não foi possível gerar o ID do cliente.");
    }

    // =========================
    // CADASTRAR ENDEREÇO
    // =========================

    $sqlEndereco = '
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
    ';

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

    // =========================
    // CONFIRMAR TRANSAÇÃO
    // =========================

    $conexao->commit();

    echo json_encode([
        "sucesso"    => true,
        "mensagem"   => "Cadastro realizado com sucesso!",
        "id_cliente" => $idCliente
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {

    // Se alguma coisa falhar, desfaz tudo
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    $msg = $e->getMessage();
    if (strpos($msg, "23505") !== false) {
        $msg = "Este e-mail já está cadastrado.";
    }

    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $msg
    ], JSON_UNESCAPED_UNICODE);

}
