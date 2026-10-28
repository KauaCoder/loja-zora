// =====================================================
// ZORA - PÁGINA DO PRODUTO & INTEGRAÇÃO COM SITE/INDEX
// =====================================================

// =====================================================
// 1. MENU LATERAL & OVERLAY (MOBILE)
// =====================================================

function obterSidebar() {
    return document.getElementById("sidebar") || document.querySelector(".sidebar");
}

function obterOverlay() {
    return document.getElementById("overlay") || document.querySelector(".overlay");
}

function sincronizarOverlay() {
    const sidebar = obterSidebar();
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");

    const menuAberto = sidebar && (
        sidebar.classList.contains("ativo") || sidebar.classList.contains("active")
    );

    const pedidosAberto = pedidos && pedidos.classList.contains("ativo");

    const algumPainelAberto = Boolean(menuAberto || pedidosAberto);

    if (overlay) {
        overlay.classList.toggle("ativo", algumPainelAberto);
    }

    // Impede a rolagem da página quando um painel está aberto.
    document.body.classList.toggle("painel-aberto", algumPainelAberto);
}

function showSidebar() {
    const sidebar = obterSidebar();

    if (!sidebar) {
        console.warn("ZORA: menu lateral não encontrado.");
        return;
    }

    // Apenas adiciona as classes. O CSS cuida do display e da animação.
    sidebar.classList.add("ativo", "active");
    sincronizarOverlay();
}

function hideSidebar() {
    const sidebar = obterSidebar();

    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    sincronizarOverlay();
}

function fecharTudo() {
    const sidebar = obterSidebar();
    const pedidos = document.getElementById("Pedidos");

    if (sidebar) sidebar.classList.remove("ativo", "active");
    if (pedidos) pedidos.classList.remove("ativo");

    sincronizarOverlay();
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
            window.location.href = "/TelaAdmin/admin.html";
        } else {
            window.location.href = "/TelaCliente/cliente.html";
        }
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

async function checarEAtualizarMenu() {
    if (typeof atualizarMenuUsuario === "function") {
        await atualizarMenuUsuario();
        return;
    }

    let usuario = null;
    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            usuario = JSON.parse(dadosLocais);
        } catch (e) {
            usuario = null;
        }
    }

    const menuDesktop = document.getElementById("menuUsuario");
    const menuMobile = document.getElementById("menuUsuarioMobile");

    let texto = "Login";

    if (usuario && (usuario.nome || usuario.email)) {
        const ehAdmin = usuario.is_admin === true || usuario.is_admin === 1 || usuario.is_admin === "1" || usuario.nivel === "admin";

        if (ehAdmin) {
            texto = "Painel do adm";
        } else {
            const primeiroNome = usuario.nome ? usuario.nome.split(" ")[0] : "Perfil";
            texto = `Olá, ${primeiroNome}`;
        }
    }

    if (menuDesktop) menuDesktop.textContent = texto;
    if (menuMobile) menuMobile.textContent = texto;
}


// =====================================================
// 2. DETALHES COMPLEMENTARES DOS PRODUTOS
// =====================================================

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


// =====================================================
// 3. CARREGAR DETALHES DO PRODUTO (BD POSTGRESQL)
// =====================================================

