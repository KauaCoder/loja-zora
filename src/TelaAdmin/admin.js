// =====================================================
// ZORA - PAINEL ADMINISTRATIVO
// =====================================================

let produtosAdmin = [];
const TELEFONE_ADMIN_WHATSAPP = "5521976442535"; // Insira aqui o número do ADM com DDD

// =====================================================
// CARREGAR DADOS
// =====================================================

async function carregarDadosAdmin() {
    const tabela = document.getElementById("tabelaProdutos");

    try {
        const resposta = await fetch("/admin_dados.php", {
            method: "GET",
            cache: "no-store",
            credentials: "include"
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Erro ao carregar os produtos.");
        }

        produtosAdmin = Array.isArray(resultado.produtos) ? resultado.produtos : [];

        carregarCategorias();
        atualizarResumo();
        aplicarFiltros();

    } catch (erro) {
        console.error("Erro no painel administrativo:", erro);

        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="8" class="erro-tabela">
                        Não foi possível carregar os produtos.
                    </td>
                </tr>
            `;
        }
    }
}

// =====================================================
// CATEGORIAS
// =====================================================

function carregarCategorias() {
    const select = document.getElementById("filtroCategoria");
    if (!select) return;

    const valorAtual = select.value;

    select.innerHTML = `<option value="">Todas as categorias</option>`;

    const categorias = [
        ...new Set(produtosAdmin.map(p => p.categoria).filter(Boolean))
    ].sort();

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        select.appendChild(option);
    });

    if (categorias.includes(valorAtual)) {
        select.value = valorAtual;
    }
}

// =====================================================
// RESUMO (REGRA DOS 40%)
// =====================================================

function atualizarResumo() {
    const totalProdutos = produtosAdmin.length;

    const totalUnidades = produtosAdmin.reduce(
        (total, p) => total + (Number(p.qtd_item) || 0),
        0
    );

    // Considera estoque baixo quando for <= 40% do estoque máximo
    const estoqueBaixo = produtosAdmin.filter(p => {
        const quantidade = Number(p.qtd_item) || 0;
        const maximo = Number(p.qtd_max_produto) || 100;

        if (quantidade <= 0) return false;

        const percentual = (quantidade / maximo) * 100;
        return percentual <= 40;
    }).length;

    const esgotados = produtosAdmin.filter(
        p => Number(p.qtd_item) <= 0
    ).length;

    definirTexto("totalProdutos", totalProdutos);
    definirTexto("totalUnidades", totalUnidades);
    definirTexto("totalEstoqueBaixo", estoqueBaixo);
    definirTexto("totalEsgotados", esgotados);
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// =====================================================
// FILTROS
// =====================================================

function aplicarFiltros() {
    const pesquisa = document.getElementById("pesquisaProduto");
    const categoria = document.getElementById("filtroCategoria");

    const texto = pesquisa ? pesquisa.value.trim().toLowerCase() : "";
    const categoriaSelecionada = categoria ? categoria.value : "";

    const produtosFiltrados = produtosAdmin.filter(produto => {
        const nome = String(produto.nome || "").toLowerCase();
        const correspondeNome = nome.includes(texto);
        const correspondeCategoria =
            categoriaSelecionada === "" || produto.categoria === categoriaSelecionada;

        return correspondeNome && correspondeCategoria;
    });

    renderizarProdutos(produtosFiltrados);
}

// =====================================================
// RENDERIZAR PRODUTOS
// =====================================================

function renderizarProdutos(produtos) {
    const tabela = document.getElementById("tabelaProdutos");
    if (!tabela) return;

    tabela.innerHTML = "";

    definirTexto(
        "quantidadeResultados",
        `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`
    );

    if (produtos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="8" class="sem-resultados">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;
        return;
    }

    produtos.forEach(produto => {
        const linha = document.createElement("tr");

        // PRODUTO
        const colunaProduto = document.createElement("td");
        const produtoInfo = document.createElement("div");
        produtoInfo.className = "produto-info";

        const imagem = document.createElement("img");
        if (produto.imagem) {
            imagem.src = `/img/${produto.imagem}`;
        }
        imagem.alt = produto.nome || "Produto";

        const textoProduto = document.createElement("div");
        const nome = document.createElement("strong");
        nome.textContent = produto.nome;

        const codigo = document.createElement("small");
        codigo.textContent = `Código #${produto.id_produto}`;

        textoProduto.appendChild(nome);
        textoProduto.appendChild(codigo);
        produtoInfo.appendChild(imagem);
        produtoInfo.appendChild(textoProduto);
        colunaProduto.appendChild(produtoInfo);

        // CATEGORIA
        const colunaCategoria = document.createElement("td");
        colunaCategoria.textContent = produto.categoria || "-";

        // PREÇO
        const colunaPreco = document.createElement("td");
        colunaPreco.textContent = formatarMoeda(produto.preco);

        // ESTOQUE
        const quantidade = Number(produto.qtd_item) || 0;
        const maximo = Number(produto.qtd_max_produto) || 100;

        const colunaEstoque = document.createElement("td");
        const estoqueTexto = document.createElement("strong");
        estoqueTexto.textContent = maximo > 0 ? `${quantidade} / ${maximo}` : quantidade;
        colunaEstoque.appendChild(estoqueTexto);

        // FORNECEDOR
        const colunaFornecedor = document.createElement("td");
        colunaFornecedor.textContent = produto.fornecedor || "Não cadastrado";

        // CONTATO
        const colunaContato = document.createElement("td");
        colunaContato.textContent = produto.contato || "-";

        // STATUS
        const colunaStatus = document.createElement("td");
        colunaStatus.appendChild(criarStatus(quantidade, maximo));

        // AÇÕES
        const colunaAcoes = document.createElement("td");
        const grupoAcoes = document.createElement("div");
        grupoAcoes.className = "grupo-acoes";

        // Botão Repor
        const botaoRepor = document.createElement("button");
        botaoRepor.type = "button";
        botaoRepor.className = "botao-repor";

        if (maximo > 0 && quantidade >= maximo) {
            botaoRepor.textContent = "Estoque cheio";
            botaoRepor.disabled = true;
        } else {
            botaoRepor.textContent = "Repor";
            botaoRepor.addEventListener("click", () => abrirModalReposicao(produto));
        }

        // Botão Editar
        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "botao-editar";
        botaoEditar.textContent = "Editar";
        botaoEditar.addEventListener("click", () => abrirModalEdicao(produto));

        // Botão Fornecedor
        const botaoFornecedor = document.createElement("button");
        botaoFornecedor.type = "button";
        botaoFornecedor.className = "botao-fornecedor";
        botaoFornecedor.textContent = "Fornecedor";

        if (produto.id_fornecedor && produto.id_item_estoque) {
            botaoFornecedor.addEventListener("click", () => abrirModalFornecedor(produto));
        } else {
            botaoFornecedor.disabled = true;
            botaoFornecedor.textContent = "Sem fornecedor";
        }

        grupoAcoes.appendChild(botaoEditar);
        grupoAcoes.appendChild(botaoRepor);
        grupoAcoes.appendChild(botaoFornecedor);

        // BOTÃO WHATSAPP ADM (Aparece se o estoque for <= 40%)
        const percentualAtual = (quantidade / maximo) * 100;
        if (percentualAtual <= 40) {
            const botaoNotificarAdmin = document.createElement("a");
            botaoNotificarAdmin.className = "botao-whatsapp-admin";
            botaoNotificarAdmin.target = "_blank";
            botaoNotificarAdmin.textContent = "📱 Notificar ADM";

            const textoMensagem = `⚠️ *ALERTA DE ESTOQUE BAIXO - ZORA*\n\n` +
                `📦 *Produto:* ${produto.nome} (Código #${produto.id_produto})\n` +
                `📊 *Estoque Restante:* ${quantidade} de ${maximo} unidades (${percentualAtual.toFixed(1)}% do limite)\n\n` +
                `🏭 *Fornecedor:* ${produto.fornecedor || 'Não cadastrado'}\n` +
                `📞 *Contato Fornecedor:* ${produto.contato || 'Sem contato'}\n\n` +
                `💡 *Ação:* Entrar em contato com o fornecedor para realizar reabastecimento.`;

            botaoNotificarAdmin.href = `https://wa.me/${TELEFONE_ADMIN_WHATSAPP}?text=${encodeURIComponent(textoMensagem)}`;
            grupoAcoes.appendChild(botaoNotificarAdmin);
        }

        colunaAcoes.appendChild(grupoAcoes);

        // MONTAR LINHA
        linha.appendChild(colunaProduto);
        linha.appendChild(colunaCategoria);
        linha.appendChild(colunaPreco);
        linha.appendChild(colunaEstoque);
        linha.appendChild(colunaFornecedor);
        linha.appendChild(colunaContato);
        linha.appendChild(colunaStatus);
        linha.appendChild(colunaAcoes);

        tabela.appendChild(linha);
    });
}

