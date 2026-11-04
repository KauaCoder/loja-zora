// =====================================================
// ZORA - PAINEL DO CLIENTE (PERFIL, ENDEREÇO E COMPRAS)
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    carregarDadosPerfil();
    carregarCompras();
    checarEAtualizarMenu();

    const cepEdicao = document.getElementById("cepEdicao");

    if (cepEdicao) {
        cepEdicao.addEventListener("input", () => {
            let valor = cepEdicao.value.replace(/\D/g, "").substring(0, 8);

            if (valor.length > 5) {
                valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
            }

            cepEdicao.value = valor;
        });

        cepEdicao.addEventListener("blur", buscarCEPEdicao);
    }

    const formDevolucao = document.getElementById("formDevolucao");

    if (formDevolucao) {
        formDevolucao.addEventListener("submit", confirmarDevolucao);
    }

    const overlay = obterOverlay();

    if (overlay) {
        overlay.addEventListener("click", fecharTudo);
    }
});

// =====================================================
// IDENTIFICAÇÃO DO CLIENTE
// =====================================================

function obterIdClienteLocal() {
    try {
        const dadosLocais = localStorage.getItem("usuarioLogado");

        if (dadosLocais) {
            const usuario = JSON.parse(dadosLocais);

            if (usuario && usuario.id_cliente) {
                return usuario.id_cliente;
            }
        }
    } catch (erro) {
        console.error("Erro ao ler id_cliente:", erro);
    }

    return null;
}

// =====================================================
// REQUISIÇÃO UNIVERSAL
// =====================================================

async function fazerFetchComID(endpoint, opcoes = {}) {
    const idCliente = obterIdClienteLocal();
    const nomeArquivo = endpoint.replace(/^\//, "");

    // Arquivos localizados dentro de TelaCliente
    const arquivosTelaCliente = [
        "cliente.php",
        "atualizar_perfil.php",
        "solicitar_devolucao.php"
    ];

    // atualizar_endereco.php está na RAIZ do projeto
    let urlFinal = arquivosTelaCliente.includes(nomeArquivo)
        ? `/TelaCliente/${nomeArquivo}`
        : `/${nomeArquivo}`;

    // Adiciona ID do cliente na URL
    if (idCliente) {
        const separador = urlFinal.includes("?") ? "&" : "?";

        urlFinal += `${separador}id_cliente=${encodeURIComponent(idCliente)}`;
    }

    const opcoesAjustadas = { ...opcoes };

    // Adiciona ID do cliente no JSON
    if (
        typeof opcoesAjustadas.body === "string" &&
        idCliente
    ) {
        try {
            const bodyObj = JSON.parse(opcoesAjustadas.body);

            if (!bodyObj.id_cliente) {
                bodyObj.id_cliente = Number(idCliente);
            }

            opcoesAjustadas.body = JSON.stringify(bodyObj);

        } catch (erro) {
            console.warn("Não foi possível ajustar o JSON:", erro);
        }
    }

    try {
        console.log("ZORA - Requisição:", urlFinal);

        const resposta = await fetch(urlFinal, {
            credentials: "include",
            ...opcoesAjustadas
        });

        console.log("ZORA - Status HTTP:", resposta.status);

        return resposta;

    } catch (erro) {
        console.error(`Erro ao conectar com ${urlFinal}:`, erro);
        throw erro;
    }
}

// =====================================================
// PROCESSAMENTO SEGURO DE RESPOSTAS JSON
// =====================================================

async function processarRespostaJSON(resposta) {
    const texto = await resposta.text();

    try {
        return JSON.parse(texto);

    } catch (erro) {
        console.error("Resposta inválida do servidor:", texto);

        throw new Error(
            `O servidor retornou uma resposta inválida. HTTP ${resposta.status}`
        );
    }
}

// =====================================================
// CARREGAR DADOS DO PERFIL E ENDEREÇO
// =====================================================

async function carregarDadosPerfil() {
    try {
        const resposta = await fazerFetchComID("cliente.php", {
            method: "GET"
        });

        const resultado = await processarRespostaJSON(resposta);

        if (!resposta.ok || !resultado.sucesso) {
            console.error("Erro ao carregar cliente:", resultado.mensagem);
            return;
        }

        const cliente = resultado.cliente || {};
        const endereco = resultado.endereco || {};

        const atualizarTexto = (id, valor, padrao = "-") => {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.textContent = valor || padrao;
            }
        };

        atualizarTexto("nomeUsuario", cliente.nome, "Usuário");
        atualizarTexto("emailUsuario", cliente.email);
        atualizarTexto("nomePerfil", cliente.nome);
        atualizarTexto("emailPerfil", cliente.email);
        atualizarTexto("telefonePerfil", cliente.telefone);

        preencherEnderecoTela(endereco);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
    }
}

