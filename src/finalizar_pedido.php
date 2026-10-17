<?php
/* =========================================================
   ZORA - PROCESSAMENTO DE VENDA / PEDIDO (Supabase / PostgreSQL)
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

// Localiza o conexao.php dinamicamente
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
    echo json_encode(["sucesso" => false, "mensagem" => "Erro de configuração: conexao.php não encontrado."], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminho_conexao;

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);
        echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        throw new Exception("Dados da venda inválidos.");
    }

    // Identificação do cliente resiliente (Sessão ou Payload JSON)
    $idCliente = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;
    if (!$idCliente && isset($dados["id_cliente"])) {
        $idCliente = (int)$dados["id_cliente"];
    }

    if (!$idCliente || $idCliente <= 0) {
        http_response_code(401);
        echo json_encode(["sucesso" => false, "mensagem" => "Sua sessão expirou. Faça login novamente."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idCliente = (int)$idCliente;
    $itens = $dados["itens"] ?? [];
    $dadosEndereco = $dados["endereco"] ?? null;
    $formaPagamento = strtolower(trim($dados["forma_pagamento"] ?? 'pix'));

    // Define o status dinâmico
    if (in_array($formaPagamento, ['pix', 'cartao', 'cartao_credito'])) {
        $statusPedido = 'Aprovado';
    } else {
        $statusPedido = 'Pendente';
    }

    if (!is_array($itens) || empty($itens)) {
        throw new Exception("O carrinho está vazio.");
    }

    // Inicia a transação no PostgreSQL
    $conexao->beginTransaction();

    // 1. Grava ou Atualiza o Endereço do Cliente se fornecido
    if ($dadosEndereco && is_array($dadosEndereco)) {
        $cep = trim($dadosEndereco["cep"] ?? "");
        $rua = trim($dadosEndereco["rua"] ?? $dadosEndereco["endereco"] ?? "");
        $numero = trim($dadosEndereco["numero"] ?? "");
        $complemento = trim($dadosEndereco["complemento"] ?? "");
        $bairro = trim($dadosEndereco["bairro"] ?? "");
        $cidade = trim($dadosEndereco["cidade"] ?? "");
        $estado = trim($dadosEndereco["estado"] ?? "");

        if ($cep !== "" && $rua !== "" && $numero !== "" && $bairro !== "" && $cidade !== "" && $estado !== "") {
            $stmtVerificaEnd = $conexao->prepare("SELECT id_endereco FROM endereco WHERE id_cliente = :id_cliente LIMIT 1");
            $stmtVerificaEnd->execute([":id_cliente" => $idCliente]);
            $existeEnd = $stmtVerificaEnd->fetch(PDO::FETCH_ASSOC);

            if ($existeEnd) {
                // Ajustado: alterado para gravar na coluna 'endereco' do Supabase
                $sqlUpEnd = "UPDATE endereco SET 
                                cep = :cep, 
                                endereco = :rua, 
                                numero = :numero, 
                                complemento = :complemento, 
                                bairro = :bairro, 
                                cidade = :cidade, 
                                estado = :estado 
                             WHERE id_cliente = :id_cliente";

                $conexao->prepare($sqlUpEnd)->execute([
                    ":cep"         => $cep,
                    ":rua"         => $rua,
                    ":numero"      => $numero,
                    ":complemento" => $complemento,
                    ":bairro"      => $bairro,
                    ":cidade"      => $cidade,
                    ":estado"      => $estado,
                    ":id_cliente"  => $idCliente
                ]);
            } else {
                // Ajustado: inserção utilizando a coluna 'endereco'
                $sqlInsEnd = "INSERT INTO endereco (id_cliente, cep, endereco, numero, complemento, bairro, cidade, estado) 
                              VALUES (:id_cliente, :cep, :rua, :numero, :complemento, :bairro, :cidade, :estado)";

                $conexao->prepare($sqlInsEnd)->execute([
                    ":id_cliente"  => $idCliente,
                    ":cep"         => $cep,
                    ":rua"         => $rua,
                    ":numero"      => $numero,
                    ":complemento" => $complemento,
                    ":bairro"      => $bairro,
                    ":cidade"      => $cidade,
                    ":estado"      => $estado
                ]);
            }
        }
    }

    // 2. Valida produtos, estoque e calcula o valor total
    $stmtProduto = $conexao->prepare("SELECT id_produto, nm_produto, preco, qtd_item FROM produto WHERE id_produto = :id_produto FOR UPDATE");
    
    $itensValidados = [];
    $valorTotal = 0;

    foreach ($itens as $item) {
        $idProduto = (int) ($item["id_produto"] ?? 0);
        $quantidade = (int) ($item["quantidade"] ?? 0);

        if ($idProduto <= 0 || $quantidade <= 0) {
            throw new Exception("Produto inválido no carrinho.");
        }

        $stmtProduto->execute([":id_produto" => $idProduto]);
        $produto = $stmtProduto->fetch(PDO::FETCH_ASSOC);

        if (!$produto) {
            throw new Exception("Produto ID {$idProduto} não encontrado.");
        }

        $estoque = (int)$produto["qtd_item"];
        if ($estoque < $quantidade) {
            throw new Exception('Estoque insuficiente para "' . $produto["nm_produto"] . '". Disponível: ' . $estoque);
        }

        $preco = (float)$produto["preco"];
        $subtotal = $preco * $quantidade;
        $valorTotal += $subtotal;

        $itensValidados[] = [
            "id_produto" => $idProduto,
            "quantidade" => $quantidade,
            "preco" => $preco,
            "subtotal" => $subtotal
        ];
    }

    // 3. Insere a Venda incluindo status e forma_pagamento
    $sqlPedido = "INSERT INTO pedido (id_cliente, data_pedido, valor_total, status, forma_pagamento) 
                  VALUES (:id_cliente, CURRENT_TIMESTAMP, :valor_total, :status, :forma_pagamento) 
                  RETURNING id_pedido";
                  
    $stmtPedido = $conexao->prepare($sqlPedido);
    $stmtPedido->execute([
        ":id_cliente"      => $idCliente,
        ":valor_total"     => round($valorTotal, 2),
        ":status"          => $statusPedido,
        ":forma_pagamento" => $formaPagamento
    ]);
    
    $idPedido = $stmtPedido->fetchColumn();
    if (!$idPedido) {
        throw new Exception("Erro ao registrar a venda no banco de dados.");
    }

    // 4. Insere os itens da venda e desconta o estoque
    $stmtItem = $conexao->prepare("INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal) VALUES (:id_pedido, :id_produto, :quantidade, :preco_unitario, :subtotal)");
    $stmtEstoque = $conexao->prepare("UPDATE produto SET qtd_item = qtd_item - :quantidade WHERE id_produto = :id_produto");

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

    // Confirma a transação
    $conexao->commit();

    echo json_encode([
        "sucesso" => true,
        "mensagem" => "Venda realizada com sucesso!",
        "id_pedido" => (int) $idPedido,
        "status" => $statusPedido,
        "forma_pagamento" => $formaPagamento,
        "valor_total" => round($valorTotal, 2)
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro [Linha " . $erro->getLine() . "]: " . $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
