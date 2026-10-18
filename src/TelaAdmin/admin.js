// =====================================================
// ZORA - PAINEL ADMINISTRATIVO INTEGRADO (VERSÃO BLINDADA)
// =====================================================

let produtosAdmin = [];
const TELEFONE_ADMIN_WHATSAPP = "5521976442535"; // Número do WhatsApp com DDD

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    carregarDadosAdmin();

    // Eventos dos Formulários
    const formReposicao = document.getElementById("formReposicao");
    if (formReposicao) formReposicao.addEventListener("submit", salvarReposicao);

    const formEditar = document.getElementById("formEditarProduto");
    if (formEditar) formEditar.addEventListener("submit", salvarEdicaoProduto);

    const formFornecedor = document.getElementById("formFornecedor");
    if (formFornecedor) formFornecedor.addEventListener("submit", salvarFornecedor);

    // Eventos dos Filtros
    const pesquisa = document.getElementById("pesquisaProduto");
    if (pesquisa) pesquisa.addEventListener("input", aplicarFiltros);

    const categoria = document.getElementById("filtroCategoria");
    if (categoria) categoria.addEventListener("change", aplicarFiltros);
});

// =====================================================
// 1. CARREGAR PRODUTOS, PEDIDOS E INVENTÁRIO (UNIFICADO)
// =====================================================

async function carregarDadosAdmin() {
    const tabela = document.getElementById("tabelaProdutos");

    try {
        // Recupera o ID do cliente logado no navegador para garantir a sessão no Render
        let idClienteUrl = "";
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (usuario && usuario.id_cliente) {
                    idClienteUrl = `?id_cliente=${usuario.id_cliente}`;
                }
            } catch (e) {
                console.error("Erro ao ler usuarioLogado do localStorage:", e);
            }
        }

        // admin_dados.php está na raiz (por isso a barra '/')
        const resposta = await fetch(`/admin_dados.php${idClienteUrl}`, {
            method: "GET",
            cache: "no-store",
            credentials: "include"
        });

        const textoBruto = await resposta.text();
        let resultado;

        try {
            resultado = JSON.parse(textoBruto);
        } catch (e) {
            console.error("Erro ao converter JSON do admin_dados.php. Resposta recebida:", textoBruto);
            throw new Error("O servidor retornou uma resposta inválida (não é JSON). Verifique os logs do PHP.");
        }

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Erro ao carregar os dados do painel.");
        }

        // Armazena lista de produtos
        produtosAdmin = Array.isArray(resultado.produtos) ? resultado.produtos : [];

        // Preenche métricas do Dashboard e Vendas se retornado
        if (resultado.dashboard) {
            preencherCardsDashboard(resultado.dashboard);
        }

        if (resultado.mais_vendido) {
            preencherProdutoMaisVendido(resultado.mais_vendido);
        }

        if (resultado.pedidos) {
            renderizarPedidosAdmin(resultado.pedidos);
        }

        carregarCategorias();
        atualizarResumo();
        aplicarFiltros();

    } catch (erro) {
        console.error("Erro ao carregar inventário:", erro);
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="8" class="erro-tabela">
                        Não foi possível carregar os produtos: ${erro.message}
                    </td>
                </tr>
            `;
        }
    }
}

// =====================================================
// 2. DASHBOARD DE VENDAS E RESUMO
// =====================================================

function preencherCardsDashboard(dashboard) {
    definirTexto("totalProdutosCount", dashboard.total_produtos || 0);
    definirTexto("totalEstoqueCount", dashboard.total_estoque || 0);
    definirTexto("esgotadosCount", dashboard.esgotados || 0);

    // Se houver elementos específicos para faturamento e pedidos no topo
    definirTexto("totalFaturamento", formatarMoeda(dashboard.faturamento || 0));
    definirTexto("totalPedidosCountVendas", dashboard.total_pedidos || 0);
    definirTexto("totalProdutosVendidos", dashboard.produtos_vendidos || 0);
    definirTexto("ticketMedio", formatarMoeda(dashboard.ticket_medio || 0));
}

function preencherProdutoMaisVendido(maisVendido) {
    const el = document.getElementById("produtoMaisVendido") || document.querySelector(".produto-mais-vendido");
    if (el) {
        if (maisVendido && maisVendido.nome) {
            el.innerHTML = `<strong>${maisVendido.nome}</strong> (${maisVendido.quantidade} un. vendidas)`;
        } else {
            el.textContent = "Nenhuma venda registrada";
        }
    }
}

// =====================================================
// 2.1 RENDERIZAR HISTÓRICO DE PEDIDOS NO ADMIN
// =====================================================

function renderizarPedidosAdmin(pedidos) {
    // Procura pela tabela de pedidos pelo ID ou classe comum
    const tabelaPedidos = document.getElementById("tabelaPedidos") || document.querySelector(".tabela-pedidos");
    if (!tabelaPedidos) return;

    tabelaPedidos.innerHTML = "";

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        tabelaPedidos.innerHTML = `<tr><td colspan="6" class="sem-resultados" style="text-align:center; padding:20px; color:#777;">Nenhum pedido registrado.</td></tr>`;
        return;
    }

    pedidos.forEach(pedido => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>#${pedido.id_pedido}</td>
            <td>${pedido.cliente || "Cliente"}</td>
            <td>${pedido.data_pedido}</td>
            <td>${pedido.quantidade_itens} item(ns)</td>
            <td><strong>${formatarMoeda(pedido.valor_total)}</strong></td>
            <td><span class="status-pedido ${String(pedido.status).toLowerCase()}">${pedido.status}</span></td>
        `;

        tabelaPedidos.appendChild(linha);
    });
}

