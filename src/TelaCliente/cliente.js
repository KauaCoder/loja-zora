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
});

// =====================================================
// NAVEGAÇÃO E MENU SIDEBAR
// =====================================================

function showSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.add("active");
}

function hideSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("active");
}

// =====================================================
// REQUISIÇÕES RESILIENTES COM FALLBACK
// =====================================================

async function fazerFetchResiliente(nomeArquivo, opcoes = {}) {
    let idClienteParam = "";
    const dadosLocais = localStorage.getItem("usuarioLogado");
    if (dadosLocais) {
        try {
            const usuario = JSON.parse(dadosLocais);
            if (usuario && usuario.id_cliente) {
                idClienteParam = `id_cliente=${usuario.id_cliente}`;
            }
        } catch (e) {
            console.error("Erro ao ler localStorage:", e);
        }
    }

    const rotasPossiveis = [
        `/${nomeArquivo}`,
        `./${nomeArquivo}`,
        `../${nomeArquivo}`,
        `/TelaCliente/${nomeArquivo}`
    ];

    let ultimoErro = null;

    for (const rota of rotasPossiveis) {
        try {
            let urlFinal = rota;
            if (idClienteParam) {
                urlFinal += (rota.includes("?") ? "&" : "?") + idClienteParam;
            }

            const resposta = await fetch(urlFinal, {
                credentials: "include",
                ...opcoes
            });

            if (resposta.status === 404) {
                continue;
            }

            return resposta;
        } catch (erro) {
            ultimoErro = erro;
        }
    }

    throw ultimoErro || new Error(`Não foi possível conectar ao endpoint ${nomeArquivo}`);
}

async function verificarLogin() {
    try {
        const resposta = await fazerFetchResiliente("usuario_logado.php", { method: "GET" });
        const texto = await resposta.text();
        
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            if (localStorage.getItem("usuarioLogado")) return true;
            window.location.replace("/TelaLogin/login.html");
            return false;
        }

        if (!resultado.sucesso || !resultado.logado) {
            if (localStorage.getItem("usuarioLogado")) return true;
            window.location.replace("/TelaLogin/login.html");
            return false;
        }

        return true;
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        if (localStorage.getItem("usuarioLogado")) return true;
        window.location.replace("/TelaLogin/login.html");
        return false;
    }
}

// =====================================================
// CARREGAR DADOS DO PERFIL
// =====================================================

