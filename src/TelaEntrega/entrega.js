// =====================================================
// CARREGAR PEDIDO (Com suporte universal a chaves do carrinho)
// =====================================================

const totalPedidoStorage = localStorage.getItem("totalPedido");
let pedidosSalvos = localStorage.getItem("pedidos") || localStorage.getItem("carrinho");

// Fallback de segurança: se não encontrou nas chaves padrão, tenta procurar por qualquer chave parecida ou itens globais
if (!pedidosSalvos) {
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && (chave.toLowerCase().includes("carrinho") || chave.toLowerCase().includes("pedido"))) {
            const valor = localStorage.getItem(chave);
            if (valor && valor.startsWith("[")) {
                pedidosSalvos = valor;
                break;
            }
        }
    }
}

let itensPedido = [];

if (pedidosSalvos) {
    try {
        itensPedido = JSON.parse(pedidosSalvos);
    } catch (erro) {
        console.error("Erro ao carregar pedido:", erro);
        itensPedido = [];
    }
}

// Se o total não estava salvo mas temos itens, calcula automaticamente o total na hora
let totalPedido = Number(totalPedidoStorage) || 0;
if (totalPedido <= 0 && itensPedido.length > 0) {
    totalPedido = itensPedido.reduce((soma, item) => {
        const preco = Number(item.preco) || 0;
        const qtd = Number(item.quantidade) || 1;
        return soma + (preco * qtd);
    }, 0);
    localStorage.setItem("totalPedido", totalPedido);
}