// =====================================================
// STATUS
// =====================================================

function criarStatus(quantidade, maximo) {
    const status = document.createElement("span");
    status.classList.add("status");

    if (quantidade <= 0) {
        status.textContent = "Esgotado";
        status.classList.add("status-esgotado");
        return status;
    }

    const percentual = (quantidade / (maximo || 100)) * 100;

    if (percentual <= 40) {
        status.textContent = `Estoque baixo (${percentual.toFixed(0)}%)`;
        status.classList.add("status-baixo");
        return status;
    }

    status.textContent = "Disponível";
    status.classList.add("status-disponivel");
    return status;
}

// =====================================================
// MODAL FORNECEDOR
// =====================================================

function abrirModalFornecedor(produto) {
    const modal = document.getElementById("modalFornecedor");
    if (!modal || !produto.id_fornecedor || !produto.id_item_estoque) return;

    definirTexto("fornecedorCategoria", produto.categoria || "-");
    definirTexto("fornecedorEstoque", `#${produto.id_item_estoque}`);

    document.getElementById("fornecedorId").value = produto.id_fornecedor;
    document.getElementById("fornecedorIdEstoque").value = produto.id_item_estoque;
    document.getElementById("fornecedorNome").value = produto.fornecedor || "";
    document.getElementById("fornecedorContato").value = produto.contato || "";

    const mensagem = document.getElementById("mensagemFornecedor");
    if (mensagem) {
        mensagem.textContent = "";
        mensagem.className = "mensagem-modal";
    }

    modal.classList.add("ativo");
    document.body.classList.add("modal-aberto");
}

