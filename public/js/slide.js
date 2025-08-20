document.addEventListener('slidesRendered', () => {
    const slider = document.getElementById('slider');
    if (!slider) {
        console.error('Elemento do slider não encontrado.');
        return;
    }

    const imagens = Array.from(slider.getElementsByTagName('img'));
    if (imagens.length === 0) {
        console.log('Nenhuma imagem para exibir no slider.');
        return;
    }

    let indiceAtual = 0;

    function mostrarSlideSeguinte() {
        const imagemAtual = slider.querySelector('img.active');
        if (imagemAtual) {
            imagemAtual.classList.remove('active');
        }

        indiceAtual = (indiceAtual + 1) % imagens.length;
        imagens[indiceAtual].classList.add('active');
    }

    imagens[0].classList.add('active');

    setInterval(() => {
        mostrarSlideSeguinte();
    }, 5000);
});