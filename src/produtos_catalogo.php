<?php
// ============================================================================
// ZORA - API DE CATÁLOGO DE PRODUTOS
// Descrição: Busca todos os produtos cadastrados na tabela public.produto
// ============================================================================

// 1. CONFIGURAÇÕES DE CABEÇALHO (HEADERS)
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Exibir erros no desenvolvimento para facilitar diagnósticos (se necessário)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// 2. VALIDAÇÃO DO MÉTODO HTTP
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "sucesso" => false,
        "erro_codigo" => "METODO_NAO_PERMITIDO",
        "mensagem" => "Método não permitido. Esta rota aceita apenas requisições GET."
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 3. BUSCA E CARREGAMENTO DO ARQUIVO DE CONEXÃO
$caminhos_conexao = [
    __DIR__ . '/src/conexao.php',
    __DIR__ . '/conexao.php',
    __DIR__ . '/../conexao.php',
    __DIR__ . '/../../conexao.php'
];

$caminho_encontrado = null;

foreach ($caminhos_conexao as $caminho) {
    if (file_exists($caminho)) {
        $caminho_encontrado = $caminho;
        break;
    }
}

if (!$caminho_encontrado) {
    http_response_code(500);
    echo json_encode([
        "sucesso" => false,
        "erro_codigo" => "CONEXAO_NAO_ENCONTRADA",
        "mensagem" => "Não foi possível localizar o arquivo conexao.php no servidor."
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

require_once $caminho_encontrado;

// 4. EXECUÇÃO DA CONSULTA SQL E TRATAMENTO DE ERROS
try {
    // Valida se a variável de conexão PDO foi inicializada corretamente
    if (!isset($conexao) || !($conexao instanceof PDO)) {
        throw new Exception("A variável \$conexao não foi definida ou não é uma instância válida do PDO.");
    }

    // Consulta SQL apontando explicitamente para public.produto (PostgreSQL/Supabase)
    $sql = 'SELECT * FROM public.produto ORDER BY id_produto ASC';

    $stmt = $conexao->prepare($sql);
    
    if (!$stmt->execute()) {
        $erroInfo = $stmt->errorInfo();
        throw new Exception("Falha ao executar a consulta SQL: " . ($erroInfo[2] ?? "Erro desconhecido"));
    }

    $dados_brutos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $produtos_formatados = [];

    // Mapeamento e higienização dos campos retornados do banco de dados
    foreach ($dados_brutos as $produto) {
        $id = $produto["id_produto"] ?? $produto["id"] ?? 0;
        $nome = $produto["nm_produto"] ?? $produto["nome"] ?? $produto["nome_produto"] ?? "Produto ZORA";
        $preco = $produto["preco"] ?? $produto["valor"] ?? 0;
        $estoque = $produto["qtd_item"] ?? $produto["estoque"] ?? $produto["quantidade"] ?? $produto["qtd"] ?? 0;
        $categoria = $produto["categoria"] ?? "Geral";
        $imagem = $produto["imagem"] ?? $produto["foto"] ?? "Logo 1.png";
        $descricao = $produto["descricao"] ?? "Peça exclusiva ZORA com caimento e modelagem impecáveis.";

        $produtos_formatados[] = [
            "id_produto"  => (int) $id,
            "nome"        => (string) $nome,
            "nm_produto"  => (string) $nome,
            "preco"       => round((float) $preco, 2),
            "estoque"     => (int) $estoque,
            "qtd_item"    => (int) $estoque,
            "categoria"   => (string) $categoria,
            "imagem"      => (string) $imagem,
            "descricao"   => (string) $descricao
        ];
    }

    // Retorno de sucesso em formato JSON
    http_response_code(200);
    echo json_encode([
        "sucesso"  => true,
        "total"    => count($produtos_formatados),
        "produtos" => $produtos_formatados
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    // Tratamento de erro específico do Banco de Dados
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_BANCO_DADOS",
        "mensagem"    => "Erro de banco de dados: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    // Tratamento de erros genéricos
    http_response_code(500);
    echo json_encode([
        "sucesso"     => false,
        "erro_codigo" => "ERRO_SERVIDOR",
        "mensagem"    => "Erro no servidor: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>
