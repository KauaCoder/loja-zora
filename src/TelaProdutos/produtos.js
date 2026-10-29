// =====================================================
// ZORA - PÁGINA DO PRODUTO & INTEGRAÇÃO COM SITE/INDEX
// Sistema com Suporte a Subpastas de Imagens e Tratamento de Resiliência
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
    10: { tamanhos: ["P", "M", "G", "GG"], tecido: "Fleece", composicao: "Poliéster", marca: "ZORA", colecao: "Coleção ZORA" },
    
    // Produtos Cadastrados (11 ao 20 do Supabase)
    11: { tamanhos: ["P", "M", "G", "GG"], tecido: "Alfaiataria Premium", composicao: "95% Poliéster 5% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    12: { tamanhos: ["P", "M", "G", "GG"], tecido: "Linho Misto", composicao: "70% Viscose 30% Linho", marca: "ZORA", colecao: "Coleção ZORA" },
    13: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Tecido Fluido", composicao: "100% Poliéster", marca: "ZORA", colecao: "Coleção ZORA" },
    14: { tamanhos: ["36", "38", "40", "42", "44"], tecido: "Alfaiataria", composicao: "95% Poliéster 5% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    15: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Malha de Algodão", composicao: "96% Algodão 4% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    16: { tamanhos: ["36", "38", "40", "42", "44"], tecido: "Linho e Jeans", composicao: "70% Viscose 30% Linho e 100% Algodão", marca: "ZORA", colecao: "Coleção ZORA" },
    17: { tamanhos: ["P", "M", "G", "GG"], tecido: "Moletinho Confort", composicao: "50% Algodão 50% Poliéster", marca: "ZORA", colecao: "Coleção ZORA" },
    18: { tamanhos: ["P", "M", "G", "GG"], tecido: "Sintético Premium", composicao: "100% Poliéster com revestimento", marca: "ZORA", colecao: "Coleção ZORA" },
    19: { tamanhos: ["36", "38", "40", "42", "44"], tecido: "Malha Ribana e Jeans", composicao: "98% Algodão 2% Elastano", marca: "ZORA", colecao: "Coleção ZORA" },
    20: { tamanhos: ["PP", "P", "M", "G", "GG"], tecido: "Malha Canelada", composicao: "92% Viscose 8% Elastano", marca: "ZORA", colecao: "Coleção ZORA" }
};

const parametros = new URLSearchParams(window.location.search);
const idProduto = parametros.get("id");

let produto = null;

let detalhes = detalhesProdutos[idProduto] || {
    tamanhos: ["PP", "P", "M", "G", "GG"],
    tecido: "Algodão e Poliéster",
    composicao: "Composição Especial ZORA",
    marca: "ZORA",
    colecao: "Coleção ZORA"
};

let tamanhoSelecionado = null;

// Trata os caminhos de imagem aceitando /img/roupazora/, /img/ e URLs do proxy
function tratarCaminhoImagem(imgSrc, id) {
    if (!imgSrc || imgSrc.trim() === "" || imgSrc === "null" || imgSrc === "undefined") {
        return `/img/roupazora/img${id || 1}.jpeg`;
    }

    let src = imgSrc.trim();

    if (src.startsWith("/")) {
        return src;
    }

    if (src.startsWith("http://") || src.startsWith("https://")) {
        if (src.includes("susercontent.com") || src.includes("shopee") || src.includes("down-br")) {
            return `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
        }
        return src;
    }

    if (src.startsWith("roupazora/")) {
        return `/img/${src}`;
    }

    return `/img/roupazora/${src}`;
}

// Manipulador de erros na imagem com fallback em cascata
window.gerenciarFalhaImagem = function(imgElement, productId) {
    if (!imgElement) return;

    const tentativaAtual = Number(imgElement.dataset.tentativa || 0);
    imgElement.dataset.tentativa = tentativaAtual + 1;

    // Tentativa 1: Se falhou na pasta roupazora, busca na pasta /img/ raiz
    if (tentativaAtual === 0) {
        if (imgElement.src.includes("/img/roupazora/")) {
            const nomeArquivo = imgElement.src.split("/img/roupazora/").pop();
            imgElement.src = `/img/${nomeArquivo}`;
            return;
        }
    }

    // Tentativa 2: Busca por ID na pasta /img/roupazora/
    if (tentativaAtual === 1) {
        if (productId) {
            imgElement.src = `/img/roupazora/img${productId}.jpeg`;
            return;
        }
    }

    // Tentativa 3: Busca por ID na pasta /img/
    if (tentativaAtual === 2) {
        if (productId) {
            imgElement.src = `/img/img${productId}.jpeg`;
            return;
        }
    }

    // Tentativa Final: Logo ZORA
    imgElement.onerror = null;
    imgElement.src = "/img/Logo 1.png";
};


// =====================================================
// 3. CARREGAR DETALHES DO PRODUTO (BD POSTGRESQL / SUPABASE)
// =====================================================

async function carregarProduto() {
    if (!idProduto) {
        mostrarProdutoNaoEncontrado();
        return;
    }

    try {
        let resposta = await fetch("/produtos_catalogo.php", {
            headers: { "Accept": "application/json" }
        });

        if (!resposta.ok) {
            resposta = await fetch("../produtos_catalogo.php", {
                headers: { "Accept": "application/json" }
            });
        }

        const resultado = await resposta.json();

        if (!resultado || !resultado.sucesso || !Array.isArray(resultado.produtos)) {
            throw new Error("Não foi possível carregar o produto.");
        }

        const prodEncontrado = resultado.produtos.find(p => Number(p.id_produto) === Number(idProduto));

        if (!prodEncontrado) {
            throw new Error("Produto não encontrado.");
        }

        produto = {
            id_produto: Number(prodEncontrado.id_produto),
            nome: prodEncontrado.nm_produto || prodEncontrado.nome || "Produto ZORA",
            preco: Number(prodEncontrado.preco) || 0,
            estoque: prodEncontrado.qtd_item !== undefined ? Number(prodEncontrado.qtd_item) : Number(prodEncontrado.estoque || 0),
            categoria: prodEncontrado.categoria || "Geral",
            imagem: tratarCaminhoImagem(prodEncontrado.imagem, prodEncontrado.id_produto),
            descricao: prodEncontrado.descricao || "Peça exclusiva ZORA com modelagem e caimento impecáveis."
        };

        if (!detalhesProdutos[idProduto] && produto.categoria) {
            const catLower = String(produto.categoria).toLowerCase();
            if (catLower.includes("calça") || catLower.includes("saia") || catLower.includes("calcas") || catLower.includes("saias")) {
                detalhes.tamanhos = ["36", "38", "40", "42", "44"];
            }
        }

        const elNome = document.getElementById("nomeProduto");
        if (elNome) elNome.textContent = produto.nome;

        const elPreco = document.getElementById("precoProduto");
        if (elPreco) {
            elPreco.textContent = `R$ ${produto.preco.toFixed(2).replace(".", ",")}`;
        }

        const imagem = document.getElementById("imagemProduto");
        if (imagem) {
            imagem.src = produto.imagem;
            imagem.alt = produto.nome;
            imagem.onerror = function () {
                window.gerenciarFalhaImagem(this, produto.id_produto);
            };
        }

        const elDescricao = document.getElementById("descricaoProduto");
        if (elDescricao) elDescricao.textContent = produto.descricao;

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
        carregarAvaliacoes();

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

    if (produto.estoque <= 0) {
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
            window.gerenciarFalhaImagem(this, id);
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
            alert(`Quantidade máxima em estoque atingida (${estoqueBD} unidades).`);
            return;
        }
    }

    if (novaQuantidade <= 0) {
        removerPedido(indice);
        return;
    }

    item.quantidade = novaQuantidade;
    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function removerPedido(indice) {
    pedidosArray.splice(indice, 1);
    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function atualizarTotal() {
    const totalElemento = document.getElementById("total");
    if (totalElemento) {
        totalElemento.textContent = calcularTotal().toFixed(2).replace(".", ",");
    }
}

function atualizarBadge() {
    const badges = document.querySelectorAll(".badge-carrinho");
    const totalItens = pedidosArray.reduce((acc, p) => acc + (Number(p.quantidade) || 1), 0);

    badges.forEach(badge => {
        if (totalItens > 0) {
            badge.textContent = totalItens;
            badge.style.display = "inline-flex";
        } else {
            badge.textContent = "";
            badge.style.display = "none";
        }
    });
}

function abrirPedidos() {
    const pedidos = document.getElementById("Pedidos");
    const sidebar = obterSidebar();

    if (sidebar) sidebar.classList.remove("ativo", "active");

    if (pedidos) {
        pedidos.classList.add("ativo");
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

async function adicionarAoCarrinho() {
    if (!produto) {
        alert("Produto não disponível.");
        return;
    }

    if (detalhes.tamanhos && detalhes.tamanhos.length > 0 && !tamanhoSelecionado) {
        alert("Por favor, selecione um tamanho antes de adicionar ao carrinho.");
        return;
    }

    const estoqueBD = await obterEstoqueBD(produto.id_produto);
    const estoqueDisponivel = estoqueBD !== null ? estoqueBD : produto.estoque;

    const idProd = Number(produto.id_produto);
    const itemExistente = pedidosArray.find(p => Number(p.id_produto) === idProd && p.tamanho === tamanhoSelecionado);
    const quantidadeAtual = itemExistente ? (Number(itemExistente.quantidade) || 1) : 0;

    if (quantidadeAtual + 1 > estoqueDisponivel) {
        alert(`Não é possível adicionar mais unidades. Estoque disponível: ${estoqueDisponivel}.`);
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade = quantidadeAtual + 1;
    } else {
        pedidosArray.push({
            id_produto: idProd,
            nome: produto.nome,
            preco: produto.preco,
            imagem: produto.imagem,
            tamanho: tamanhoSelecionado,
            quantidade: 1
        });
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
    abrirPedidos();
}

function pagarPedido() {
    if (pedidosArray.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }
    window.location.href = "/TelaPagamento/pagamento.html";
}


// =====================================================
// 5. SISTEMA DE AVALIAÇÃO DO PRODUTO (TABELA AVALIA)
// =====================================================

let notaSelecionada = 0;

function inicializarBotoesEstrelas() {
    const botoesEstrelas = document.querySelectorAll("#estrelasEscolha button");

    botoesEstrelas.forEach(btn => {
        btn.addEventListener("click", function () {
            notaSelecionada = Number(this.getAttribute("data-nota"));
            atualizarEstrelasVisual();
        });

        btn.addEventListener("mouseover", function () {
            const notaHover = Number(this.getAttribute("data-nota"));
            destacarEstrelas(notaHover);
        });

        btn.addEventListener("mouseout", function () {
            destacarEstrelas(notaSelecionada);
        });
    });
}

function destacarEstrelas(qtd) {
    const botoesEstrelas = document.querySelectorAll("#estrelasEscolha button");
    botoesEstrelas.forEach(btn => {
        const notaBtn = Number(btn.getAttribute("data-nota"));
        if (notaBtn <= qtd) {
            btn.textContent = "★";
            btn.classList.add("ativa");
        } else {
            btn.textContent = "☆";
            btn.classList.remove("ativa");
        }
    });
}

function atualizarEstrelasVisual() {
    destacarEstrelas(notaSelecionada);
}

async function enviarAvaliacao() {
    if (!idProduto) {
        alert("Produto não identificado.");
        return;
    }

    if (notaSelecionada === 0) {
        alert("Por favor, selecione uma nota de 1 a 5 estrelas.");
        return;
    }

    const campoComentario = document.getElementById("comentario");
    const textoComentario = campoComentario ? campoComentario.value.trim() : "";

    let usuario = null;
    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            usuario = JSON.parse(dadosLocais);
        } catch (e) {
            usuario = null;
        }
    }

    const dadosEnviar = {
        id_produto: Number(idProduto),
        id_cliente: usuario ? (usuario.id_cliente || usuario.id || null) : null,
        nome_cliente: usuario ? (usuario.nome || usuario.email || "Cliente Anônimo") : "Cliente Anônimo",
        estrelas: notaSelecionada,
        comentario: textoComentario
    };

    try {
        const resposta = await fetch("/salvar_avaliacao.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(dadosEnviar)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.sucesso) {
            alert("Sua avaliação foi enviada com sucesso!");
            notaSelecionada = 0;
            atualizarEstrelasVisual();
            if (campoComentario) campoComentario.value = "";
            carregarAvaliacoes();
        } else {
            alert(resultado.mensagem || "Erro ao salvar a avaliação.");
        }
    } catch (erro) {
        console.error("Erro ao enviar avaliação:", erro);
        alert("Erro de conexão ao enviar avaliação.");
    }
}

async function carregarAvaliacoes() {
    if (!idProduto) return;

    try {
        const resposta = await fetch(`/obter_avaliacoes.php?id_produto=${idProduto}`);
        const resultado = await resposta.json();

        if (resposta.ok && resultado.sucesso) {
            renderizarAvaliacoes(resultado.avaliacoes || [], resultado.media || 0);
        }
    } catch (erro) {
        console.error("Erro ao carregar avaliações:", erro);
    }
}

function renderizarAvaliacoes(lista, media) {
    const elMedia = document.getElementById("mediaNota");
    const elEstrelasMedia = document.getElementById("estrelasMedia");
    const elQtd = document.getElementById("quantidadeAvaliacoes");
    const containerComentarios = document.getElementById("comentarios");

    if (elMedia) elMedia.textContent = Number(media).toFixed(1).replace(".", ",");
    if (elQtd) elQtd.textContent = `${lista.length} ${lista.length === 1 ? 'avaliação' : 'avaliações'}`;

    if (elEstrelasMedia) {
        const mediaArredondada = Math.round(Number(media));
        elEstrelasMedia.textContent = "★".repeat(mediaArredondada) + "☆".repeat(5 - mediaArredondada);
    }

    if (!containerComentarios) return;

    containerComentarios.innerHTML = "";

    if (lista.length === 0) {
        containerComentarios.innerHTML = `<p class="sem-avaliacoes">Ainda não existem avaliações para este produto.</p>`;
        return;
    }

    lista.forEach(item => {
        const divItem = document.createElement("div");
        divItem.className = "item-comentario";

        const estrelas = "★".repeat(item.estrelas) + "☆".repeat(5 - item.estrelas);
        const dataFormatada = item.data_avaliacao 
            ? new Date(item.data_avaliacao).toLocaleDateString("pt-BR") 
            : "";

        divItem.innerHTML = `
            <div class="topo-comentario">
                <strong>${item.nome_cliente || "Anônimo"}</strong>
                <span class="estrelas-item">${estrelas}</span>
                <small class="data-item">${dataFormatada}</small>
            </div>
            <p class="texto-comentario">${item.comentario || "<em>Sem comentário escrito.</em>"}</p>
        `;

        containerComentarios.appendChild(divItem);
    });
}


// =====================================================
// 6. INICIALIZAÇÃO DA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    checarEAtualizarMenu();
    carregarProduto();
    carregarCarrinho();
    inicializarBotoesEstrelas();

    const botaoComprar = document.getElementById("botaoComprar");
    if (botaoComprar) {
        botaoComprar.addEventListener("click", adicionarAoCarrinho);
    }
});
