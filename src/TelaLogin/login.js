// =====================================================
// MOSTRAR / OCULTAR SENHA
// =====================================================

function alternarVisibilidadeSenha(idCampo, botao) {
    const campo = document.getElementById(idCampo);

    if (!campo) return;

    const senhaVisivel = campo.type === "text";

    campo.type = senhaVisivel ? "password" : "text";

    // Atualiza o ícone do botão
    botao.innerHTML = senhaVisivel ? "👁" : "🙈";

    // Acessibilidade
    botao.setAttribute(
        "aria-label",
        senhaVisivel ? "Mostrar senha" : "Ocultar senha"
    );
}