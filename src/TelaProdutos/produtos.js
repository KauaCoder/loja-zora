/* =========================================================
   ZORA - PRODUTOS (DETALHES + CARRINHO + MENU MOBILE)
   PostgreSQL + PHP + LocalStorage
========================================================= */

// =========================================================
// 0. MENU LATERAL & NAVEGAÇÃO MOBILE
// =========================================================

function showSidebar() {
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) {
        sidebar.style.display = "flex";
        sidebar.classList.add("ativo", "active");
    }
    if (overlay) {
        overlay.classList.add("ativo");
    }
}

function hideSidebar() {
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) {
        sidebar.style.display = "none";
        sidebar.classList.remove("ativo", "active");
    }
}

async function abrirPerfil() {
    let usuario = null;

    if (typeof obterUsuarioLogado === "function") {
        usuario = await obterUsuarioLogado();
    } else {
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                usuario = JSON.parse(dadosLocais);
            } catch (e) {
                usuario = null;
            }
        }
    }

    if (usuario && (usuario.nome || usuario.email || usuario.id_cliente)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";

        if (ehAdmin) {
            window.location.href = "/src/TelaAdmin/admin.html";
        } else {
            window.location.href = "/src/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

// =========================================================
// 1. DETALHES LOCAIS DOS PRODUTOS
// =========================================================

const detalhesProdutos = {
    1: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Malha", composicao: "96% Algodão 4% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    2: { tamanhos: ["34", "36", "38", "40", "42", "44"], tecido: "Jeans", composicao: "100% Algodão", marca: "ZORA", colecao: "Coleção ZORA" },
    3: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Microfibra", composicao: "68% Poliamida 25% Poliéster 7% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    4: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Poliéster", composicao: "97% Poliéster 3% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    5: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Poliamida", composicao: "Poliamida", marca: "ZORA", colecao: "Coleção ZORA" },
    6: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Chiffon", composicao: "100% Poliéster", marca: "ZORA", colecao: "Coleção ZORA" },
    7: { tamanhos: ["36", "38", "40", "42", "44", "46"], tecido: "Jeans", composicao: "100% Algodão", marca: "ZORA", colecao: "Coleção ZORA" },
    8: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Jeans e malha", composicao: "Composição conforme material da peça", marca: "ZORA", colecao: "Coleção ZORA" },
    9: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Malha", composicao: "Poliéster e Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    10: { tamanhos: ["P", "M", "G", "GG"], tecido: "Fleece", composicao: "Poliéster", marca: "ZORA", colecao: "Coleção ZORA" }
};

// =========================================================
// 2. PARÂMETROS DA URL E VARIÁVEIS
// =========================================================

const parametros = new URLSearchParams(window.location.search);
const idProduto = parametros.get("id");

let produto = null;
const detalhes = detalhesProdutos[idProduto] || {
    tamanhos: ["P", "M", "G"],
    tecido: "-",
    composicao: "-",
    marca: "ZORA",
    colecao: "Coleção ZORA"
};

let tamanhoSelecionado = null;

// =========================================================
// 3. CARREGAR PRODUTO DO POSTGRESQL (RESILIENTE)
// =========================================================

async function carregarProduto() {
    if (!idProduto) {
        mostrarProdutoNaoEncontrado();
        return;
    }

    try {
        // Tenta buscar no produtos_catalogo.php e filtrar pelo ID recebido na URL
        const resposta = await fetch("/produtos_catalogo.php");
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso || !Array.isArray(resultado.produtos)) {
            throw new Error("Não foi possível carregar a lista de produtos.");
        }

        produto = resultado.produtos.find(p => Number(p.id_produto) === Number(idProduto));

        if (!produto) {
            throw new Error("Produto não encontrado no catálogo.");
        }

        // Renderiza as informações na tela
        const elNome = document.getElementById("nomeProduto");
        if (elNome) elNome.textContent = produto.nome;

        const elPreco = document.getElementById("precoProduto");
        if (elPreco) {
            elPreco.textContent = `R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}`;
        }

        const imagem = document.getElementById("imagemProduto");
        if (imagem) {
            const nomeFoto = produto.imagem || `img${produto.id_produto}.jpeg`;
            imagem.src = `/img/${nomeFoto}`;
            imagem.alt = produto.nome;
            imagem.onerror = function () {
                this.onerror = null;
                this.src = "/img/Logo 1.png";
            };
        }

        const elDescricao = document.getElementById("descricaoProduto");
        if (elDescricao) elDescricao.textContent = produto.descricao || "Sem descrição disponível.";

        const elTecido = document.getElementById("tecidoProduto");
        if (elTecido) elTecido.textContent = detalhes.tecido;

        const elComposicao = document.getElementById("composicaoProduto");
        if (elComposicao) elComposicao.textContent = detalhes.composicao;

        const elMarca = document.getElementById("marcaProduto");
        if (elMarca) elMarca.textContent = detalhes.marca;

        const elColecao = document.getElementById("colecaoProduto");
        if (elColecao) elColecao.textContent = detalhes.colecao;

        document.title = `ZORA - ${produto.nome}`;

        carregarTamanhos();
        atualizarBotaoEstoque();

    } catch (erro) {
        console.error("Erro ao carregar produto:", erro);
        mostrarProdutoNaoEncontrado();
    }
}

function mostrarProdutoNaoEncontrado() {
    produto = null;

    const nome = document.getElementById("nomeProduto");
    const preco = document.getElementById("precoProduto");
    const descricao = document.getElementById("descricaoProduto");
    const botao = document.getElementById("botaoComprar");

    if (nome) nome.textContent = "Produto não encontrado";
    if (preco) preco.textContent = "";
    if (descricao) descricao.textContent = "Não foi possível carregar este produto.";
    if (botao) {
        botao.disabled = true;
        botao.textContent = "Produto indisponível";
    }
}

function atualizarBotaoEstoque() {
    const botao = document.getElementById("botaoComprar");
    if (!botao || !produto) return;

    const estoque = Number(produto.estoque) || 0;

    if (estoque <= 0) {
        botao.disabled = true;
        botao.textContent = "Produto esgotado";
        return;
    }

    botao.disabled = false;
    botao.textContent = "Adicionar ao carrinho";
}

function carregarTamanhos() {
    const container = document.getElementById("tamanhosProduto");
    if (!container) return;

    container.innerHTML = "";

    if (!detalhes.tamanhos || detalhes.tamanhos.length === 0) {
        container.textContent = "Tamanho único.";
        return;
    }

    detalhes.tamanhos.forEach(tamanho => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = tamanho;

        botao.addEventListener("click", function () {
            document.querySelectorAll("#tamanhosProduto button").forEach(item => {
                item.classList.remove("selecionado");
            });
            botao.classList.add("selecionado");
            tamanhoSelecionado = tamanho;
        });

        container.appendChild(botao);
    });
}

