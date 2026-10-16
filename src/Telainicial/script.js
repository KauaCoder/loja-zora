// =====================================================
// ZORA - TELA INICIAL, CATÁLOGO E CARRINHO
// Versão Completa & Atualizada
// =====================================================


// =====================================================
// 1. MENU LATERAL, OVERLAY E PERFIL
// =====================================================

function obterSidebar() {
    return document.getElementById("sidebar")
        || document.querySelector(".sidebar");
}

function obterOverlay() {
    return document.getElementById("overlay")
        || document.querySelector(".overlay");
}

function sincronizarOverlay() {
    const sidebar = obterSidebar();
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");

    const menuAberto = sidebar && (
        sidebar.classList.contains("ativo")
        || sidebar.classList.contains("active")
    );

    const pedidosAberto = pedidos
        && pedidos.classList.contains("ativo");

    const algumPainelAberto = Boolean(
        menuAberto || pedidosAberto
    );

    if (overlay) {
        overlay.classList.toggle(
            "ativo",
            algumPainelAberto
        );
    }

    // Impede a rolagem da página quando um painel está aberto.
    document.body.classList.toggle(
        "painel-aberto",
        algumPainelAberto
    );
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

    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    if (pedidos) {
        pedidos.classList.remove("ativo");
    }

    sincronizarOverlay();
}

async function abrirPerfil() {
    let usuario = null;

    if (typeof obterUsuarioLogado === "function") {
        try {
            usuario = await obterUsuarioLogado();
        } catch (erro) {
            console.error("Erro ao obter usuário:", erro);
        }
    } else {
        try {
            usuario = JSON.parse(
                localStorage.getItem("usuarioLogado") || "null"
            );
        } catch (erro) {
            usuario = null;
        }
    }

    if (usuario && (
        usuario.nome
        || usuario.email
        || usuario.id_cliente
    )) {
        const ehAdmin =
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin";

        window.location.href = ehAdmin
            ? "/TelaAdmin/admin.html"
            : "/TelaCliente/cliente.html";

    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

async function checarEAtualizarMenu() {
    if (typeof atualizarMenuUsuario === "function") {
        try {
            await atualizarMenuUsuario();
            return;
        } catch (erro) {
            console.error("Erro ao atualizar menu:", erro);
        }
    }

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem("usuarioLogado") || "null"
        );
    } catch (erro) {
        usuario = null;
    }

    const menuDesktop = document.getElementById("menuUsuario");
    const menuMobile = document.getElementById("menuUsuarioMobile");

    let texto = "Login";

    if (usuario && (usuario.nome || usuario.email)) {
        const ehAdmin =
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin";

        if (ehAdmin) {
            texto = "📊 Dashboard Adm";
        } else {
            const primeiroNome = usuario.nome
                ? usuario.nome.split(" ")[0]
                : "Perfil";

            texto = `Olá, ${primeiroNome}`;
        }
    }

    if (menuDesktop) menuDesktop.textContent = texto;
    if (menuMobile) menuMobile.textContent = texto;
}


// =====================================================
// 2. CATÁLOGO DE PRODUTOS
// =====================================================

async function carregarCatalogo() {
    const container = document.getElementById("catalogoProdutos");

    if (!container) return;

    container.innerHTML =
        "<p class='carregando'>Carregando produtos...</p>";

    try {
        const resposta = await fetch("/produtos_catalogo.php", {
            headers: {
                "Accept": "application/json"
            }
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem
                || "Não foi possível carregar os produtos."
            );
        }

        renderizarCatalogo(resultado.produtos);

    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);

        container.innerHTML =
            "<p class='carregando'>" +
            "Não foi possível carregar os produtos no momento." +
            "</p>";
    }
}

function formatarPreco(valor) {
    const numero = Number(valor);

    return (Number.isFinite(numero) ? numero : 0)
        .toFixed(2)
        .replace(".", ",");
}

function obterImagemProduto(imagem) {
    if (!imagem) {
        return "/img/Logo%201.png";
    }

    if (/^(https?:\/\/|\/)/i.test(imagem)) {
        return imagem;
    }

    return "/img/" + encodeURIComponent(imagem);
}

