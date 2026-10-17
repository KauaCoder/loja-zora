// =====================================================
// ZORA - TELA DE ENTREGA E PAGAMENTO
// PostgreSQL + Sessão PHP
// =====================================================

// MENU MOBILE
const sidebar = document.querySelector(".sidebar");

function showSidebar() {
    if (sidebar) sidebar.classList.add("active");
}

function hideSidebar() {
    if (sidebar) sidebar.classList.remove("active");
}

// VERIFICAR LOGIN
async function verificarLogin() {
    try {
        const resposta = await fetch("/usuario_logado.php", {
            method: "GET",
            credentials: "include"
        });

        const resultado = await resposta.json();
        const logado = resultado.sucesso === true && resultado.logado === true;

        const menuUsuario = document.getElementById("menuUsuario");
        const menuUsuarioMobile = document.getElementById("menuUsuarioMobile");

        const texto = logado ? "Perfil" : "Login";

        if (menuUsuario) menuUsuario.textContent = texto;
        if (menuUsuarioMobile) menuUsuarioMobile.textContent = texto;

        return logado;
    } catch (erro) {
        console.error("Erro ao verificar login:", erro);
        return false;
    }
}

async function abrirPerfil() {
    const logado = await verificarLogin();
    if (logado) {
        window.location.href = "/TelaCliente/cliente.html";
    } else {
        window.location.href = "/TelaLogin/login.html";
    }
}

verificarLogin();

// CARREGAR CARRINHO / PEDIDO
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

// VERIFICAR SE O PEDIDO ESTÁ VAZIO
if (!totalPedido || !itensPedido || itensPedido.length === 0) {
    alert("Seu carrinho está vazio.");
    window.location.href = "/Telainicial/index.html";
} else {
    document.addEventListener("DOMContentLoaded", renderizarResumo);
}

// RENDERIZAR RESUMO DO PEDIDO
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

// MÁSCARA CPF E CEP
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

async function buscarCEP() {
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
// NAVEGAÇÃO ENTRE AS ETAPAS (CORRIGIDA)
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    const btnIrParaPagamento = document.getElementById("btnIrParaPagamento");
    const btnVoltarEtapa = document.getElementById("btnVoltarEtapa");
    const blocoEtapa1 = document.getElementById("blocoEtapa1");
    const blocoEtapa2 = document.getElementById("blocoEtapa2");
    const indicadorPasso1 = document.getElementById("indicadorPasso1");
    const indicadorPasso2 = document.getElementById("indicadorPasso2");
    const linhaPasso = document.getElementById("linhaPasso");

    // CLIQUE PARA AVANÇAR
    if (btnIrParaPagamento) {
        btnIrParaPagamento.addEventListener("click", function () {
            const nome = document.getElementById("nome").value.trim();
            const cpfValor = document.getElementById("cpf").value.trim();
            const cepValor = document.getElementById("cep").value.trim();
            const rua = document.getElementById("rua").value.trim();
            const numero = document.getElementById("numero").value.trim();

            if (!nome) {
                alert("Informe seu nome completo.");
                document.getElementById("nome").focus();
                return;
            }
            if (cpfValor.replace(/\D/g, "").length !== 11) {
                alert("Informe um CPF válido.");
                document.getElementById("cpf").focus();
                return;
            }
            if (cepValor.replace(/\D/g, "").length !== 8 || !rua) {
                alert("Informe um CEP e endereço válidos.");
                document.getElementById("cep").focus();
                return;
            }
            if (!numero) {
                alert("Informe o número do endereço.");
                document.getElementById("numero").focus();
                return;
            }

            // Alterna a classe 'ativa'
            if (blocoEtapa1 && blocoEtapa2) {
                blocoEtapa1.classList.remove("ativa");
                blocoEtapa2.classList.add("ativa");
            }

            // Atualiza indicadores visuais do topo (1 e 2)
            if (indicadorPasso1) indicadorPasso1.classList.remove("ativo");
            if (indicadorPasso2) indicadorPasso2.classList.add("ativo");
            if (linhaPasso) linhaPasso.classList.add("ativo");

            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // CLIQUE PARA VOLTAR
    if (btnVoltarEtapa) {
        btnVoltarEtapa.addEventListener("click", function () {
            if (blocoEtapa1 && blocoEtapa2) {
                blocoEtapa2.classList.remove("ativa");
                blocoEtapa1.classList.add("ativa");
            }

            if (indicadorPasso2) indicadorPasso2.classList.remove("ativo");
            if (indicadorPasso1) indicadorPasso1.classList.add("ativo");
            if (linhaPasso) linhaPasso.classList.remove("ativo");

            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
});

// =====================================================
// FINALIZAR PEDIDO (SUBMIT FINAL)
// =====================================================

const formEntrega = document.getElementById("formEntrega");

if (formEntrega) {
    formEntrega.addEventListener("submit", async function (event) {
        event.preventDefault();

        const logado = await verificarLogin();
        if (!logado) {
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