// =========================================================
// 4. CARRINHO DE COMPRAS
// =========================================================

let pedidosArray = [];

function carregarCarrinho() {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    if (carrinhoSalvo) {
        try {
            pedidosArray = JSON.parse(carrinhoSalvo);
            if (!Array.isArray(pedidosArray)) pedidosArray = [];
        } catch (e) {
            pedidosArray = [];
        }
    }
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
}

function adicionarAoCarrinho() {
    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    if (Number(produto.estoque) <= 0) {
        alert("Este produto está esgotado.");
        return;
    }

    if (!tamanhoSelecionado) {
        alert("Escolha um tamanho antes de comprar.");
        return;
    }

    const itemExistente = pedidosArray.find(p => Number(p.id_produto) === Number(produto.id_produto));
    const qtdAtual = itemExistente ? Number(itemExistente.quantidade) : 0;

    if (qtdAtual + 1 > Number(produto.estoque)) {
        alert("Você atingiu o limite disponível em estoque para este produto.");
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade = qtdAtual + 1;
        itemExistente.tamanho = tamanhoSelecionado;
    } else {
        pedidosArray.push({
            id_produto: Number(produto.id_produto),
            nome: produto.nome,
            preco: Number(produto.preco),
            tamanho: tamanhoSelecionado,
            imagem: produto.imagem ? `/img/${produto.imagem}` : "/img/Logo 1.png",
            quantidade: 1
        });
    }

    salvarCarrinho();
    alert("Produto adicionado ao carrinho com sucesso!");
}

// INICIALIZAÇÃO DA PÁGINA
document.addEventListener("DOMContentLoaded", function () {
    carregarCarrinho();
    carregarProduto();

    const botaoComprar = document.getElementById("botaoComprar");
    if (botaoComprar) {
        botaoComprar.addEventListener("click", adicionarAoCarrinho);
    }
});
