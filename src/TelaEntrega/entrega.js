// =====================================================
// ZORA - TELA DE ENTREGA
// PostgreSQL + Sessão PHP
// =====================================================


// =====================================================
// MENU
// =====================================================

const sidebar = document.querySelector(".sidebar");

function showSidebar() {
    if (sidebar) {
        sidebar.classList.add("active");
    }
}

function hideSidebar() {
    if (sidebar) {
        sidebar.classList.remove("active");
    }
}


// =====================================================
// VERIFICAR LOGIN
// =====================================================

async function verificarLogin() {
    try {
        const resposta = await fetch(
            "/usuario_logado.php",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado = await resposta.json();

        const logado =
            resultado.sucesso === true &&
            resultado.logado === true;

        const menuUsuario =
            document.getElementById("menuUsuario");

        const menuUsuarioMobile =
            document.getElementById("menuUsuarioMobile");

        const texto = logado ? "Perfil" : "Login";

        if (menuUsuario) {
            menuUsuario.textContent = texto;
        }

        if (menuUsuarioMobile) {
            menuUsuarioMobile.textContent = texto;
        }

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

// Verifica o login ao carregar
verificarLogin();


// =====================================================
// CARREGAR PEDIDO DO LOCALSTORAGE
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

// Recalcula o total se necessário
if ((!totalPedido || Number(totalPedido) <= 0) && itensPedido.length > 0) {
    totalPedido = itensPedido.reduce((acc, item) => {
        return acc + ((Number(item.preco) || 0) * (Number(item.quantidade) || 1));
    }, 0);
    localStorage.setItem("totalPedido", totalPedido);
}


// =====================================================
// VERIFICAR SE O PEDIDO ESTÁ VAZIO
// =====================================================

if (!totalPedido || !itensPedido || itensPedido.length === 0) {
    alert("Seu carrinho está vazio.");
    window.location.href = "/Telainicial/index.html";
} else {
    document.addEventListener("DOMContentLoaded", renderizarResumo);
}


// =====================================================
// RENDERIZAR RESUMO DO PEDIDO NA TELA
// =====================================================

function renderizarResumo() {
    const valorTotalEl = document.getElementById("valorTotal");

    if (valorTotalEl) {
        valorTotalEl.textContent =
            "R$ " + Number(totalPedido).toFixed(2).replace(".", ",");
    }

    const lista = document.getElementById("listaResumo");

    if (!lista) {
        return;
    }

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
            <span>
                ${quantidade}x ${nome}
            </span>
            <strong>
                R$ ${(preco * quantidade).toFixed(2).replace(".", ",")}
            </strong>
        `;

        lista.appendChild(item);
    });
}


// =====================================================
// MÁSCARA CPF E CEP
// =====================================================

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


// =====================================================
// BUSCAR CEP (VIACEP)
// =====================================================

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
// FINALIZAR PEDIDO
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

        if (!nome || cpfValor.replace(/\D/g, "").length !== 11 || cepValor.replace(/\D/g, "").length !== 8 || !rua || !numero) {
            alert("Preencha todos os campos obrigatórios corretamente.");
            return;
        }

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
                    btn.textContent = "Finalizar Pedido";
                }
            }

        } catch (erro) {
            console.error("Erro ao finalizar:", erro);
            alert("Resposta inválida do servidor.");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Finalizar Pedido";
            }
        }
    });
}