async function carregarProduto() {
    if (!idProduto) {
        mostrarProdutoNaoEncontrado();
        return;
    }

    try {
        const resposta = await fetch("/produtos_catalogo.php", {
            headers: { "Accept": "application/json" }
        });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso || !Array.isArray(resultado.produtos)) {
            throw new Error("Não foi possível carregar o produto.");
        }

        produto = resultado.produtos.find(p => Number(p.id_produto) === Number(idProduto));

        if (!produto) {
            throw new Error("Produto não encontrado.");
        }

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
        if (elDescricao) elDescricao.textContent = produto.descricao || "Sem descrição informada.";

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


// =====================================================
// 4. LÓGICA DO CARRINHO COMPATÍVEL COM O INDEX
// =====================================================

let pedidosArray = [];

function carregarCarrinho() {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    if (!carrinhoSalvo) {
        pedidosArray = [];
    } else {
        try {
            const dados = JSON.parse(carrinhoSalvo);
            pedidosArray = Array.isArray(dados) ? dados : [];
        } catch (erro) {
            console.error("Erro ao carregar carrinho:", erro);
            pedidosArray = [];
        }
    }

    renderizarPedidos();
    atualizarBadge();
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
}

function calcularTotal() {
    return pedidosArray.reduce((total, p) => {
        const preco = Number(p.preco) || 0;
        const quantidade = Number(p.quantidade) || 1;
        return total + (preco * quantidade);
    }, 0);
}

function renderizarPedidos() {
    const lista = document.getElementById("listaPedidos");
    if (!lista) return;

    lista.innerHTML = "";

    if (pedidosArray.length === 0) {
        atualizarTotal();
        return;
    }

    pedidosArray.forEach((p, indice) => {
        const id = Number(p.id_produto);
        const preco = Number(p.preco) || 0;
        const quantidade = Number(p.quantidade) || 1;
        const imagemSrc = p.imagem || "/img/Logo 1.png";

        const item = document.createElement("li");
        item.className = "item-carrinho";

        const linkFoto = document.createElement("a");
        linkFoto.href = `/TelaProdutos/produtos.html?id=${id}`;
        linkFoto.className = "carrinho-foto-link";

        const foto = document.createElement("img");
        foto.src = imagemSrc;
        foto.alt = p.nome;
        foto.className = "carrinho-foto";
        foto.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo 1.png";
        };
        linkFoto.appendChild(foto);

        const detalhesDiv = document.createElement("div");
        detalhesDiv.className = "carrinho-detalhes";

        const linkNome = document.createElement("a");
        linkNome.href = `/TelaProdutos/produtos.html?id=${id}`;
        linkNome.className = "carrinho-nome";
        linkNome.textContent = p.tamanho ? `${p.nome} (${p.tamanho})` : p.nome;

        const precoUnitario = document.createElement("span");
        precoUnitario.className = "carrinho-preco-unitario";
        precoUnitario.textContent = `R$ ${preco.toFixed(2).replace(".", ",")}`;

        const qtdContainer = document.createElement("div");
        qtdContainer.className = "qtd-controle";

        const btnMenos = document.createElement("button");
        btnMenos.type = "button";
        btnMenos.className = "qtd-btn";
        btnMenos.textContent = "-";
        btnMenos.addEventListener("click", () => alterarQuantidade(indice, -1));

        const numQtd = document.createElement("span");
        numQtd.className = "qtd-numero";
        numQtd.textContent = quantidade;

        const btnMais = document.createElement("button");
        btnMais.type = "button";
        btnMais.className = "qtd-btn";
        btnMais.textContent = "+";
        btnMais.addEventListener("click", () => alterarQuantidade(indice, 1));

        qtdContainer.appendChild(btnMenos);
        qtdContainer.appendChild(numQtd);
        qtdContainer.appendChild(btnMais);

        detalhesDiv.appendChild(linkNome);
        detalhesDiv.appendChild(precoUnitario);
        detalhesDiv.appendChild(qtdContainer);

        const acoes = document.createElement("div");
        acoes.className = "carrinho-acoes";

        const subtotal = document.createElement("span");
        subtotal.className = "carrinho-subtotal";
        subtotal.textContent = `R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}`;

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "remover-item";
        btnRemover.innerHTML = "🗑";
        btnRemover.title = "Remover produto";
        btnRemover.addEventListener("click", () => removerPedido(indice));

        acoes.appendChild(subtotal);
        acoes.appendChild(btnRemover);

        item.appendChild(linkFoto);
        item.appendChild(detalhesDiv);
        item.appendChild(acoes);

        lista.appendChild(item);
    });

    atualizarTotal();
}

async function obterEstoqueBD(idProduto) {
    try {
        const resposta = await fetch(`/consultar_estoque.php?id=${idProduto}`);
        const resultado = await resposta.json();
        if (resposta.ok && resultado.sucesso) {
            return Number(resultado.estoque);
        }
    } catch (erro) {
        console.error("Erro ao verificar estoque:", erro);
    }
    return null;
}

