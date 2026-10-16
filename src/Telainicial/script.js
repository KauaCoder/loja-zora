// =====================================================
// ZORA - TELA INICIAL, CATÁLOGO E CARRINHO
// Versão sem menu lateral
// =====================================================


// =====================================================
// 1. OVERLAY E PERFIL
// =====================================================

function obterOverlay() {
    return document.getElementById("overlay")
        || document.querySelector(".overlay");
}

function sincronizarOverlay() {
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");

    const pedidosAberto = pedidos && pedidos.classList.contains("ativo");

    if (overlay) {
        overlay.classList.toggle("ativo", Boolean(pedidosAberto));
    }

    // Impede a rolagem da página quando o carrinho está aberto.
    document.body.classList.toggle("painel-aberto", Boolean(pedidosAberto));
}

function fecharTudo() {
    const pedidos = document.getElementById("Pedidos");

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

    // Preserva URLs completas e caminhos já definidos.
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

        const precoValido =
            Number.isFinite(preco) && preco >= 0
                ? preco
                : 0;

        const estoqueValido =
            Number.isFinite(estoque) ? estoque : 0;

        const imagemSrc = obterImagemProduto(produto.imagem);

        const card = document.createElement("div");
        card.className = "produto";

        const link = document.createElement("a");
        link.href =
            "/TelaProdutos/produtos.html?id=" +
            encodeURIComponent(id);

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
        precoElemento.textContent =
            `R$ ${formatarPreco(precoValido)}`;

        const botao = document.createElement("button");
        botao.type = "button";

        if (estoqueValido <= 0) {
            botao.textContent = "Esgotado";
            botao.disabled = true;
            botao.style.opacity = "0.6";
            botao.style.cursor = "not-allowed";
        } else {
            botao.textContent = "Comprar";

            botao.addEventListener("click", async function () {
                botao.disabled = true;

                try {
                    await adicionarPedidos(
                        id,
                        nome,
                        precoValido,
                        imagemSrc
                    );
                } finally {
                    botao.disabled = false;
                }
            });
        }

        card.appendChild(link);
        card.appendChild(titulo);
        card.appendChild(precoElemento);
        card.appendChild(botao);

        container.appendChild(card);
    });
}

async function obterEstoqueBD(idProduto) {
    try {
        const resposta = await fetch(
            `/consultar_estoque.php?id=${encodeURIComponent(idProduto)}`,
            {
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem || "Falha ao consultar estoque."
            );
        }

        const estoque = Number(resultado.estoque);

        if (!Number.isFinite(estoque) || estoque < 0) {
            throw new Error("Estoque retornado inválido.");
        }

        return estoque;

    } catch (erro) {
        console.error(
            "Erro ao verificar estoque do produto:",
            idProduto,
            erro
        );

        // null significa que não foi possível confirmar o estoque.
        return null;
    }
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
                    imagem: produto.imagem || "/img/Logo%201.png"
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

        // Imagem do produto
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

        // Informações do produto
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

        // Controles de quantidade
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

        // Subtotal e remoção
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

async function adicionarPedidos(idProduto, nome, preco, imagem) {
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

    // Não permite adicionar sem conseguir confirmar o estoque.
    const estoque = await obterEstoqueBD(id);

    if (estoque === null) {
        alert(
            "Não foi possível verificar o estoque. " +
            "Tente novamente em instantes."
        );
        return;
    }

    if (quantidadeAtual + 1 > estoque) {
        alert(
            `Estoque insuficiente. Disponíveis: ${estoque} unidade(s).`
        );
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
            quantidade: 1
        });
    }

    if (!salvarCarrinho()) {
        return;
    }

    renderizarPedidos();
    atualizarBadge();
    abrirPedidos();
}

async function alterarQuantidade(indice, delta) {
    const produto = pedidosArray[indice];

    if (!produto) return;

    const quantidadeAtual = Number(produto.quantidade) || 1;
    const novaQuantidade = quantidadeAtual + delta;

    if (novaQuantidade <= 0) {
        removerPedido(indice);
        return;
    }

    if (delta > 0) {
        const estoque = await obterEstoqueBD(produto.id_produto);

        if (estoque === null) {
            alert(
                "Não foi possível verificar o estoque. " +
                "Tente novamente."
            );
            return;
        }

        if (novaQuantidade > estoque) {
            alert(
                `Quantidade máxima atingida. ` +
                `Disponíveis: ${estoque} unidade(s).`
            );
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
// 5. FINALIZAÇÃO DO PEDIDO
// =====================================================

async function pagarPedido() {
    if (pedidosArray.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    // Verifica novamente o estoque de cada produto.
    const produtosSemEstoque = [];
    let houveAjuste = false;

    for (let i = pedidosArray.length - 1; i >= 0; i--) {
        const item = pedidosArray[i];
        const estoqueBD = await obterEstoqueBD(item.id_produto);

        if (estoqueBD === null) {
            alert(
                "Não foi possível validar o estoque de todos os itens. " +
                "Por favor, tente novamente."
            );
            return;
        }

        if (estoqueBD <= 0) {
            produtosSemEstoque.push(item.nome);
            pedidosArray.splice(i, 1);
            houveAjuste = true;
        } else if (item.quantidade > estoqueBD) {
            item.quantidade = estoqueBD;
            houveAjuste = true;
        }
    }

    if (houveAjuste) {
        salvarCarrinho();
        renderizarPedidos();

        if (produtosSemEstoque.length > 0) {
            alert(
                "Alguns itens no seu carrinho esgotaram e foram removidos:\n- " +
                produtosSemEstoque.join("\n- ")
            );
        } else {
            alert(
                "A quantidade de alguns itens foi ajustada de acordo com o estoque disponível."
            );
        }

        if (pedidosArray.length === 0) {
            return;
        }
    }

    // Redireciona para a tela de checkout / pagamento
    window.location.href = "/TelaPagamento/pagamento.html";
}

// =====================================================
// INICIALIZAÇÃO DA PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Carrega os produtos do catálogo
    carregarCatalogo();

    // 2. Restaura os itens salvos no carrinho
    carregarCarrinho();

    // 3. Atualiza o estado do botão/texto de login
    checarEAtualizarMenu();

    // 4. Associa o clique do fundo escuro (overlay) para fechar o carrinho
    const overlay = obterOverlay();
    if (overlay) {
        overlay.addEventListener("click", fecharTudo);
    }
});