function renderizarCatalogo(produtos) {
    const container = document.getElementById("catalogoProdutos");

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(produtos) || produtos.length === 0) {
        container.innerHTML =
            "<p class='carregando'>" +
            "Nenhum produto disponível no momento." +
            "</p>";
        return;
    }

    produtos.forEach(produto => {
        const id = Number(produto.id_produto);
        const nome = String(produto.nome || "Produto ZORA");
        const preco = Number(produto.preco);
        const estoque = Number(produto.estoque);

        if (!Number.isInteger(id) || id <= 0) {
            return;
        }

        const precoValido = Number.isFinite(preco) && preco >= 0 ? preco : 0;
        const estoqueValido = Number.isFinite(estoque) ? estoque : 0;
        const imagemSrc = obterImagemProduto(produto.imagem);

        const card = document.createElement("div");
        card.className = "produto";

        const link = document.createElement("a");
        link.href = "/TelaProdutos/produtos.html?id=" + encodeURIComponent(id);

        const imagem = document.createElement("img");
        imagem.src = imagemSrc;
        imagem.alt = nome;
        imagem.loading = "lazy";

        imagem.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo%201.png";
        };

        link.appendChild(imagem);

        const titulo = document.createElement("h3");
        titulo.textContent = nome;

        const precoElemento = document.createElement("p");
        precoElemento.textContent = `R$ ${formatarPreco(precoValido)}`;

        const botao = document.createElement("button");
        botao.type = "button";

        if (estoqueValido <= 0) {
            botao.textContent = "Esgotado";
            botao.disabled = true;
            botao.style.opacity = "0.6";
            botao.style.cursor = "not-allowed";
        } else {
            botao.textContent = "Comprar";

            botao.addEventListener("click", function () {
                adicionarPedidos(
                    id,
                    nome,
                    precoValido,
                    imagemSrc,
                    estoqueValido
                );
            });
        }

        card.appendChild(link);
        card.appendChild(titulo);
        card.appendChild(precoElemento);
        card.appendChild(botao);

        container.appendChild(card);
    });
}


// =====================================================
// 3. CARRINHO DE COMPRAS
// =====================================================

let pedidosArray = [];

function carregarCarrinho() {
    try {
        const carrinhoSalvo = localStorage.getItem("carrinho");

        if (!carrinhoSalvo) {
            pedidosArray = [];
        } else {
            const dados = JSON.parse(carrinhoSalvo);

            pedidosArray = Array.isArray(dados)
                ? dados.filter(produto => (
                    produto
                    && Number.isInteger(Number(produto.id_produto))
                    && Number(produto.id_produto) > 0
                )).map(produto => ({
                    ...produto,
                    id_produto: Number(produto.id_produto),
                    preco: Math.max(0, Number(produto.preco) || 0),
                    quantidade: Math.max(
                        1,
                        Math.floor(Number(produto.quantidade) || 1)
                    ),
                    nome: String(produto.nome || "Produto ZORA"),
                    imagem: produto.imagem || "/img/Logo%201.png",
                    estoque: Number.isFinite(Number(produto.estoque)) ? Number(produto.estoque) : Infinity
                }))
                : [];
        }

    } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);
        pedidosArray = [];
    }

    salvarCarrinho();
    renderizarPedidos();
    atualizarBadge();
}

function salvarCarrinho() {
    try {
        localStorage.setItem(
            "carrinho",
            JSON.stringify(pedidosArray)
        );
        return true;

    } catch (erro) {
        console.error("Erro ao salvar carrinho:", erro);

        alert(
            "Não foi possível salvar o carrinho neste dispositivo."
        );

        return false;
    }
}

function calcularTotal() {
    return pedidosArray.reduce((total, produto) => {
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 0;

        return total + preco * quantidade;
    }, 0);
}

function atualizarTotal() {
    const elemento = document.getElementById("total");

    if (elemento) {
        elemento.textContent = formatarPreco(calcularTotal());
    }
}