async function alterarQuantidade(indice, delta) {
    const item = pedidosArray[indice];
    if (!item) return;

    const novaQuantidade = (Number(item.quantidade) || 1) + delta;

    if (delta > 0) {
        const estoqueBD = await obterEstoqueBD(item.id_produto);
        if (estoqueBD !== null && novaQuantidade > estoqueBD) {
            alert(`Quantidade máxima em estoque atingida (${estoqueBD} unidades disponíveis).`);
            return;
        }
    }

    item.quantidade = novaQuantidade;

    if (item.quantidade <= 0) {
        pedidosArray.splice(indice, 1);
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function removerPedido(indice) {
    if (indice < 0 || indice >= pedidosArray.length) return;
    pedidosArray.splice(indice, 1);
    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function atualizarTotal() {
    const total = calcularTotal();
    const elemento = document.getElementById("total");
    if (elemento) {
        elemento.textContent = total.toFixed(2).replace(".", ",");
    }
}

function atualizarBadge() {
    const quantidadeTotal = pedidosArray.reduce(
        (soma, p) => soma + (Number(p.quantidade) || 0), 0
    );

    document.querySelectorAll(".badge-carrinho").forEach(badge => {
        if (quantidadeTotal > 0) {
            badge.textContent = quantidadeTotal;
            badge.classList.add("show");
        } else {
            badge.textContent = "";
            badge.classList.remove("show");
        }
    });
}

function abrirPedidos() {
    const pedidos = document.getElementById("Pedidos");
    if (pedidos) {
        pedidos.classList.add("ativo");
    }

    // Fecha a sidebar se estiver aberta para não sobrepor o carrinho
    const sidebar = obterSidebar();
    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    sincronizarOverlay();
}

function fecharPedidos() {
    const pedidos = document.getElementById("Pedidos");
    if (pedidos) {
        pedidos.classList.remove("ativo");
    }
    
    sincronizarOverlay();
}

async function pagarPedido() {
    if (!pedidosArray || pedidosArray.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    if (typeof estaLogado === "function") {
        const logado = await estaLogado();
        if (!logado) {
            alert("Você precisa estar logado para fazer um pedido!");
            window.location.href = "/TelaLogin/login.html";
            return;
        }
    }

    const total = calcularTotal();
    localStorage.setItem("totalPedido", total.toFixed(2));
    localStorage.setItem("pedidos", JSON.stringify(pedidosArray));

    window.location.href = "/TelaEntrega/entrega.html";
}


// =====================================================
// 5. BOTÃO ADICIONAR AO CARRINHO (PÁGINA DO PRODUTO)
// =====================================================

async function adicionarAoCarrinhoPágina() {
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

    const estoqueDisponivel = await obterEstoqueBD(produto.id_produto) || Number(produto.estoque);

    if (qtdAtual + 1 > estoqueDisponivel) {
        alert(`Desculpe, apenas ${estoqueDisponivel} unidade(s) disponível(is) em estoque.`);
        return;
    }

    const imagemSrc = produto.imagem ? `/img/${produto.imagem}` : "/img/Logo 1.png";

    if (itemExistente) {
        itemExistente.quantidade = qtdAtual + 1;
        itemExistente.tamanho = tamanhoSelecionado; // Atualiza o tamanho se o usuário escolher um diferente
    } else {
        pedidosArray.push({
            id_produto: Number(produto.id_produto),
            nome: produto.nome,
            preco: Number(produto.preco),
            tamanho: tamanhoSelecionado,
            imagem: imagemSrc,
            quantidade: 1
        });
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
    abrirPedidos();
}


// =====================================================
// 6. INICIALIZAÇÃO DA PÁGINA DO PRODUTO
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    await checarEAtualizarMenu();
    carregarCarrinho();
    carregarProduto();

    const botaoComprar = document.getElementById("botaoComprar");
    if (botaoComprar) {
        botaoComprar.addEventListener("click", adicionarAoCarrinhoPágina);
    }

    // Associa o clique no fundo escuro para fechar o menu ou o carrinho
    const overlay = obterOverlay();
    if (overlay) {
        overlay.addEventListener("click", fecharTudo);
    }
});
