// =====================================================
// ZORA - PAINEL DO CLIENTE (PERFIL, ENDEREÇO E COMPRAS)
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    carregarDadosPerfil();
    carregarCompras();

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
});

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

// Requisitor universal com injeção automática de id_cliente
async function fazerFetchComID(endpoint, opcoes = {}) {
    const idCliente = obterIdClienteLocal();
    let urlFinal = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    if (idCliente) {
        const separador = urlFinal.includes("?") ? "&" : "?";
        urlFinal += `${separador}id_cliente=${encodeURIComponent(idCliente)}`;
    }

    return await fetch(urlFinal, {
        credentials: "include",
        ...opcoes
    });
}

// =====================================================
// CARREGAR DADOS DO PERFIL E ENDEREÇO
// =====================================================

async function carregarDadosPerfil() {
    try {
        const resposta = await fazerFetchComID("cliente.php", { method: "GET" });
        const texto = await resposta.text();

        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            console.error("Erro no JSON de cliente.php:", texto);
            return;
        }

        if (!resposta.ok || !resultado.sucesso) {
            console.error("Erro ao carregar cliente:", resultado.mensagem);
            return;
        }

        const cliente = resultado.cliente || {};
        const endereco = resultado.endereco || {};

        if (document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = cliente.nome || "Usuário";
        if (document.getElementById("emailUsuario")) document.getElementById("emailUsuario").textContent = cliente.email || "-";
        if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").textContent = cliente.nome || "-";
        if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").textContent = cliente.email || "-";
        if (document.getElementById("telefonePerfil")) document.getElementById("telefonePerfil").textContent = cliente.telefone || "-";

        preencherEnderecoTela(endereco);

    } catch (erro) {
        console.error("Erro no fetch de perfil:", erro);
    }
}

function preencherEnderecoTela(endereco) {
    if (!endereco) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val && val !== "-" && val !== "") ? val : "-";
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
        const resposta = await fazerFetchComID("historico_pedidos.php", { method: "GET" });
        const resultado = await resposta.json();

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
            compraCard.style.cssText = "background:#fff; border:1px solid #e2e2e2; border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04);";

            const dataFormatada = compra.data || "-";

            const produtosHTML = (compra.produtos || []).map(produto => {
                const qtd = Number(produto.quantidade) || 1;
                const precoNum = Number(produto.preco) || 0;
                const preco = precoNum.toFixed(2).replace(".", ",");
                const subtotal = (precoNum * qtd).toFixed(2).replace(".", ",");

                const statusGlobal = (compra.status || "").toLowerCase();
                const podeDevolver = !["devolvido", "cancelado"].includes(statusGlobal);

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                        <div>
                            <p style="margin:0; font-size:14px; color:#222;"><strong>${qtd}x ${produto.nome || 'Produto ZORA'}</strong></p>
                            <small style="color:#777;">R$ ${preco} unit. | Subtotal: R$ ${subtotal}</small>
                        </div>
                        <div>
                            ${podeDevolver ? 
                                `<button type="button" onclick="abrirModalDevolucao(${compra.id_pedido}, ${produto.id_produto}, '${(produto.nome || 'Produto').replace(/'/g, "\\'")}')" style="background:#dc3545; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">
                                    Solicitar Devolução
                                 </button>` : 
                                `<span style="color:#888; font-size:12px; font-weight:bold;">Devolução Solicitada</span>`
                            }
                        </div>
                    </div>
                `;
            }).join("");

            const total = Number(compra.total || 0).toFixed(2).replace(".", ",");

            compraCard.innerHTML = `
                <div class="compra-header" style="display:flex; justify-content:space-between; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
                    <div>
                        <h4 style="margin:0; font-size:15px; color:#111;">Pedido #${String(compra.id_pedido).padStart(4, "0")}</h4>
                        <p class="data" style="margin:4px 0 0; color:#888; font-size:12px;">Data: ${dataFormatada}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="margin:0; color:#888; font-size:11px;">Total do Pedido</p>
                        <p style="margin:0; font-weight:bold; color:#a94460; font-size:16px;">R$ ${total}</p>
                    </div>
                </div>

                <div class="compra-produtos" style="margin-top:10px;">
                    ${produtosHTML}
                </div>

                <div class="compra-footer" style="margin-top:12px; font-size:13px; display:flex; justify-content:space-between; align-items:center;">
                    <p style="margin:0;"><strong>Status:</strong> <span style="color:#28a745; font-weight:bold;">${compra.status || 'Aprovado'}</span></p>
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
// EDIÇÃO E BOTÕES DE AÇÃO
// =====================================================

function mostrarEdicaoNome() {
    const displayGroup = document.getElementById("nomeDisplayGroup");
    const edicaoGroup = document.getElementById("nomeEdicaoGroup");

    if (displayGroup && edicaoGroup) {
        displayGroup.style.display = "none";
        edicaoGroup.style.display = "block";
        const nomePerfil = document.getElementById("nomePerfil");
        if (nomePerfil) {
            document.getElementById("novoNomeInput").value = nomePerfil.textContent !== "-" ? nomePerfil.textContent : "";
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
    const novoNome = document.getElementById("novoNomeInput").value.trim();

    if (!novoNome) {
        alert("Informe um nome válido.");
        return;
    }

    try {
        const resposta = await fazerFetchComID("atualizar_perfil.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: novoNome })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível atualizar o nome.");
            return;
        }

        alert("Nome atualizado com sucesso!");
        
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            const usr = JSON.parse(dadosLocais);
            usr.nome = novoNome;
            localStorage.setItem("usuarioLogado", JSON.stringify(usr));
        }

        cancelarEdicaoNome();
        await carregarDadosPerfil();

    } catch (erro) {
        console.error("Erro ao atualizar nome:", erro);
        alert("Erro ao conectar ao servidor.");
    }
}

function mostrarEdicaoEndereco() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (existente) existente.style.display = "none";
    if (edicao) edicao.style.display = "block";

    const getVal = (id) => {
        const el = document.getElementById(id);
        return (el && el.textContent !== "-") ? el.textContent : "";
    };

    if (document.getElementById("cepEdicao")) document.getElementById("cepEdicao").value = getVal("cepPerfil");
    if (document.getElementById("ruaEdicao")) document.getElementById("ruaEdicao").value = getVal("ruaPerfil");
    if (document.getElementById("numeroEdicao")) document.getElementById("numeroEdicao").value = getVal("numeroPerfil");
    if (document.getElementById("complementoEdicao")) document.getElementById("complementoEdicao").value = getVal("complementoPerfil");
    if (document.getElementById("bairroEdicao")) document.getElementById("bairroEdicao").value = getVal("bairroPerfil");
    if (document.getElementById("cidadeEdicao")) document.getElementById("cidadeEdicao").value = getVal("cidadePerfil");
    if (document.getElementById("estadoEdicao")) document.getElementById("estadoEdicao").value = getVal("estadoPerfil");
}

function cancelarEdicao() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (edicao) edicao.style.display = "none";
    if (existente) existente.style.display = "block";
}