function preencherEnderecoTela(endereco) {
    if (!endereco) return;

    const setVal = (id, valor) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent =
                valor && valor !== "-" ? valor : "-";
        }
    };

    setVal("cepPerfil", endereco.cep);
    setVal("ruaPerfil", endereco.rua || endereco.endereco);
    setVal("numeroPerfil", endereco.numero);
    setVal("complementoPerfil", endereco.complemento);
    setVal("bairroPerfil", endereco.bairro);
    setVal("cidadePerfil", endereco.cidade);
    setVal("estadoPerfil", endereco.estado);
}

// =====================================================
// CARREGAR HISTÓRICO DE COMPRAS
// =====================================================

async function carregarCompras() {
    const comprasVazio = document.getElementById("compras-vazio");
    const comprasLista = document.getElementById("compras-lista");

    if (!comprasVazio || !comprasLista) return;

    try {
        const resposta = await fazerFetchComID("historico_pedidos.php", {
            method: "GET"
        });

        const resultado = await processarRespostaJSON(resposta);

        if (!resposta.ok || !resultado.sucesso) {
            comprasVazio.style.display = "block";
            comprasLista.style.display = "none";
            return;
        }

        const compras = resultado.pedidos || [];

        if (compras.length === 0) {
            comprasVazio.style.display = "block";
            comprasLista.style.display = "none";
            return;
        }

        comprasVazio.style.display = "none";
        comprasLista.style.display = "block";
        comprasLista.innerHTML = "";

        compras.forEach(compra => {
            const compraCard = document.createElement("div");

            compraCard.className = "compra-card";

            compraCard.style.cssText =
                "background:#fff;border:1px solid #e2e2e2;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);";

            const dataFormatada = compra.data || "-";

            const produtosHTML = (compra.produtos || []).map(produto => {
                const qtd = Number(produto.quantidade) || 1;
                const precoNum = Number(produto.preco) || 0;

                const preco = precoNum.toFixed(2).replace(".", ",");
                const subtotal = (precoNum * qtd).toFixed(2).replace(".", ",");

                const statusGlobal = (compra.status || "").toLowerCase();

                const podeDevolver = ![
                    "devolvido",
                    "cancelado",
                    "solicitação de devolução"
                ].includes(statusGlobal);

                const nomeProduto = produto.nome || "Produto";

                const nomeSeguro = nomeProduto.replace(/'/g, "\\'");

                return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;">
                        <div>
                            <p style="margin:0;font-size:14px;color:#222;">
                                <strong>${qtd}x ${nomeProduto}</strong>
                            </p>

                            <small style="color:#777;">
                                R$ ${preco} unit. | Subtotal: R$ ${subtotal}
                            </small>
                        </div>

                        <div>
                            ${podeDevolver
                                ? `
                                    <button
                                        type="button"
                                        onclick="abrirModalDevolucao(${compra.id_pedido}, ${produto.id_produto}, '${nomeSeguro}')"
                                        style="background:#dc3545;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                                        Solicitar Devolução
                                    </button>
                                `
                                : `
                                    <span style="color:#888;font-size:12px;font-weight:bold;">
                                        Devolução Solicitada
                                    </span>
                                `
                            }
                        </div>
                    </div>
                `;
            }).join("");

            const total = Number(compra.total || 0)
                .toFixed(2)
                .replace(".", ",");

            compraCard.innerHTML = `
                <div class="compra-header" style="display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding-bottom:10px;">
                    <div>
                        <h4 style="margin:0;font-size:15px;color:#111;">
                            Pedido #${String(compra.id_pedido).padStart(4, "0")}
                        </h4>

                        <p class="data" style="margin:4px 0 0;color:#888;font-size:12px;">
                            Data: ${dataFormatada}
                        </p>
                    </div>

                    <div style="text-align:right;">
                        <p style="margin:0;color:#888;font-size:11px;">
                            Total do Pedido
                        </p>

                        <p style="margin:0;font-weight:bold;color:#a94460;font-size:16px;">
                            R$ ${total}
                        </p>
                    </div>
                </div>

                <div class="compra-produtos" style="margin-top:10px;">
                    ${produtosHTML}
                </div>

                <div class="compra-footer" style="margin-top:12px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                    <p style="margin:0;">
                        <strong>Status:</strong>
                        <span style="color:#28a745;font-weight:bold;">
                            ${compra.status || "Aprovado"}
                        </span>
                    </p>
                </div>
            `;

            comprasLista.appendChild(compraCard);
        });

    } catch (erro) {
        console.error("Erro ao carregar compras:", erro);

        comprasVazio.style.display = "block";
        comprasLista.style.display = "none";
    }
}

// =====================================================
// EDIÇÃO DO NOME
// =====================================================

function mostrarEdicaoNome() {
    const displayGroup = document.getElementById("nomeDisplayGroup");
    const edicaoGroup = document.getElementById("nomeEdicaoGroup");

    if (displayGroup && edicaoGroup) {
        displayGroup.style.display = "none";
        edicaoGroup.style.display = "block";

        const nomePerfil = document.getElementById("nomePerfil");
        const novoNomeInput = document.getElementById("novoNomeInput");

        if (nomePerfil && novoNomeInput) {
            novoNomeInput.value =
                nomePerfil.textContent !== "-"
                    ? nomePerfil.textContent
                    : "";
        }
    }
}

function cancelarEdicaoNome() {
    const displayGroup = document.getElementById("nomeDisplayGroup");
    const edicaoGroup = document.getElementById("nomeEdicaoGroup");

    if (displayGroup && edicaoGroup) {
        edicaoGroup.style.display = "none";
        displayGroup.style.display = "block";
    }
}

async function salvarNovoNome() {
    const campoNome = document.getElementById("novoNomeInput");

    if (!campoNome) return;

    const novoNome = campoNome.value.trim();
    const idCliente = obterIdClienteLocal();

    if (!novoNome) {
        alert("Informe um nome válido.");
        return;
    }

    try {
        const resposta = await fazerFetchComID("atualizar_perfil.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_cliente: idCliente ? Number(idCliente) : null,
                nome: novoNome
            })
        });

        const resultado = await processarRespostaJSON(resposta);

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível atualizar o nome.");
            return;
        }

        alert("Nome atualizado com sucesso!");

        const dadosLocais = localStorage.getItem("usuarioLogado");

        if (dadosLocais) {
            const usuario = JSON.parse(dadosLocais);
            usuario.nome = novoNome;

            localStorage.setItem(
                "usuarioLogado",
                JSON.stringify(usuario)
            );
        }

        cancelarEdicaoNome();

        await carregarDadosPerfil();
        checarEAtualizarMenu();

    } catch (erro) {
        console.error("Erro ao atualizar nome:", erro);
        alert(erro.message || "Erro ao conectar ao servidor.");
    }
}

// =====================================================
// EDIÇÃO DO ENDEREÇO
// =====================================================

function mostrarEdicaoEndereco() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (existente) existente.style.display = "none";
    if (edicao) edicao.style.display = "block";

    const getVal = (id) => {
        const elemento = document.getElementById(id);

        return elemento && elemento.textContent !== "-"
            ? elemento.textContent
            : "";
    };

    const campos = {
        cepEdicao: "cepPerfil",
        ruaEdicao: "ruaPerfil",
        numeroEdicao: "numeroPerfil",
        complementoEdicao: "complementoPerfil",
        bairroEdicao: "bairroPerfil",
        cidadeEdicao: "cidadePerfil",
        estadoEdicao: "estadoPerfil"
    };

    Object.entries(campos).forEach(([campo, origem]) => {
        const elemento = document.getElementById(campo);

        if (elemento) {
            elemento.value = getVal(origem);
        }
    });
}

function cancelarEdicao() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (edicao) edicao.style.display = "none";
    if (existente) existente.style.display = "block";
}

// =====================================================
// BUSCAR CEP
// =====================================================

async function buscarCEPEdicao() {
    const cepInput = document.getElementById("cepEdicao");

    if (!cepInput) return;

    const valor = cepInput.value.replace(/\D/g, "");

    if (valor.length !== 8) return;

    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${valor}/json/`
        );

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (dados.erro) {
            alert("CEP não encontrado.");
            return;
        }

        const campos = {
            ruaEdicao: dados.logradouro,
            bairroEdicao: dados.bairro,
            cidadeEdicao: dados.localidade,
            estadoEdicao: dados.uf
        };

        Object.entries(campos).forEach(([id, valorCampo]) => {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.value = valorCampo || "";
            }
        });

        const numInput = document.getElementById("numeroEdicao");

        if (numInput) {
            numInput.focus();
        }

    } catch (erro) {
        console.error("Erro ao consultar CEP:", erro);
        alert("Não foi possível consultar o CEP.");
    }
}

// =====================================================
// SALVAR ENDEREÇO
// =====================================================

async function salvarEndereco() {
    const campos = {
        cep: "cepEdicao",
        rua: "ruaEdicao",
        numero: "numeroEdicao",
        complemento: "complementoEdicao",
        bairro: "bairroEdicao",
        cidade: "cidadeEdicao",
        estado: "estadoEdicao"
    };

    const endereco = {};

    for (const [chave, id] of Object.entries(campos)) {
        const elemento = document.getElementById(id);

        if (!elemento) {
            console.error(`Campo não encontrado: ${id}`);
            alert("Erro na estrutura do formulário de endereço.");
            return;
        }

        endereco[chave] = elemento.value.trim();
    }

    const cepNumerico = endereco.cep.replace(/\D/g, "");

    if (
        cepNumerico.length !== 8 ||
        !endereco.rua ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.cidade ||
        !endereco.estado
    ) {
        alert("Verifique o CEP e preencha todos os campos obrigatórios.");
        return;
    }

    endereco.cep = cepNumerico;

    const idCliente = obterIdClienteLocal();

    if (!idCliente) {
        alert("Não foi possível identificar o cliente. Faça login novamente.");
        return;
    }

    try {
        const resposta = await fazerFetchComID("atualizar_endereco.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...endereco,
                id_cliente: Number(idCliente)
            })
        });

        const resultado = await processarRespostaJSON(resposta);

        if (!resposta.ok || !resultado.sucesso) {
            console.error("Erro retornado pelo PHP:", resultado);

            alert(
                resultado.mensagem ||
                `Não foi possível atualizar o endereço. HTTP ${resposta.status}`
            );

            return;
        }

        alert("Endereço atualizado com sucesso!");

        cancelarEdicao();

        await carregarDadosPerfil();

    } catch (erro) {
        console.error("Erro ao atualizar endereço:", erro);

        alert(
            erro.message ||
            "Não foi possível conectar ao servidor."
        );
    }
}

