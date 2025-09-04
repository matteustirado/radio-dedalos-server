document.addEventListener('DOMContentLoaded', () => {
    const idleScreen = document.getElementById('idle-screen');
    const voteScreen = document.getElementById('vote-screen');
    const confirmationScreen = document.getElementById('confirmation-screen');
    const optionCards = document.querySelectorAll('.option-card');

    let voteCasted = false;

    const showVoteScreen = () => {
        idleScreen.classList.add('hidden');
        confirmationScreen.classList.add('hidden');
        voteScreen.classList.remove('hidden');
        voteCasted = false;
        
        optionCards.forEach(card => {
            card.disabled = false;
            card.style.opacity = '1';
            card.classList.remove('selected');
        });

        setTimeout(() => {
            if (!voteCasted) {
                console.log('Tempo esgotado para votação, voltando para tela de descanso.');
                showIdleScreen();
            }
        }, 20000);
    };

    const showIdleScreen = () => {
        voteScreen.classList.add('hidden');
        confirmationScreen.classList.add('hidden');
        idleScreen.classList.remove('hidden');
    };
    
    const showConfirmationScreen = () => {
        voteScreen.classList.add('hidden');
        idleScreen.classList.add('hidden');
        confirmationScreen.classList.remove('hidden');
    };

    const handleVote = async (option) => {
        if (voteCasted) return;
        voteCasted = true;

        optionCards.forEach(card => {
            card.disabled = true;
        });

        showConfirmationScreen();

        try {
            console.log(`Voto enviado: ${option}`);
            setTimeout(showIdleScreen, 8000); // Aumentei o tempo para a mensagem ser lida

        } catch (error) {
            console.error("Erro ao processar voto:", error);
            showIdleScreen(); // Volta para a tela inicial em caso de erro
        }
    };

    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedOption = card.dataset.option;
            handleVote(selectedOption);
        });
    });

    const setupSocketListeners = () => {
        const socket = io();

        socket.on('connect', () => {
            console.log('Conectado ao servidor de Socket.IO para a tela de votação.');
        });

        socket.on('triggerVote', (data) => {
            console.log('Evento "triggerVote" recebido!', data);
            showVoteScreen();
        });
    };

    showIdleScreen();
    setupSocketListeners();
});