// =====================================================
// 3. CATEGORIAS, RESUMO E FILTROS
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

function atualizarResumo() {
    const totalProdutos = produtosAdmin.length;
    const totalUnidades = produtosAdmin.reduce((total, p) => total + (Number(p.qtd_item) || 0), 0);

    // Regra dos 40%: Considera estoque baixo quando for <= 40% do limite máximo
    const estoqueBaixo = produtosAdmin.filter(p => {
        const quantidade = Number(p.qtd_item) || 0;
        const maximo = Number(p.qtd_max_produto) || 100;
        if (quantidade <= 0) return false;
        return (quantidade / maximo) * 100 <= 40;
    }).length;

    const esgotados = produtosAdmin.filter(p => (Number(p.qtd_item) || 0) <= 0).length;

    definirTexto("totalProdutos", totalProdutos);
    definirTexto("totalUnidades", totalUnidades);
    definirTexto("totalEstoqueBaixo", estoqueBaixo);
    definirTexto("totalEsgotados", esgotados);
}

function aplicarFiltros() {
    const pesquisa = document.getElementById("pesquisaProduto");
    const categoria = document.getElementById("filtroCategoria");

    const texto = pesquisa ? pesquisa.value.trim().toLowerCase() : "";
    const categoriaSelecionada = categoria ? categoria.value : "";

    const produtosFiltrados = produtosAdmin.filter(produto => {
        const nome = String(produto.nome || "").toLowerCase();
        const correspondeNome = nome.includes(texto);
        const correspondeCategoria = categoriaSelecionada === "" || produto.categoria === categoriaSelecionada;
        return correspondeNome && correspondeCategoria;
    });

    renderizarProdutos(produtosFiltrados);
}

// =====================================================
// 4. RENDERIZAR TABELA DE INVENTÁRIO
// =====================================================

