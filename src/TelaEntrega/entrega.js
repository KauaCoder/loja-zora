// =====================================================
// CARREGAR PEDIDO E CARRINHO (Universal e Blindado)
// =====================================================

const totalPedidoStorage = localStorage.getItem("totalPedido");
let brutoStorage = localStorage.getItem("pedidos") || localStorage.getItem("carrinho");

// Se não achou nas chaves padrão, varre o localStorage à procura de qualquer indício de itens
if (!brutoStorage) {
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && (chave.toLowerCase().includes("carrinho") || chave.toLowerCase().includes("pedido") || chave.toLowerCase().includes("item"))) {
            const valor = localStorage.getItem(chave);
            if (valor && (valor.startsWith("[") || valor.startsWith("{"))) {
                brutoStorage = valor;
                break;
            }
        }
    }
}

let itensPedido = [];

if (brutoStorage) {
    try {
        const parsed = JSON.parse(brutoStorage);
        // Se estiver num formato de objeto que guarda os itens dentro (ex: { itens: [...] } ou { produtos: [...] })
        if (Array.isArray(parsed)) {
            itensPedido = parsed;
        } else if (parsed && typeof parsed === "object") {
            itensPedido = parsed.itens || parsed.produtos || parsed.carrinho || [];
        }
    } catch (erro) {
        console.error("Erro ao analisar carrinho:", erro);
        itensPedido = [];
    }
}

let totalPedido = Number(totalPedidoStorage) || 0;
if (totalPedido <= 0 && itensPedido.length > 0) {
    totalPedido = itensPedido.reduce((soma, item) => {
        const preco = Number(item.preco || item.valor_unitario) || 0;
        const qtd = Number(item.quantidade || item.qtd) || 1;
        return soma + (preco * qtd);
    }, 0);
    localStorage.setItem("totalPedido", totalPedido);
}

// Renderiza o resumo do pedido imediatamente assim que carregar
document.addEventListener("DOMContentLoaded", () => {
    renderizarResumo();
    carregarDadosClienteAutomatico(); // Puxa os dados do perfil e endereço salvos no banco
});
