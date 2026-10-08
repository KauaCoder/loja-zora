<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

require_once "conexao.php";

try {

    // =========================
    // VERIFICAR LOGIN
    // =========================

    if (!isset($_SESSION["id_cliente"])) {

        http_response_code(401);

        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Usuário não está logado."
        ]);

        exit;
    }


    // =========================
    // PEGAR ID PELA SESSÃO
    // =========================

    $idCliente =
        (int) $_SESSION["id_cliente"];


    // =========================
    // RECEBER DADOS
    // =========================

    $dados = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!$dados) {

        throw new Exception(
            "Dados inválidos."
        );
    }


    // =========================
    // DADOS DO ENDEREÇO
    // =========================

    $cep =
        trim($dados["cep"] ?? "");

    $rua =
        trim($dados["rua"] ?? "");

    $numero =
        trim($dados["numero"] ?? "");

    $complemento =
        trim($dados["complemento"] ?? "");

    $bairro =
        trim($dados["bairro"] ?? "");

    $cidade =
        trim($dados["cidade"] ?? "");

    $estado =
        trim($dados["estado"] ?? "");


    // =========================
    // VALIDAÇÃO
    // =========================

    if (
        !$cep ||
        !$rua ||
        !$numero ||
        !$bairro ||
        !$cidade ||
        !$estado
    ) {

        throw new Exception(
            "Preencha todos os campos obrigatórios."
        );
    }


    // =========================
    // VERIFICAR ENDEREÇO
    // =========================

    $sql = "
        SELECT id_endereco
        FROM endereco
        WHERE id_cliente = :id_cliente
        LIMIT 1
    ";

    $stmt =
        $conexao->prepare($sql);

    $stmt->execute([
        ":id_cliente" => $idCliente
    ]);

    $endereco =
        $stmt->fetch();


    // =========================
    // ATUALIZAR ENDEREÇO
    // =========================

    if ($endereco) {

        $sql = "
            UPDATE endereco
            SET
                cep = :cep,
                endereco = :endereco,
                numero = :numero,
                complemento = :complemento,
                bairro = :bairro,
                cidade = :cidade,
                estado = :estado

            WHERE id_cliente = :id_cliente
        ";

        $stmt =
            $conexao->prepare($sql);

        $stmt->execute([

            ":cep" =>
                $cep,

            ":endereco" =>
                $rua,

            ":numero" =>
                $numero,

            ":complemento" =>
                $complemento,

            ":bairro" =>
                $bairro,

            ":cidade" =>
                $cidade,

            ":estado" =>
                $estado,

            ":id_cliente" =>
                $idCliente
        ]);


    } else {

        // =========================
        // CRIAR ENDEREÇO
        // =========================

        $sql = "
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

        $stmt =
            $conexao->prepare($sql);

        $stmt->execute([

            ":id_cliente" =>
                $idCliente,

            ":cep" =>
                $cep,

            ":endereco" =>
                $rua,

            ":numero" =>
                $numero,

            ":complemento" =>
                $complemento,

            ":bairro" =>
                $bairro,

            ":cidade" =>
                $cidade,

            ":estado" =>
                $estado
        ]);
    }


    // =========================
    // RESPOSTA
    // =========================

    echo json_encode([

        "sucesso" => true,

        "mensagem" =>
            "Endereço atualizado com sucesso!"

    ]);

} catch (Throwable $erro) {

    http_response_code(500);

    echo json_encode([

        "sucesso" => false,

        "mensagem" =>
            $erro->getMessage()

    ]);
}