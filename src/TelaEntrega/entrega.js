// =====================================================
// ZORA - TELA DE ENTREGA E PAGAMENTO
// PostgreSQL + Sessão PHP (Versão Completa & Definitiva)
// =====================================================

// =====================================================
// 1. CARREGAR PEDIDO DO LOCALSTORAGE
// =====================================================

let totalPedido = localStorage.getItem("totalPedido");
const pedidosSalvos = localStorage.getItem("pedidos") || localStorage.getItem("carrinho");

let itensPedido = [];

if (pedidosSalvos) {
    try {
        const parsed = JSON.parse(pedidosSalvos);
        itensPedido = Array.isArray(parsed) ? parsed : (parsed.itens || []);
    } catch (erro) {
        console.error("Erro ao carregar pedido:", erro);
        itensPedido = [];
    }
}

if ((!totalPedido || Number(totalPedido) <= 0) && itensPedido.length > 0) {
    totalPedido = itensPedido.reduce((acc, item) => {
        return acc + ((Number(item.preco) || 0) * (Number(item.quantidade) || 1));
    }, 0);
    localStorage.setItem("totalPedido", totalPedido);
}

// Redireciona se estiver vazio
if (!totalPedido || !itensPedido || itensPedido.length === 0) {
    alert("Seu carrinho está vazio.");
    window.location.href = "/Telainicial/index.html";
}

// Helper para obter o ID do cliente armazenado no navegador
function obterIdClienteLocal() {
    try {
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            const usuario = JSON.parse(dadosLocais);
            if (usuario && usuario.id_cliente) {
                return usuario.id_cliente;
            }
        }
    } catch (e) {
        console.error("Erro ao ler id_cliente do localStorage:", e);
    }
    return null;
}


// =====================================================
// 2. MENU LATERAL, OVERLAY E PERFIL (PADRÃO ZORA)
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

    const idCliente = obterIdClienteLocal();

    if ((usuario && (usuario.nome || usuario.email || usuario.id_cliente)) || idCliente) {
        const ehAdmin = usuario && (
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin"
        );

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
    const idCliente = obterIdClienteLocal();

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

    if ((usuario && (usuario.nome || usuario.email)) || idCliente) {
        const ehAdmin = usuario && (
            usuario.is_admin === true
            || usuario.is_admin === 1
            || usuario.is_admin === "1"
            || usuario.nivel === "admin"
        );

        if (ehAdmin) {
            texto = "📊 Dashboard Adm";
        } else {
            const primeiroNome = (usuario && usuario.nome)
                ? usuario.nome.split(" ")[0]
                : "Perfil";

            texto = `Olá, ${primeiroNome}`;
        }
    }

    if (menuDesktop) menuDesktop.textContent = texto;
    if (menuMobile) menuMobile.textContent = texto;
}


// =====================================================
// 3. RENDERIZAR RESUMO
// =====================================================

function renderizarResumo() {
    const valorTotalEl = document.getElementById("valorTotal");
    if (valorTotalEl) {
        valorTotalEl.textContent = "R$ " + Number(totalPedido).toFixed(2).replace(".", ",");
    }

    const lista = document.getElementById("listaResumo");
    if (!lista) return;

    lista.innerHTML = "";

    itensPedido.forEach(produto => {
        const quantidade = Number(produto.quantidade) || 1;
        const preco = Number(produto.preco) || 0;
        const nome = produto.nome || "Produto ZORA";

        const item = document.createElement("li");
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.padding = "8px 0";
        item.style.borderBottom = "1px solid #eee";

        item.innerHTML = `
            <span>${quantidade}x ${nome}</span>
            <strong>R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}</strong>
        `;

        lista.appendChild(item);
    });
}


// =====================================================
// 4. MÁSCARAS E BUSCA DE CEP
// =====================================================

function inicializarMascarasECep() {
    const cpf = document.getElementById("cpf");
    if (cpf) {
        cpf.addEventListener("input", () => {
            let valor = cpf.value.replace(/\D/g, "").substring(0, 11);
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            cpf.value = valor;
        });
    }

    const cepInput = document.getElementById("cep");
    const statusCep = document.getElementById("statusCep");

    if (cepInput) {
        cepInput.addEventListener("input", () => {
            let valor = cepInput.value.replace(/\D/g, "").substring(0, 8);
            if (valor.length > 5) {
                valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
            }
            cepInput.value = valor;

            if (statusCep) {
                statusCep.textContent = "";
                statusCep.className = "status-cep";
            }
        });

        cepInput.addEventListener("blur", buscarCEP);
    }
}

