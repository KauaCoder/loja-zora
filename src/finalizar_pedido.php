<?php
/* =========================================================
   ZORA - FINALIZAR PEDIDO (Com Bypass de Sessão + Endereço)
   ========================================================= */

$isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax'
    ]);
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");

// Inclui o arquivo de conexão garantindo o caminho correto
$caminhos_conexao = [
    __DIR__ . '/conexao.php',
    __DIR__ . '/src/conexao.php',
    __DIR__ . '/../conexao.php',
    __DIR__ . '/../../conexao.php'
];

$caminho_conexao = null;
foreach ($caminhos_conexao as $caminho) {
    if (file_exists($caminho)) {
        $caminho_conexao = $caminho;
        break;
    }
}

if (!$caminho_conexao) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro interno: conexao.php não encontrado."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {
    // =====================================================
    // VERIFICAR MÉTODO HTTP
    // =====================================================
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Método não permitido. Utilize POST."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =====================================================
    // RECEBER DADOS DO PAYLOAD JSON
    // =====================================================
    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        throw new Exception("Dados do pedido inválidos.");
    }

    // =====================================================
    // VERIFICAÇÃO RESILIENTE DE LOGIN (Sessão ou JSON)
    // =====================================================
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;

    if (!$idCliente && isset($dados["id_cliente"])) {
        $idCliente = (int) $dados["id_cliente"];
    }

    if (!$idCliente || $idCliente <= 0) {
        http_response_code(401);
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Sua sessão expirou. Faça login novamente."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int) $idCliente;
    $itens = $dados["itens"] ?? [];
    $dadosEndereco = $dados["endereco"] ?? null;

    if (!is_array($itens) || empty($itens)) {
        throw new Exception("O pedido não possui produtos.");
    }

    // =====================================================
    // INICIAR TRANSAÇÃO
    // =====================================================
    $conexao->beginTransaction();

    // =====================================================
    // SALVAR OU ATUALIZAR ENDEREÇO DO CLIENTE
    // =====================================================
    if ($dadosEndereco && is_array($dadosEndereco)) {
        $cep = trim($dadosEndereco["cep"] ?? "");
        $rua = trim($dadosEndereco["rua"] ?? $dadosEndereco["endereco"] ?? "");
        $numero = trim($dadosEndereco["numero"] ?? "");
        $complemento = trim($dadosEndereco["complemento"] ?? "");
        $bairro = trim($dadosEndereco["bairro"] ?? "");
        $cidade = trim($dadosEndereco["cidade"] ?? "");
        $estado = trim($dadosEndereco["estado"] ?? "");

        if ($cep !== "" && $rua !== "" && $numero !== "" && $bairro !== "" && $cidade !== "" && $estado !== "") {
            // Verifica se o cliente já tem endereço cadastrado
            $stmtVerificaEnd = $conexao->prepare("SELECT id_endereco FROM endereco WHERE id_cliente = :id_cliente LIMIT 1");
            $stmtVerificaEnd->execute([":id_cliente" => $idCliente]);
            $existeEnd = $stmtVerificaEnd->fetch(PDO::FETCH_ASSOC);

            if ($existeEnd) {
                // Atualiza o endereço existente
                $sqlUpEnd = "
                    UPDATE endereco 
                    SET cep = :cep, 
                        endereco = :rua, 
                        rua = :rua, 
                        numero = :numero, 
                        complemento = :complemento, 
                        bairro = :bairro, 
                        cidade = :cidade, 
                        estado = :estado 
                    WHERE id_cliente = :id_cliente
                ";
                $stmtUpEnd = $conexao->prepare($sqlUpEnd);
                $stmtUpEnd->execute([
                    ":cep" => $cep,
                    ":rua" => $rua,
                    ":numero" => $numero,
                    ":complemento" => $complemento,
                    ":bairro" => $bairro,
                    ":cidade" => $cidade,
                    ":estado" => $estado,
                    ":id_cliente" => $idCliente
                ]);
            } else {
                // Insere novo endereço vinculado à chave estrangeira id_cliente
                $sqlInsEnd = "
                    INSERT INTO endereco (id_cliente, cep, endereco, rua, numero, complemento, bairro, cidade, estado)
                    VALUES (:id_cliente, :cep, :rua, :rua, :numero, :complemento, :bairro, :cidade, :estado)
                ";
                $stmtInsEnd = $conexao->prepare($sqlInsEnd);
                $stmtInsEnd->execute([
                    ":id_cliente" => $idCliente,
                    ":cep" => $cep,
                    ":rua" => $rua,
                    ":numero" => $numero,
                    ":complemento" => $complemento,
                    ":bairro" => $bairro,
                    ":cidade" => $cidade,
                    ":estado" => $estado
                ]);
            }
        }
    }

    // =====================================================
    // BUSCAR PRODUTO NO BANCO (FOR UPDATE)
    // =====================================================
    $sqlProduto = "
        SELECT
            id_produto,
            nm_produto,
            preco,
            qtd_item
        FROM produto
        WHERE id_produto = :id_produto
        FOR UPDATE
    ";
    $stmtProduto = $conexao->prepare($sqlProduto);

    // =====================================================
    // VALIDAR PRODUTOS E CALCULAR TOTAL
    // =====================================================
    $itensValidados = [];
    $valorTotal = 0;

    foreach ($itens as $item) {
        $idProduto = (int) ($item["id_produto"] ?? 0);
        $quantidade = (int) ($item["quantidade"] ?? 0);

        if ($idProduto <= 0 || $quantidade <= 0) {
            throw new Exception("Produto inválido no pedido.");
        }

        $stmtProduto->execute([":id_produto" => $idProduto]);
        $produto = $stmtProduto->fetch(PDO::FETCH_ASSOC);

        if (!$produto) {
            throw new Exception("Produto de ID " . $idProduto . " não encontrado.");
        }

        $nomeProduto = $produto["nm_produto"];
        $preco = (float) $produto["preco"];
        $estoque = (int) $produto["qtd_item"];

        if ($estoque <= 0) {
            throw new Exception('O produto "' . $nomeProduto . '" está sem estoque.');
        }

        if ($quantidade > $estoque) {
            throw new Exception('Estoque insuficiente para "' . $nomeProduto . '". Disponível: ' . $estoque . '.');
        }

        $subtotal = $preco * $quantidade;
        $valorTotal += $subtotal;

        $itensValidados[] = [
            "id_produto" => $idProduto,
            "nome" => $nomeProduto,
            "quantidade" => $quantidade,
            "preco" => $preco,
            "subtotal" => $subtotal
        ];
    }

    // =====================================================
    // CRIAR REGISTRO NA TABELA PEDIDO
    // =====================================================
    $sqlPedido = "
        INSERT INTO pedido
        (
            id_cliente,
            data_pedido,
            valor_total,
            status
        )
        VALUES
        (
            :id_cliente,
            CURRENT_TIMESTAMP,
            :valor_total,
            'Pendente'
        )
        RETURNING id_pedido
    ";

    $stmtPedido = $conexao->prepare($sqlPedido);
    $stmtPedido->execute([
        ":id_cliente" => $idCliente,
        ":valor_total" => round($valorTotal, 2)
    ]);
    
    $idPedido = $stmtPedido->fetchColumn();

    if (!$idPedido) {
        throw new Exception("Não foi possível gerar o pedido no banco de dados.");
    }

    // =====================================================
    // PREPARAR ITENS E ATUALIZAÇÃO DE ESTOQUE
    // =====================================================
    $sqlItem = "
        INSERT INTO item_pedido
        (
            id_pedido,
            id_produto,
            quantidade,
            preco_unitario,
            subtotal
        )
        VALUES
        (
            :id_pedido,
            :id_produto,
            :quantidade,
            :preco_unitario,
            :subtotal
        )
    ";
    $stmtItem = $conexao->prepare($sqlItem);

    $sqlEstoque = "
        UPDATE produto
        SET qtd_item = qtd_item - :quantidade
        WHERE id_produto = :id_produto
    ";
    $stmtEstoque = $conexao->prepare($sqlEstoque);

    foreach ($itensValidados as $item) {
        $stmtItem->execute([
            ":id_pedido" => $idPedido,
            ":id_produto" => $item["id_produto"],
            ":quantidade" => $item["quantidade"],
            ":preco_unitario" => $item["preco"],
            ":subtotal" => $item["subtotal"]
        ]);

        $stmtEstoque->execute([
            ":quantidade" => $item["quantidade"],
            ":id_produto" => $item["id_produto"]
        ]);
    }

    // =====================================================
    // CONFIRMAR TRANSAÇÃO
    // =====================================================
    $conexao->commit();

    // =====================================================
    // RESPOSTA DE SUCESSO
    // =====================================================
    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Pedido realizado com sucesso!",
        "id_pedido" => (int) $idPedido,
        "valor_total" => round($valorTotal, 2)
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