function renderizarProdutos(produtos) {
    const tabela = document.getElementById("tabelaProdutos");
    if (!tabela) return;

    tabela.innerHTML = "";
    definirTexto("quantidadeResultados", `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`);

    if (produtos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="8" class="sem-resultados">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    produtos.forEach(produto => {
        const linha = document.createElement("tr");

        // PRODUTO
        const colProduto = document.createElement("td");
        colProduto.innerHTML = `
            <div class="produto-info">
                <img src="/img/${produto.imagem || 'default.jpg'}" alt="${produto.nome}">
                <div>
                    <strong>${produto.nome}</strong>
                    <small>Código #${produto.id_produto}</small>
                </div>
            </div>
        `;

        // CATEGORIA
        const colCategoria = document.createElement("td");
        colCategoria.textContent = produto.categoria || "-";

        // PREÇO
        const colPreco = document.createElement("td");
        colPreco.textContent = formatarMoeda(produto.preco);

        // ESTOQUE
        const quantidade = Number(produto.qtd_item) || 0;
        const maximo = Number(produto.qtd_max_produto) || 100;
        const colEstoque = document.createElement("td");
        colEstoque.innerHTML = `<strong>${maximo > 0 ? `${quantidade} /${maximo}` : quantidade}</strong>`;

        // FORNECEDOR E CONTATO
        const colFornecedor = document.createElement("td");
        colFornecedor.textContent = produto.fornecedor || "Não cadastrado";

        const colContato = document.createElement("td");
        colContato.textContent = produto.contato || "-";

        // STATUS
        const colStatus = document.createElement("td");
        colStatus.appendChild(criarStatus(quantidade, maximo));

        // AÇÕES
        const colAcoes = document.createElement("td");
        const grupoAcoes = document.createElement("div");
        grupoAcoes.className = "grupo-acoes";

        // Botão Editar
        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "botao-editar";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () => abrirModalEdicao(produto);

        // Botão Repor
        const btnRepor = document.createElement("button");
        btnRepor.type = "button";
        btnRepor.className = "botao-repor";
        if (maximo > 0 && quantidade >= maximo) {
            btnRepor.textContent = "Cheio";
            btnRepor.disabled = true;
        } else {
            btnRepor.textContent = "Repor";
            btnRepor.onclick = () => abrirModalReposicao(produto);
        }

        // Botão Fornecedor
        const btnFornecedor = document.createElement("button");
        btnFornecedor.type = "button";
        btnFornecedor.className = "botao-fornecedor";
        btnFornecedor.textContent = "Fornecedor";
        if (produto.id_fornecedor && produto.id_item_estoque) {
            btnFornecedor.onclick = () => abrirModalFornecedor(produto);
        } else {
            btnFornecedor.disabled = true;
            btnFornecedor.textContent = "Sem fornecedor";
        }

        grupoAcoes.appendChild(btnEditar);
        grupoAcoes.appendChild(btnRepor);
        grupoAcoes.appendChild(btnFornecedor);

        // BOTÃO WHATSAPP ADM (Dispara quando o estoque estiver em <= 40%)
        const percentualAtual = maximo > 0 ? (quantidade / maximo) * 100 : 100;
        if (percentualAtual <= 40) {
            const btnWhatsapp = document.createElement("a");
            btnWhatsapp.className = "botao-whatsapp-admin";
            btnWhatsapp.target = "_blank";
            btnWhatsapp.style.cssText = "display:inline-block; padding:4px 8px; background:#25D366; color:#fff; border-radius:4px; font-size:12px; font-weight:bold; text-decoration:none;";
            btnWhatsapp.textContent = "📱 WPP ADM";

            const msg = `⚠️ *ALERTA DE ESTOQUE BAIXO - ZORA*\n\n` +
                `📦 *Produto:* ${produto.nome} (ID: ${produto.id_produto})\n` +
                `📊 *Estoque Restante:* ${quantidade} de ${maximo} unidades (${percentualAtual.toFixed(1)}%)\n\n` +
                `🏭 *Fornecedor:* ${produto.fornecedor || 'Não cadastrado'}\n` +
                `📞 *Contato Fornecedor:* ${produto.contato || 'Sem contato'}\n\n` +
                `💡 *Ação:* Favor solicitar reabastecimento junto ao fornecedor.`;

            btnWhatsapp.href = `https://wa.me/${TELEFONE_ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`;
            grupoAcoes.appendChild(btnWhatsapp);
        }

        colAcoes.appendChild(grupoAcoes);

        linha.appendChild(colProduto);
        linha.appendChild(colCategoria);
        linha.appendChild(colPreco);
        linha.appendChild(colEstoque);
        linha.appendChild(colFornecedor);
        linha.appendChild(colContato);
        linha.appendChild(colStatus);
        linha.appendChild(colAcoes);

        tabela.appendChild(linha);
    });
}

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
// 5. MODAL REPOSIÇÃO DE ESTOQUE
// =====================================================

function abrirModalReposicao(produto) {
    const modal = document.getElementById("modalReposicao");
    if (!modal) return;

    definirTexto("modalNomeProduto", produto.nome);
    definirTexto("modalEstoqueAtual", produto.qtd_item);

    const maximo = Number(produto.qtd_max_produto) || 100;
    const atual = Number(produto.qtd_item) || 0;
    const disponivel = Math.max(0, maximo - atual);

    definirTexto("modalEstoqueMaximo", maximo);
    definirTexto("modalDisponivel", disponivel);

    document.getElementById("modalIdProduto").value = produto.id_produto;
    const campoQtd = document.getElementById("quantidadeReposicao");
    if (campoQtd) {
        campoQtd.value = "";
        campoQtd.max = disponivel;
    }

    limparMensagemModal("mensagemReposicao");
    modal.classList.add("ativo");
}

function fecharModalReposicao() {
    const modal = document.getElementById("modalReposicao");
    if (modal) modal.classList.remove("ativo");
}

async function salvarReposicao(evento) {
    evento.preventDefault();

    const idProduto = Number(document.getElementById("modalIdProduto").value);
    const quantidade = Number(document.getElementById("quantidadeReposicao").value);

    try {
        // adicionar_estoque.php está dentro da pasta TelaAdmin
        const resposta = await fetch("adicionar_estoque.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id_produto: idProduto, quantidade: quantidade })
        });

        const textoBruto = await resposta.text();
        
        let resultado;
        try {
            resultado = JSON.parse(textoBruto);
        } catch (e) {
            throw new Error("Erro bruto do PHP: " + textoBruto);
        }

        if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem);

        exibirMensagemModal("mensagemReposicao", "Estoque atualizado com sucesso!", "sucesso");
        setTimeout(() => {
            fecharModalReposicao();
            carregarDadosAdmin();
        }, 1000);

    } catch (erro) {
        exibirMensagemModal("mensagemReposicao", erro.message, "erro");
    }
}