async function buscarCEP() {
    const cepInput = document.getElementById("cep");
    const statusCep = document.getElementById("statusCep");
    if (!cepInput) return;

    const valor = cepInput.value.replace(/\D/g, "");

    if (valor.length !== 8) {
        limparEndereco();
        if (valor.length > 0 && statusCep) {
            statusCep.textContent = "CEP incompleto.";
            statusCep.className = "status-cep erro";
        }
        return;
    }

    if (statusCep) {
        statusCep.textContent = "Buscando endereço...";
        statusCep.className = "status-cep buscando";
    }

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        if (!resposta.ok) throw new Error("Falha na consulta.");

        const dados = await resposta.json();

        if (dados.erro) {
            if (statusCep) {
                statusCep.textContent = "CEP não encontrado.";
                statusCep.className = "status-cep erro";
            }
            limparEndereco();
            return;
        }

        const rua = document.getElementById("rua");
        const bairro = document.getElementById("bairro");
        const cidade = document.getElementById("cidade");
        const estado = document.getElementById("estado");
        const numero = document.getElementById("numero");

        if (rua) rua.value = dados.logradouro || "";
        if (bairro) bairro.value = dados.bairro || "";
        if (cidade) cidade.value = dados.localidade || "";
        if (estado) estado.value = dados.uf || "";

        if (statusCep) {
            statusCep.textContent = "✓ Endereço encontrado.";
            statusCep.className = "status-cep encontrado";
        }

        if (numero) numero.focus();

    } catch (erro) {
        console.error("Erro no ViaCEP:", erro);
        if (statusCep) {
            statusCep.textContent = "Não foi possível consultar o CEP.";
            statusCep.className = "status-cep erro";
        }
        limparEndereco();
    }
}