// =====================================================
// MODAL DE DEVOLUÇÃO
// =====================================================

function abrirModalDevolucao(idPedido, idProduto, nomeProduto) {
    const elPedido = document.getElementById("devolucaoIdPedido");
    const elProduto = document.getElementById("devolucaoIdProduto");
    const elNome = document.getElementById("devolucaoNomeProduto");
    const modal = document.getElementById("modalDevolucao");

    if (elPedido && elProduto && elNome && modal) {
        elPedido.value = idPedido;
        elProduto.value = idProduto;
        elNome.textContent = nomeProduto;

        modal.style.display = "flex";
    }
}

function fecharModalDevolucao() {
    const modal = document.getElementById("modalDevolucao");

    if (modal) {
        modal.style.display = "none";
    }
}

async function confirmarDevolucao(evento) {
    if (evento) evento.preventDefault();

    const idPedido = document.getElementById("devolucaoIdPedido").value;
    const idProduto = document.getElementById("devolucaoIdProduto").value;
    const motivo = document.getElementById("motivoDevolucao").value;

    if (!motivo) {
        alert("Selecione o motivo da devolução.");
        return;
    }

    try {
        const resposta = await fazerFetchComID("solicitar_devolucao.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_pedido: Number(idPedido),
                id_produto: Number(idProduto),
                motivo: motivo
            })
        });

        const resultado = await processarRespostaJSON(resposta);

        if (!resposta.ok || !resultado.sucesso) {
            alert(
                resultado.mensagem ||
                "Não foi possível solicitar a devolução."
            );

            return;
        }

        alert("Solicitação de devolução registrada com sucesso!");

        fecharModalDevolucao();

        await carregarCompras();

    } catch (erro) {
        console.error("Erro na devolução:", erro);

        alert("Erro ao conectar ao servidor.");
    }
}