// =====================================================
// 6. MODAL EDITAR PRODUTO
// =====================================================

function abrirModalEdicao(produto) {
    const modal = document.getElementById("modalEditarProduto");
    if (!modal) return;

    document.getElementById("editarIdProduto").value = produto.id_produto;
    document.getElementById("editarNome").value = produto.nome;
    document.getElementById("editarPreco").value = produto.preco;
    document.getElementById("editarDescricao").value = produto.descricao || "";

    limparMensagemModal("mensagemEdicao");
    modal.classList.add("ativo");
}

function fecharModalEdicao() {
    const modal = document.getElementById("modalEditarProduto");
    if (modal) modal.classList.remove("ativo");
}

async function salvarEdicaoProduto(evento) {
    evento.preventDefault();

    const dados = {
        id_produto: Number(document.getElementById("editarIdProduto").value),
        nome: document.getElementById("editarNome").value.trim(),
        preco: Number(document.getElementById("editarPreco").value),
        descricao: document.getElementById("editarDescricao").value.trim()
    };

    try {
        const resposta = await fetch("editar_produto.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dados)
        });

        const textoBruto = await resposta.text();
        let resultado;
        try {
            resultado = JSON.parse(textoBruto);
        } catch (e) {
            throw new Error("Erro no servidor (resposta inválida ao editar produto).");
        }

        if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem);

        exibirMensagemModal("mensagemEdicao", "Produto atualizado com sucesso!", "sucesso");
        setTimeout(() => {
            fecharModalEdicao();
            carregarDadosAdmin();
        }, 1000);

    } catch (erro) {
        exibirMensagemModal("mensagemEdicao", erro.message, "erro");
    }
}