function limparEndereco() {
    ["rua", "bairro", "cidade", "estado"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}


// =====================================================
// 5. TRANSIÇÃO DE ETAPAS (IR PARA PAGAMENTO / VOLTAR)
// =====================================================

function avançarParaPagamento() {
    const nomeEl = document.getElementById("nome");
    const cpfEl = document.getElementById("cpf");
    const cepEl = document.getElementById("cep");
    const ruaEl = document.getElementById("rua");
    const numeroEl = document.getElementById("numero");

    const nome = nomeEl ? nomeEl.value.trim() : "";
    const cpfValor = cpfEl ? cpfEl.value.trim() : "";
    const cepValor = cepEl ? cepEl.value.trim() : "";
    const rua = ruaEl ? ruaEl.value.trim() : "";
    const numero = numeroEl ? numeroEl.value.trim() : "";

    if (!nome) {
        alert("Informe seu nome completo.");
        if (nomeEl) nomeEl.focus();
        return;
    }
    if (cpfValor.replace(/\D/g, "").length !== 11) {
        alert("Informe um CPF válido.");
        if (cpfEl) cpfEl.focus();
        return;
    }
    if (cepValor.replace(/\D/g, "").length !== 8 || !rua) {
        alert("Informe um CEP e endereço válidos.");
        if (cepEl) cepEl.focus();
        return;
    }
    if (!numero) {
        alert("Informe o número do endereço.");
        if (numeroEl) numeroEl.focus();
        return;
    }

    const blocoEtapa1 = document.getElementById("blocoEtapa1");
    const blocoEtapa2 = document.getElementById("blocoEtapa2");
    const indicadorPasso1 = document.getElementById("indicadorPasso1");
    const indicadorPasso2 = document.getElementById("indicadorPasso2");
    const linhaPasso = document.getElementById("linhaPasso");

    if (blocoEtapa1 && blocoEtapa2) {
        blocoEtapa1.classList.remove("ativa");
        blocoEtapa1.style.display = "none";

        blocoEtapa2.classList.add("ativa");
        blocoEtapa2.style.display = "block";
    }

    if (indicadorPasso1) indicadorPasso1.classList.remove("ativo");
    if (indicadorPasso2) indicadorPasso2.classList.add("ativo");
    if (linhaPasso) linhaPasso.classList.add("ativo");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarParaEndereco() {
    const blocoEtapa1 = document.getElementById("blocoEtapa1");
    const blocoEtapa2 = document.getElementById("blocoEtapa2");
    const indicadorPasso1 = document.getElementById("indicadorPasso1");
    const indicadorPasso2 = document.getElementById("indicadorPasso2");
    const linhaPasso = document.getElementById("linhaPasso");

    if (blocoEtapa1 && blocoEtapa2) {
        blocoEtapa2.classList.remove("ativa");
        blocoEtapa2.style.display = "none";

        blocoEtapa1.classList.add("ativa");
        blocoEtapa1.style.display = "block";
    }

    if (indicadorPasso2) indicadorPasso2.classList.remove("ativo");
    if (indicadorPasso1) indicadorPasso1.classList.add("ativo");
    if (linhaPasso) linhaPasso.classList.remove("ativo");

    window.scrollTo({ top: 0, behavior: "smooth" });
}


// =====================================================
// 6. INICIALIZAÇÃO E EVENTOS AO CARREGAR
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    checarEAtualizarMenu();
    renderizarResumo();
    inicializarMascarasECep();

    const overlay = obterOverlay();
    if (overlay) {
        overlay.addEventListener("click", fecharTudo);
    }

    // Vincula o botão Ir para Pagamento
    const btnIrParaPagamento = document.getElementById("btnIrParaPagamento");
    if (btnIrParaPagamento) {
        btnIrParaPagamento.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            avançarParaPagamento();
        });
    }

    // Vincula o botão Voltar
    const btnVoltarEtapa = document.getElementById("btnVoltarEtapa");
    if (btnVoltarEtapa) {
        btnVoltarEtapa.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            voltarParaEndereco();
        });
    }

    // Vincula o Submit do Formulário Final
    const formEntrega = document.getElementById("formEntrega");
    if (formEntrega) {
        formEntrega.addEventListener("submit", async function (event) {
            event.preventDefault();

            const idCliente = obterIdClienteLocal();
            const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

            if (!usuario && !idCliente) {
                alert("Sua sessão expirou. Faça login novamente.");
                window.location.href = "/TelaLogin/login.html";
                return;
            }

            const nome = document.getElementById("nome").value.trim();
            const cpfValor = document.getElementById("cpf").value.trim();
            const cepValor = document.getElementById("cep").value.trim();
            const rua = document.getElementById("rua").value.trim();
            const numero = document.getElementById("numero").value.trim();
            const bairro = document.getElementById("bairro").value.trim();
            const cidade = document.getElementById("cidade").value.trim();
            const estado = document.getElementById("estado").value.trim();
            const complemento = document.getElementById("complemento") ? document.getElementById("complemento").value.trim() : "";

            const formaPagamentoEl = document.querySelector('input[name="formaPagamento"]:checked');
            const formaPagamento = formaPagamentoEl ? formaPagamentoEl.value : "pix";

            const btn = document.getElementById("btnContinuar");
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Finalizando pedido...";
            }

            try {
                const itens = itensPedido.map(produto => ({
                    id_produto: Number(produto.id_produto),
                    quantidade: Number(produto.quantidade) || 1,
                    preco: Number(produto.preco)
                }));

                const resposta = await fetch("/finalizar_pedido.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        id_cliente: idCliente ? Number(idCliente) : (usuario ? Number(usuario.id_cliente) : null),
                        cpf: cpfValor,
                        nome: nome,
                        forma_pagamento: formaPagamento,
                        endereco: {
                            cep: cepValor,
                            rua: rua,
                            numero: numero,
                            complemento: complemento,
                            bairro: bairro,
                            cidade: cidade,
                            estado: estado
                        },
                        itens: itens
                    })
                });

                const resultado = await resposta.json();

                if (resposta.ok && resultado.sucesso) {
                    localStorage.removeItem("carrinho");
                    localStorage.removeItem("pedidos");
                    localStorage.removeItem("totalPedido");
                    alert("Pedido realizado com sucesso!");
                    window.location.href = "/TelaCliente/cliente.html";
                } else {
                    alert(resultado.mensagem || "Erro ao finalizar pedido.");
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = "Finalizar Compra";
                    }
                }

            } catch (erro) {
                console.error("Erro ao finalizar:", erro);
                alert("Não foi possível conectar ao servidor.");
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Finalizar Compra";
                }
            }
        });
    }
});