function fecharModalFornecedor() {
    const modal = document.getElementById("modalFornecedor");
    if (modal) {
        modal.classList.remove("ativo");
    }
    document.body.classList.remove("modal-aberto");
}

// =====================================================
// SALVAR FORNECEDOR
// =====================================================

async function salvarFornecedor(evento) {
    evento.preventDefault();

    const idFornecedor = Number(document.getElementById("fornecedorId").value);
    const idItemEstoque = Number(document.getElementById("fornecedorIdEstoque").value);
    const nome = document.getElementById("fornecedorNome").value.trim();
    const contato = document.getElementById("fornecedorContato").value.trim();
    const mensagem = document.getElementById("mensagemFornecedor");

    if (!nome || !contato) {
        if (mensagem) {
            mensagem.textContent = "Preencha o nome e o contato do fornecedor.";
            mensagem.className = "mensagem-modal erro";
        }
        return;
    }

    try {
        const resposta = await fetch("/atualizar_fornecedor.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                id_fornecedor: idFornecedor,
                id_item_estoque: idItemEstoque,
                nome: nome,
                contato: contato
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Erro ao salvar o fornecedor.");
        }

        if (mensagem) {
            mensagem.textContent = "Fornecedor atualizado com sucesso!";
            mensagem.className = "mensagem-modal sucesso";
        }

        setTimeout(() => {
            fecharModalFornecedor();
            carregarDadosAdmin();
        }, 1000);

    } catch (erro) {
        if (mensagem) {
            mensagem.textContent = erro.message;
            mensagem.className = "mensagem-modal erro";
        }
    }
}

// Inicializa o evento de carregamento da página
document.addEventListener("DOMContentLoaded", carregarDadosAdmin);