// =====================================================
// 7. MODAL EDITAR FORNECEDOR (COM VALIDAÇÕES ATUALIZADAS)
// =====================================================

function abrirModalFornecedor(produto) {
    const modal = document.getElementById("modalFornecedor");
    if (!modal) return;

    definirTexto("fornecedorCategoria", produto.categoria || "-");
    definirTexto("fornecedorEstoque", `#${produto.id_item_estoque}`);

    document.getElementById("fornecedorId").value = produto.id_fornecedor;
    document.getElementById("fornecedorIdEstoque").value = produto.id_item_estoque;
    document.getElementById("fornecedorNome").value = produto.fornecedor || "";
    document.getElementById("fornecedorContato").value = produto.contato || "";

    limparMensagemModal("mensagemFornecedor");
    modal.classList.add("ativo");
}

function fecharModalFornecedor() {
    const modal = document.getElementById("modalFornecedor");
    if (modal) modal.classList.remove("ativo");
}

async function salvarFornecedor(evento) {
    evento.preventDefault();

    const nomeFornecedor = document.getElementById("fornecedorNome").value.trim();
    const contatoFornecedor = document.getElementById("fornecedorContato").value.trim();

    // 1. VALIDAÇÃO DO NOME DO FORNECEDOR (Sem números/caracteres especiais e no máximo 20 caracteres)
    const regexNomeValido = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    if (nomeFornecedor.length < 2 || nomeFornecedor.length > 20 || !regexNomeValido.test(nomeFornecedor)) {
        exibirMensagemModal("mensagemFornecedor", "O nome do fornecedor deve ter entre 2 e 20 caracteres e não pode conter números ou caracteres especiais.", "erro");
        document.getElementById("fornecedorNome").focus();
        return;
    }

    // 2. VALIDAÇÃO DO CONTATO/TELEFONE
    const contatoNumerico = contatoFornecedor.replace(/\D/g, "");
    const ehEmail = contatoFornecedor.includes("@") && contatoFornecedor.includes(".");

    if (!ehEmail) {
        // Se for telefone/celular, deve possuir exatamente 9 números
        if (contatoNumerico.length !== 9) {
            exibirMensagemModal("mensagemFornecedor", "O número de celular deve conter exatamente 9 dígitos.", "erro");
            document.getElementById("fornecedorContato").focus();
            return;
        }
    }

    const dados = {
        id_fornecedor: Number(document.getElementById("fornecedorId").value),
        id_item_estoque: Number(document.getElementById("fornecedorIdEstoque").value),
        nome: nomeFornecedor,
        contato: contatoFornecedor
    };

    try {
        const resposta = await fetch("atualizar_fornecedor.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dados)
        });

        const textoBruto = await resposta.text();
        let resultado;
        try {
            resultado = JSON.parse(textoBruto);
        } catch (e) {
            throw new Error("Erro no servidor (resposta inválida ao atualizar fornecedor).");
        }

        if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem);

        exibirMensagemModal("mensagemFornecedor", "Fornecedor salvo com sucesso!", "sucesso");
        setTimeout(() => {
            fecharModalFornecedor();
            carregarDadosAdmin();
        }, 1000);

    } catch (erro) {
        exibirMensagemModal("mensagemFornecedor", erro.message, "erro");
    }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function definirTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function exibirMensagemModal(idElemento, texto, tipo) {
    const el = document.getElementById(idElemento);
    if (el) {
        el.textContent = texto;
        el.className = `mensagem-modal ${tipo}`;
    }
}

function limparMensagemModal(idElemento) {
    const el = document.getElementById(idElemento);
    if (el) {
        el.textContent = "";
        el.className = "mensagem-modal";
    }
}
