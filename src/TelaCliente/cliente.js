// =====================================================
// ZORA - PERFIL DO CLIENTE & DEVOLUÇÕES
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

    // Evento para o formulário de devolução
    const formDevolucao = document.getElementById("formDevolucao");
    if (formDevolucao) {
        formDevolucao.addEventListener("submit", confirmarDevolucao);
    }
});

// FUNÇÃO RESILIENTE: Rotas otimizadas com injeção automática de id_cliente
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

async function carregarDadosPerfil() {
    const logado = await verificarLogin();
    if (!logado) return;

    try {
        const resposta = await fazerFetchResiliente("cliente.php", { method: "GET" });
        const texto = await resposta.text();

        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (e) {
            throw new Error(`Resposta inválida do cliente.php`);
        }

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

function carregarEndereco(endereco) {
    if (!endereco || !endereco.id_endereco) {
        const idsPossiveis = ["cep", "rua", "numero", "complemento", "bairro", "cidade", "estado"];
        idsPossiveis.forEach(campo => {
            [
                document.getElementById(campo),
                document.getElementById(campo + "Perfil"),
                document.getElementById(campo + "Endereco")
            ].forEach(el => {
                if (el) el.textContent = "-";
            });
        });
        return;
    }

    const preencherCampo = (chave, valor) => {
        const texto = (valor !== null && valor !== undefined && valor !== "") ? valor : "-";
        
        const candidatos = [
            document.getElementById(chave),
            document.getElementById(chave + "Perfil"),
            document.getElementById(chave + "Endereco")
        ];

        candidatos.forEach(el => {
            if (el) el.textContent = texto;
        });
    };

    preencherCampo("cep", endereco.cep);
    preencherCampo("rua", endereco.rua);
    preencherCampo("numero", endereco.numero);
    preencherCampo("complemento", endereco.complemento);
    preencherCampo("bairro", endereco.bairro);
    preencherCampo("cidade", endereco.cidade);
    preencherCampo("estado", endereco.estado);
}

// =====================================================
// HISTÓRICO DE COMPRAS & DEVOLUÇÃO
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
            compraCard.style.cssText = "background:#fff; border:1px solid #ddd; border-radius:10px; padding:15px; margin-bottom:15px;";

            const data = new Date(compra.data || compra.data_pedido);
            const dataFormatada = isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR");

            const produtosHTML = (compra.produtos || compra.itens || []).map(produto => {
                const qtd = Number(produto.quantidade || produto.qtd) || 1;
                const precoNum = Number(produto.preco || produto.preco_unitario || 0);
                const preco = precoNum.toFixed(2).replace(".", ",");
                const subtotal = (precoNum * qtd).toFixed(2).replace(".", ",");
                
                // Impede devolução se o pedido todo ou o produto estiver Devolvido ou Cancelado
                const statusGlobal = (compra.status || "").toLowerCase();
                const statusProd = (produto.status || "").toLowerCase();
                const podeDevolver = !["devolvido", "cancelado"].includes(statusGlobal) && !["devolvido", "cancelado"].includes(statusProd);

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                        <div>
                            <p style="margin:0; font-size:14px;"><strong>${qtd}x ${produto.nome || produto.nm_produto || 'Produto ZORA'}</strong></p>
                            <small style="color:#666;">R$ ${preco} unit. | Subtotal: R$ ${subtotal}</small>
                        </div>
                        <div>
                            ${podeDevolver ? 
                                `<button type="button" onclick="abrirModalDevolucao(${compra.id_pedido}, ${produto.id_produto}, '${(produto.nome || produto.nm_produto || 'Produto').replace(/'/g, "\\'")}')" style="background:#dc3545; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">
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
                    <p style="margin:0;"><strong>Status:</strong> <span style="color:#28a745;">${compra.status || 'Aprovado'}</span></p>
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
// CONTROLE DA MODAL DE DEVOLUÇÃO
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

async function sairDoPerfil() {
    if (!confirm("Você tem certeza que deseja sair?")) {
        return;
    }

    try {
        await fazerFetchResiliente("logout.php", { method: "POST" });
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    } catch (erro) {
        console.error("Erro ao realizar logout:", erro);
        localStorage.removeItem("usuarioLogado");
        window.location.replace("/TelaLogin/login.html");
    }
}