// =====================================================
// LOGOUT
// =====================================================

async function logout() {
    if (!confirm("Você tem certeza que deseja sair?")) return;

    try {
        await fazerFetchComID("logout.php", {
            method: "POST"
        });

    } catch (erro) {
        console.error("Erro no logout:", erro);

    } finally {
        localStorage.removeItem("usuarioLogado");

        window.location.replace("/TelaLogin/login.html");
    }
}

// =====================================================
// MENU LATERAL E OVERLAY
// =====================================================

function obterSidebar() {
    return document.getElementById("sidebar") ||
        document.querySelector(".sidebar");
}

function obterOverlay() {
    return document.getElementById("overlay") ||
        document.querySelector(".overlay");
}

function sincronizarOverlay() {
    const sidebar = obterSidebar();
    const overlay = obterOverlay();
    const pedidos = document.getElementById("Pedidos");

    const menuAberto = sidebar && (
        sidebar.classList.contains("ativo") ||
        sidebar.classList.contains("active")
    );

    const pedidosAberto = pedidos &&
        pedidos.classList.contains("ativo");

    const algumPainelAberto = Boolean(
        menuAberto || pedidosAberto
    );

    if (overlay) {
        overlay.classList.toggle("ativo", algumPainelAberto);
    }

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

// =====================================================
// ABRIR PERFIL
// =====================================================

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
        usuario.nome ||
        usuario.email ||
        usuario.id_cliente
    )) {
        const ehAdmin =
            usuario.is_admin === true ||
            usuario.is_admin === 1 ||
            usuario.is_admin === "1" ||
            usuario.nivel === "admin";

        window.location.href = ehAdmin
            ? "/TelaAdmin/admin.html"
            : "/TelaCliente/cliente.html";

    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

// =====================================================
// ATUALIZAR MENU DO USUÁRIO
// =====================================================

async function checarEAtualizarMenu() {
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
            usuario.is_admin === true ||
            usuario.is_admin === 1 ||
            usuario.is_admin === "1" ||
            usuario.nivel === "admin";

        if (ehAdmin) {
            texto = "Painel do Adm";

        } else {
            const primeiroNome = usuario.nome
                ? usuario.nome.split(" ")[0]
                : "Perfil";

            texto = `Olá, ${primeiroNome}`;
        }
    }

    if (menuDesktop) {
        menuDesktop.textContent = texto;
    }

    if (menuMobile) {
        menuMobile.textContent = texto;
    }
}