async function carregarDadosPerfil() {
    const logado = await verificarLogin();
    if (!logado) return;

    try {
        const resposta = await fazerFetchResiliente("cliente.php", { method: "GET" });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar os dados.");
        }

        const cliente = resultado.cliente;

        if (document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = cliente.nome || "Usuário";
        if (document.getElementById("emailUsuario")) document.getElementById("emailUsuario").textContent = cliente.email || "-";
        if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").textContent = cliente.nome || "-";
        if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").textContent = cliente.email || "-";
        if (document.getElementById("telefonePerfil")) document.getElementById("telefonePerfil").textContent = cliente.telefone || "-";

        carregarEndereco(resultado.endereco);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        
        const dadosLocais = localStorage.getItem("usuarioLogado");
        if (dadosLocais) {
            try {
                const usuario = JSON.parse(dadosLocais);
                if (document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = usuario.nome || "Usuário";
                if (document.getElementById("emailUsuario")) document.getElementById("emailUsuario").textContent = usuario.email || "-";
                if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").textContent = usuario.nome || "-";
                if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").textContent = usuario.email || "-";
            } catch (err) {}
        }
    }
}

// EDITAR NOME
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
        const resposta = await fazerFetchResiliente("atualizar_perfil.php", {
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
        
        // Atualiza na memória local
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

// =====================================================
// CARREGAR E EDITAR ENDEREÇO
// =====================================================

function carregarEndereco(endereco) {
    if (!endereco) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val && val !== "-") ? val : "-";
    };

    setVal("cepPerfil", endereco.cep);
    setVal("ruaPerfil", endereco.rua);
    setVal("numeroPerfil", endereco.numero);
    setVal("complementoPerfil", endereco.complemento);
    setVal("bairroPerfil", endereco.bairro);
    setVal("cidadePerfil", endereco.cidade);
    setVal("estadoPerfil", endereco.estado);
}

function mostrarEdicaoEndereco() {
    const existente = document.getElementById("endereco-existente");
    const edicao = document.getElementById("endereco-edicao");

    if (existente) existente.style.display = "none";
    if (edicao) edicao.style.display = "block";

    // Preenche os campos de input com os dados que estão exibidos atualmente
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
        if (document.getElementById("complementoEdicao") && dados.complemento) {
            document.getElementById("complementoEdicao").value = dados.complemento;
        }

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
        const resposta = await fazerFetchResiliente("atualizar_endereco.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cep, rua, numero, complemento, bairro, cidade, estado
            })
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
// CARREGAR COMPRAS E HISTÓRICO
// =====================================================

async function carregarCompras() {
    const comprasVazio = document.getElementById("compras-vazio");
    const comprasLista = document.getElementById("compras-lista");

    if (!comprasVazio || !comprasLista) return;

    try {
        const resposta = await fazerFetchResiliente("historico_pedidos.php", { method: "GET" });
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível carregar as compras.");
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

            const data = new Date(compra.data || compra.data_pedido);
            const dataFormatada = isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");

            const produtosHTML = (compra.produtos || compra.itens || []).map(produto => {
                const qtd = Number(produto.quantidade || produto.qtd) || 1;
                const precoNum = Number(produto.preco || produto.preco_unitario || 0);
                const preco = precoNum.toFixed(2).replace(".", ",");
                const subtotal = (precoNum * qtd).toFixed(2).replace(".", ",");
                
                const statusGlobal = (compra.status || "").toLowerCase();
                const statusProd = (produto.status || "").toLowerCase();
                const podeDevolver = !["devolvido", "cancelado"].includes(statusGlobal) && !["devolvido", "cancelado"].includes(statusProd);

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                        <div>
                            <p style="margin:0; font-size:14px;"><strong>${qtd}x ${produto.nome || 'Produto ZORA'}</strong></p>
                            <small style="color:#666;">R$ ${preco} unit. | Subtotal: R$ ${subtotal}</small>
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

            const total = Number(compra.total || compra.valor_total || 0).toFixed(2).replace(".", ",");

            compraCard.innerHTML = `
                <div class="compra-header" style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <div class="compra-info">
                        <h4 style="margin:0; font-size:16px;">Pedido #${String(compra.id_pedido).padStart(4, "0")}</h4>
                        <p class="data" style="margin:4px 0 0; color:#777; font-size:13px;">${dataFormatada}</p>
                    </div>
                    <div class="compra-total" style="text-align:right;">
                        <p class="label" style="margin:0; color:#777; font-size:12px;">Total</p>
                        <p class="preco" style="margin:0; font-weight:bold; color:#a94460;">R$ ${total}</p>
                    </div>
                </div>

                <div class="compra-produtos" style="margin-top:10px;">
                    ${produtosHTML}
                </div>

                <div class="compra-footer" style="margin-top:10px; font-size:13px;">
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
// MODAL DE DEVOLUÇÃO E SUBMIT
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

    const idPedido = document.getElementById("devolucaoIdPedido") ? document.getElementById("devolucaoIdPedido").value : null;
    const idProduto = document.getElementById("devolucaoIdProduto") ? document.getElementById("devolucaoIdProduto").value : null;
    const motivoEl = document.getElementById("motivoDevolucao");
    const motivo = motivoEl ? motivoEl.value : "";

    if (!motivo) {
        alert("Selecione o motivo da devolução.");
        return;
    }

    try {
        const resposta = await fazerFetchResiliente("solicitar_devolucao.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_pedido: Number(idPedido),
                id_produto: Number(idProduto),
                motivo: motivo
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível solicitar a devolução.");
            return;
        }

        alert("Solicitação de devolução registrada com sucesso!");
        if (motivoEl) motivoEl.value = "";
        fecharModalDevolucao();
        await carregarCompras();

    } catch (erro) {
        console.error("Erro na devolução:", erro);
        alert("Erro ao conectar ao servidor.");
    }
}

// =====================================================
// LOGOUT DA CONTA
// =====================================================

async function logout() {
    if (!confirm("Você tem certeza que deseja sair?")) {
        return;
    }

    try {
        await fazerFetchResiliente("logout.php", { method: "POST" });
    } catch (e) {
        console.error("Erro ao efetuar logout no PHP:", e);
    } finally {
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    }
}