function atualizarBadge() {
    const quantidadeTotal = pedidosArray.reduce(
        (soma, produto) =>
            soma + (Number(produto.quantidade) || 0),
        0
    );

    document.querySelectorAll(".badge-carrinho").forEach(badge => {
        badge.textContent =
            quantidadeTotal > 0 ? quantidadeTotal : "";

        badge.classList.toggle("show", quantidadeTotal > 0);
    });
}

function renderizarPedidos() {
    const lista = document.getElementById("listaPedidos");

    atualizarTotal();

    if (!lista) {
        atualizarBadge();
        return;
    }

    lista.replaceChildren();

    if (pedidosArray.length === 0) {
        atualizarBadge();
        return;
    }

    pedidosArray.forEach((produto, indice) => {
        const id = Number(produto.id_produto);
        const preco = Number(produto.preco) || 0;
        const quantidade = Number(produto.quantidade) || 1;
        const imagemSrc = obterImagemProduto(produto.imagem);

        const item = document.createElement("li");
        item.className = "item-carrinho";

        const linkFoto = document.createElement("a");
        linkFoto.href =
            `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;
        linkFoto.className = "carrinho-foto-link";

        const foto = document.createElement("img");
        foto.src = imagemSrc;
        foto.alt = produto.nome;
        foto.className = "carrinho-foto";
        foto.loading = "lazy";

        foto.onerror = function () {
            this.onerror = null;
            this.src = "/img/Logo%201.png";
        };

        linkFoto.appendChild(foto);

        const detalhes = document.createElement("div");
        detalhes.className = "carrinho-detalhes";

        const linkNome = document.createElement("a");
        linkNome.href =
            `/TelaProdutos/produtos.html?id=${encodeURIComponent(id)}`;
        linkNome.className = "carrinho-nome";

        linkNome.textContent = produto.tamanho
            ? `${produto.nome} (${produto.tamanho})`
            : produto.nome;

        const precoUnitario = document.createElement("span");
        precoUnitario.className = "carrinho-preco-unitario";
        precoUnitario.textContent = `R$ ${formatarPreco(preco)}`;

        const qtdContainer = document.createElement("div");
        qtdContainer.className = "qtd-controle";

        const btnMenos = document.createElement("button");
        btnMenos.type = "button";
        btnMenos.className = "qtd-btn";
        btnMenos.textContent = "−";
        btnMenos.setAttribute("aria-label", "Diminuir quantidade");

        btnMenos.addEventListener("click", () => {
            alterarQuantidade(indice, -1);
        });

        const numQtd = document.createElement("span");
        numQtd.className = "qtd-numero";
        numQtd.textContent = quantidade;

        const btnMais = document.createElement("button");
        btnMais.type = "button";
        btnMais.className = "qtd-btn";
        btnMais.textContent = "+";
        btnMais.setAttribute("aria-label", "Aumentar quantidade");

        btnMais.addEventListener("click", () => {
            alterarQuantidade(indice, 1);
        });

        qtdContainer.append(
            btnMenos,
            numQtd,
            btnMais
        );

        detalhes.append(
            linkNome,
            precoUnitario,
            qtdContainer
        );

        const acoes = document.createElement("div");
        acoes.className = "carrinho-acoes";

        const subtotal = document.createElement("span");
        subtotal.className = "carrinho-subtotal";
        subtotal.textContent =
            `R$ ${formatarPreco(preco * quantidade)}`;

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "remover-item";
        btnRemover.textContent = "🗑";
        btnRemover.title = "Remover produto";
        btnRemover.setAttribute("aria-label", "Remover produto");

        btnRemover.addEventListener("click", () => {
            removerPedido(indice);
        });

        acoes.append(subtotal, btnRemover);

        item.append(
            linkFoto,
            detalhes,
            acoes
        );

        lista.appendChild(item);
    });

    atualizarTotal();
    atualizarBadge();
}

function adicionarPedidos(idProduto, nome, preco, imagem, estoqueDisponivel) {
    const id = Number(idProduto);
    const valor = Number(preco);

    if (
        !Number.isInteger(id)
        || id <= 0
        || !Number.isFinite(valor)
        || valor < 0
    ) {
        alert("Não foi possível adicionar este produto.");
        return;
    }

    const produtoExistente = pedidosArray.find(
        produto => Number(produto.id_produto) === id
    );

    const quantidadeAtual = produtoExistente
        ? Number(produtoExistente.quantidade) || 0
        : 0;

    const limiteEstoque = Number.isFinite(Number(estoqueDisponivel))
        ? Number(estoqueDisponivel)
        : (produtoExistente && Number.isFinite(Number(produtoExistente.estoque)) ? Number(produtoExistente.estoque) : Infinity);

    if (quantidadeAtual + 1 > limiteEstoque) {
        alert(`Estoque insuficiente. Disponíveis: ${limiteEstoque} unidade(s).`);
        return;
    }

    if (produtoExistente) {
        produtoExistente.quantidade = quantidadeAtual + 1;
    } else {
        pedidosArray.push({
            id_produto: id,
            nome: String(nome || "Produto ZORA"),
            preco: valor,
            imagem: imagem || "/img/Logo%201.png",
            quantidade: 1,
            estoque: limiteEstoque
        });
    }

    if (!salvarCarrinho()) {
        return;
    }

    renderizarPedidos();
    atualizarBadge();
    abrirPedidos();
}

function alterarQuantidade(indice, delta) {
    const produto = pedidosArray[indice];

    if (!produto) return;

    const quantidadeAtual = Number(produto.quantidade) || 1;
    const novaQuantidade = quantidadeAtual + delta;

    if (novaQuantidade <= 0) {
        removerPedido(indice);
        return;
    }

    if (delta > 0 && Number.isFinite(Number(produto.estoque))) {
        if (novaQuantidade > produto.estoque) {
            alert(`Quantidade máxima atingida. Disponíveis: ${produto.estoque} unidade(s).`);
            return;
        }
    }

    produto.quantidade = novaQuantidade;

    if (!salvarCarrinho()) return;

    renderizarPedidos();
    atualizarBadge();
}

function removerPedido(indice) {
    if (indice < 0 || indice >= pedidosArray.length) {
        return;
    }

    pedidosArray.splice(indice, 1);

    if (!salvarCarrinho()) return;

    renderizarPedidos();
    atualizarBadge();
}


// =====================================================
// 4. ABERTURA E FECHAMENTO DO CARRINHO
// =====================================================

function abrirPedidos() {
    const pedidos = document.getElementById("Pedidos");

    if (!pedidos) {
        console.warn("ZORA: painel de pedidos não encontrado.");
        return;
    }

    // Fecha a sidebar se estiver aberta para não sobrepor o carrinho
    const sidebar = obterSidebar();
    if (sidebar) {
        sidebar.classList.remove("ativo", "active");
    }

    pedidos.classList.add("ativo");

    sincronizarOverlay();
}

function fecharPedidos() {
    const pedidos = document.getElementById("Pedidos");

    if (pedidos) {
        pedidos.classList.remove("ativo");
    }

    sincronizarOverlay();
}


// =====================================================
// 5. FINALIZAÇÃO DO PEDIDO (ATUALIZADO E SEGURO)
// =====================================================

function pagarPedido() {
    if (pedidosArray.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    // Salva explicitamente os itens e o valor total no localStorage antes de avançar
    localStorage.setItem("carrinho", JSON.stringify(pedidosArray));
    localStorage.setItem("pedidos", JSON.stringify(pedidosArray));
    localStorage.setItem("totalPedido", calcularTotal());

    window.location.href = "/TelaEntrega/entrega.html";
}


// =====================================================
// 6. INICIALIZAÇÃO DA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    carregarCatalogo();
    carregarCarrinho();
    checarEAtualizarMenu();

    const overlay = obterOverlay();
    if (overlay) {
        overlay.addEventListener("click", fecharTudo);
    }
});
