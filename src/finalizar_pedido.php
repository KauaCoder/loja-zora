<?php
declare(strict_types=1);

/* =========================================================
   ZORA - PROCESSAMENTO DE VENDA / PEDIDO (Supabase / PostgreSQL)
   Localização: src/finalizar_pedido.php

   SEGURANÇA:
   - Só finaliza compra com SESSÃO de login válida no servidor.
   - O id do cliente vem SEMPRE da sessão (nunca do JSON enviado).
   - Preço e estoque são sempre lidos do banco (nunca do front-end).
   ========================================================= */

/** Erro com mensagem segura para mostrar ao cliente. */
class ErroNegocio extends Exception
{
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header('Pragma: no-cache');
header('Vary: Origin');

// Lista de origens permitidas (CORS)
$origensPermitidas = [
    'https://loja-zora.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

$origem = $_SERVER['HTTP_ORIGIN'] ?? null;
$origemPermitida = ($origem !== null && in_array($origem, $origensPermitidas, true)) || $origem === null;

if ($origem !== null && !$origemPermitida) {
    http_response_code(403);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Origem não autorizada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($origem !== null && $origemPermitida) {
    header('Access-Control-Allow-Origin: ' . $origem);
} else {
    header('Access-Control-Allow-Origin: https://loja-zora.onrender.com');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratamento de Preflight CORS (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? 'GET') !== "POST") {
    header('Allow: POST, OPTIONS');
    http_response_code(405);
    echo json_encode(["sucesso" => false, "mensagem" => "Método não permitido."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Suporte a HTTPS no Proxy Reverso do Render
$httpsDireto = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' &&
    strtolower((string) $_SERVER['HTTPS']) !== 'off';
$protoEncaminhado = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
$isHttps = $httpsDireto || $protoEncaminhado === 'https';

if ($isHttps) {
    $_SERVER['HTTPS'] = 'on';
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_trans_sid', '0');

    session_set_cookie_params([
        'lifetime' => 86400,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $isHttps ? 'None' : 'Lax',
    ]);

    session_start();
}

// =========================================================
// EXIGE LOGIN: o id do cliente vem SOMENTE da sessão
// =========================================================
$idSessao = $_SESSION["id_cliente"] ?? $_SESSION["cliente_id"] ?? $_SESSION["usuario_id"] ?? null;
$idCliente = is_scalar($idSessao) ? (int) $idSessao : 0;

// Libera o arquivo de sessão o quanto antes (não precisamos mais gravar nela)
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

if ($idCliente <= 0) {
    http_response_code(401);
    echo json_encode([
        "sucesso"  => false,
        "login"    => true,
        "mensagem" => "Faça login para finalizar a compra."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Localiza conexao.php no mesmo diretório
$caminhoConexao = __DIR__ . '/conexao.php';

if (!file_exists($caminhoConexao)) {
    error_log('ZORA: conexao.php não encontrado em finalizar_pedido.php');
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro interno de configuração."], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $caminhoConexao;

try {
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new RuntimeException('A conexão PDO não foi inicializada corretamente.');
    }

    $conteudo = file_get_contents("php://input");
    $dados = json_decode((string) $conteudo, true);

    if (!is_array($dados)) {
        throw new ErroNegocio("Dados da venda inválidos.");
    }

    $itens = $dados["itens"] ?? [];
    $dadosEndereco = $dados["endereco"] ?? null;

    // Forma de pagamento: apenas letras/underscore (evita lixo no banco)
    $formaPagamento = strtolower(trim((string) ($dados["forma_pagamento"] ?? 'pix')));
    if (!preg_match('/^[a-z_]{2,30}$/', $formaPagamento)) {
        throw new ErroNegocio("Forma de pagamento inválida.");
    }

    // Define o status dinâmico
    if (in_array($formaPagamento, ['pix', 'cartao', 'cartao_credito'], true)) {
        $statusPedido = 'Aprovado';
    } else {
        $statusPedido = 'Pendente';
    }

    if (!is_array($itens) || empty($itens)) {
        throw new ErroNegocio("O carrinho está vazio.");
    }

    // Junta linhas repetidas do mesmo produto (evita burlar a checagem de estoque)
    $quantidadesPorProduto = [];
    foreach ($itens as $item) {
        if (!is_array($item)) {
            throw new ErroNegocio("Produto inválido no carrinho.");
        }

        $idProduto = (int) ($item["id_produto"] ?? 0);
        $quantidade = (int) ($item["quantidade"] ?? 0);

        if ($idProduto <= 0 || $quantidade <= 0 || $quantidade > 1000) {
            throw new ErroNegocio("Produto inválido no carrinho.");
        }

        $quantidadesPorProduto[$idProduto] = ($quantidadesPorProduto[$idProduto] ?? 0) + $quantidade;
    }

    // Ordem fixa evita deadlock entre compras simultâneas
    ksort($quantidadesPorProduto);

    // Inicia a transação no PostgreSQL
    $conexao->beginTransaction();

    // 0. Confirma que o cliente da sessão realmente existe
    $stmtCliente = $conexao->prepare("SELECT 1 FROM public.cliente WHERE id_cliente = :id_cliente LIMIT 1");
    $stmtCliente->execute([":id_cliente" => $idCliente]);
    if (!$stmtCliente->fetchColumn()) {
        throw new ErroNegocio("Sua sessão expirou. Faça login novamente.");
    }

    // 1. Grava ou Atualiza o Endereço do Cliente se fornecido
    if ($dadosEndereco && is_array($dadosEndereco)) {
        $cep         = trim((string) ($dadosEndereco["cep"] ?? ""));
        $rua         = trim((string) ($dadosEndereco["rua"] ?? $dadosEndereco["endereco"] ?? ""));
        $numero      = trim((string) ($dadosEndereco["numero"] ?? ""));
        $complemento = trim((string) ($dadosEndereco["complemento"] ?? ""));
        $bairro      = trim((string) ($dadosEndereco["bairro"] ?? ""));
        $cidade      = trim((string) ($dadosEndereco["cidade"] ?? ""));
        $estado      = strtoupper(trim((string) ($dadosEndereco["estado"] ?? "")));

        if ($cep !== "" && $rua !== "" && $numero !== "" && $bairro !== "" && $cidade !== "" && $estado !== "") {
            $stmtVerificaEnd = $conexao->prepare("SELECT id_endereco FROM endereco WHERE id_cliente = :id_cliente LIMIT 1");
            $stmtVerificaEnd->execute([":id_cliente" => $idCliente]);
            $existeEnd = $stmtVerificaEnd->fetch(PDO::FETCH_ASSOC);

            if ($existeEnd) {
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

    // 2. Valida produtos, estoque e calcula o valor total (preço SEMPRE do banco)
    $stmtProduto = $conexao->prepare("SELECT id_produto, nm_produto, preco, qtd_item FROM produto WHERE id_produto = :id_produto FOR UPDATE");

    $itensValidados = [];
    $valorTotal = 0.0;

    foreach ($quantidadesPorProduto as $idProduto => $quantidade) {
        $stmtProduto->execute([":id_produto" => $idProduto]);
        $produto = $stmtProduto->fetch(PDO::FETCH_ASSOC);

        if (!$produto) {
            throw new ErroNegocio("Produto ID {$idProduto} não encontrado.");
        }

        $estoque = (int) $produto["qtd_item"];
        if ($estoque < $quantidade) {
            throw new ErroNegocio('Estoque insuficiente para "' . $produto["nm_produto"] . '". Disponível: ' . $estoque);
        }

        $preco = (float) $produto["preco"];
        $subtotal = $preco * $quantidade;
        $valorTotal += $subtotal;

        $itensValidados[] = [
            "id_produto" => (int) $idProduto,
            "quantidade" => $quantidade,
            "preco"      => $preco,
            "subtotal"   => $subtotal
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
        throw new RuntimeException("Erro ao registrar a venda no banco de dados.");
    }

    // 4. Insere os itens da venda e desconta o estoque
    $stmtItem = $conexao->prepare("INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal) VALUES (:id_pedido, :id_produto, :quantidade, :preco_unitario, :subtotal)");
    $stmtEstoque = $conexao->prepare("UPDATE produto SET qtd_item = qtd_item - :quantidade WHERE id_produto = :id_produto AND qtd_item >= :quantidade_min");

    foreach ($itensValidados as $item) {
        $stmtItem->execute([
            ":id_pedido"      => $idPedido,
            ":id_produto"     => $item["id_produto"],
            ":quantidade"     => $item["quantidade"],
            ":preco_unitario" => $item["preco"],
            ":subtotal"       => $item["subtotal"]
        ]);

        $stmtEstoque->execute([
            ":quantidade"     => $item["quantidade"],
            ":quantidade_min" => $item["quantidade"],
            ":id_produto"     => $item["id_produto"]
        ]);

        if ($stmtEstoque->rowCount() !== 1) {
            throw new ErroNegocio("Estoque insuficiente. Atualize o carrinho e tente novamente.");
        }
    }

    // Confirma a transação
    $conexao->commit();

    http_response_code(200);
    echo json_encode([
        "sucesso"         => true,
        "mensagem"        => "Venda realizada com sucesso!",
        "id_pedido"       => (int) $idPedido,
        "status"          => $statusPedido,
        "forma_pagamento" => $formaPagamento,
        "valor_total"     => round($valorTotal, 2)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

} catch (ErroNegocio $erro) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => $erro->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    if (isset($conexao) && $conexao instanceof PDO && $conexao->inTransaction()) {
        $conexao->rollBack();
    }

    // Detalhes técnicos só no log do servidor, nunca para o cliente
    error_log('ZORA: falha em finalizar_pedido.php: ' . $erro->getMessage());

    http_response_code(500);
    echo json_encode([
        "sucesso"  => false,
        "mensagem" => "Não foi possível finalizar o pedido. Tente novamente."
    ], JSON_UNESCAPED_UNICODE);
}