async function buscarCEPEdicao() {
    const cepInput = document.getElementById("cepEdicao");
    if (!cepInput) return;

    const valor = cepInput.value.replace(/\D/g, "");
    if (valor.length !== 8) return;

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        const dados = await resposta.json();

        if (dados.erro) {
            alert("CEP não encontrado.");
            return;
        }

        if (document.getElementById("ruaEdicao")) document.getElementById("ruaEdicao").value = dados.logradouro || "";
        if (document.getElementById("bairroEdicao")) document.getElementById("bairroEdicao").value = dados.bairro || "";
        if (document.getElementById("cidadeEdicao")) document.getElementById("cidadeEdicao").value = dados.localidade || "";
        if (document.getElementById("estadoEdicao")) document.getElementById("estadoEdicao").value = dados.uf || "";

        const numInput = document.getElementById("numeroEdicao");
        if (numInput) numInput.focus();

    } catch (erro) {
        console.error("Erro ao consultar CEP:", erro);
    }
}

async function salvarEndereco() {
    const cep = document.getElementById("cepEdicao").value.trim();
    const rua = document.getElementById("ruaEdicao").value.trim();
    const numero = document.getElementById("numeroEdicao").value.trim();
    const complemento = document.getElementById("complementoEdicao").value.trim();
    const bairro = document.getElementById("bairroEdicao").value.trim();
    const cidade = document.getElementById("cidadeEdicao").value.trim();
    const estado = document.getElementById("estadoEdicao").value.trim();

    if (!cep || !rua || !numero || !bairro || !cidade || !estado) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const resposta = await fazerFetchComID("atualizar_endereco.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cep, rua, numero, complemento, bairro, cidade, estado })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível atualizar o endereço.");
            return;
        }

        alert("Endereço atualizado com sucesso!");
        cancelarEdicao();
        await carregarDadosPerfil();

    } catch (erro) {
        console.error("Erro ao atualizar endereço:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}

// =====================================================
// MODAL DE DEVOLUÇÃO E LOGOUT
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
    if (modal) modal.style.display = "none";
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_pedido: Number(idPedido), id_produto: Number(idProduto), motivo: motivo })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível solicitar a devolução.");
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

async function logout() {
    if (!confirm("Você tem certeza que deseja sair?")) return;

    try {
        await fazerFetchComID("logout.php", { method: "POST" });
    } catch (e) {
    } finally {
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    }
}

function showSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.add("active");
}

function hideSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("active");
}
