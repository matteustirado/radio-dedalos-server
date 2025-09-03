document.addEventListener('DOMContentLoaded', () => {
    const idleScreen = document.getElementById('idle-screen');
    const voteScreen = document.getElementById('vote-screen');
    const optionCards = document.querySelectorAll('.option-card');
    const voteMessage = document.getElementById('vote-message');
    
    let voteCasted = false;
    let newRegistrationPending = false;

    const showMessage = (message, isError = false) => {
        voteMessage.textContent = message;
        voteMessage.classList.remove('hidden', 'error');
        if (isError) {
            voteMessage.classList.add('error');
        }
    };

    const showVoteScreen = () => {
        idleScreen.classList.add('hidden');
        voteScreen.classList.remove('hidden');
        voteCasted = false;
        voteMessage.classList.add('hidden');
        optionCards.forEach(card => {
            card.disabled = false;
            card.style.opacity = '1';
            card.classList.remove('selected');
        });
    };

    const showIdleScreen = () => {
        voteScreen.classList.add('hidden');
        idleScreen.classList.remove('hidden');
        newRegistrationPending = false;
    };

    const handleVote = async (option) => {
        if (voteCasted) return;
        voteCasted = true;

        optionCards.forEach(card => {
            card.disabled = true;
            if (card.dataset.option === option) {
                card.classList.add('selected');
            } else {
                card.style.opacity = '0.5';
            }
        });

        showMessage('Voto computado com sucesso! Obrigado por participar.');

        try {
            console.log(`Voto enviado: ${option}`);
            setTimeout(showIdleScreen, 3000);

        } catch (error) {
            showMessage(`Erro ao enviar o voto: ${error.message}`, true);
            optionCards.forEach(card => {
                card.disabled = false;
                card.style.opacity = '1';
                card.classList.remove('selected');
            });
            voteCasted = false;
        }
    };

    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedOption = card.dataset.option;
            handleVote(selectedOption);
        });
    });

    const simulateNewRegistration = () => {
        if (!newRegistrationPending) {
            newRegistrationPending = true;
            console.log('Novo cadastro detectado! Liberando votação.');
            showVoteScreen();
            
            setTimeout(() => {
                if (newRegistrationPending && !voteCasted) {
                    console.log('Tempo esgotado para votação, voltando para tela de descanso.');
                    showIdleScreen();
                }
            }, 20000);
        }
    };
    
    showIdleScreen();
});