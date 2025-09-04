document.addEventListener('DOMContentLoaded', () => {
    const scoreItems = document.querySelectorAll('.score-pillar');
    const thermometerFill = document.querySelector('.thermometer-fill');
    const thermometerLabel = document.querySelector('.thermometer-label');
    const movementMessage = document.querySelector('.movement-message');

    const MAX_CAPACITY = 200;

    const movementMessages = {
        5: "A galera tá chegando... Que tal um drink pra começar? 🍻",
        10: "A pista tá esquentando! Bora se enturmar e curtir o som. 🎶",
        15: "Clima perfeito pra um drink e uma boa conversa. Quem sabe rola algo mais? 😉",
        20: "A casa tá começando a encher. Ótimo momento para circular e conhecer gente nova. 👀",
        25: "O ambiente tá ficando animado! A música tá boa e a galera tá entrando no clima. 💃",
        30: "Já tem bastante gente bonita por aqui. Que tal se arriscar no labirinto? 😈",
        35: "A pista de dança já é um bom lugar pra começar a caça. 🔥",
        40: "A energia está alta! Desafie alguém com o olhar e veja o que acontece. 😏",
        45: "Metade da casa cheia! As chances de um match estão aumentando... Aproveite! ✨",
        50: "A casa está bombando! O labirinto está te chamando, não vai recusar o convite, né? 🥵",
        55: "Clima quente! A pegação já começou a rolar solta. Não fique de fora! 💦",
        60: "Se você ainda não se perdeu no labirinto, a hora é agora. O fervo tá lá! 🔥",
        65: "Casa cheia, corpos suados e pouca roupa. O cenário perfeito pra se jogar! 😈",
        70: "A tentação está por toda parte. Renda-se aos seus desejos mais secretos. 😉",
        75: "Isto não é um teste: a pegação está LIBERADA! Corpos colados e beijos roubados. 👄",
        80: "O labirinto está pegando fogo! O que acontece no Dédalos, fica no Dédalos. 🤫",
        85: "Nível máximo de tesão no ar. Se você piscar, perde um beijo. 🔥",
        90: "Casa LOTADA! Se você não sair daqui com uma história pra contar, fez errado. 😜",
        95: "É o apocalipse da pegação! Explore cada canto, cada corpo. A noite é sua! 😈💦",
        100: "SOLD OUT! A regra agora é se entregar sem medo! 🔥🥵"
    };

    const updatePlacard = (votes) => {
        if (!votes || typeof votes !== 'object') return;
        const totalVotes = Object.values(votes).reduce((sum, count) => Number(sum) + Number(count), 0);
        scoreItems.forEach(item => {
            const option = item.dataset.option;
            const voteCount = votes[option] || 0;
            const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(0) : 0;
            const fill = item.querySelector('.pillar-fill');
            const percentageText = item.querySelector('.pillar-percentage');
            if (fill && percentageText) {
                fill.style.height = `${percentage}%`;
                percentageText.textContent = `${percentage}%`;
            }
        });
    };

    const updateThermometer = (currentCapacity) => {
        const percentage = Math.min((currentCapacity / MAX_CAPACITY) * 100, 100);
        const roundedPercentage = Math.floor(percentage / 5) * 5;

        thermometerFill.style.width = `${percentage}%`;
        thermometerLabel.textContent = `${percentage.toFixed(0)}%`;

        thermometerFill.classList.toggle('full', percentage >= 100);
        
        movementMessage.textContent = movementMessages[roundedPercentage] || "A diversão está só começando! 🎉";
    };

    const initializeWithMockData = () => {
        const mockPlacardData = { versatil: 10, passivo: 20, ativo: 15, curioso: 5, beber_curtir: 45, so_amizade: 5 };
        const mockCapacity = 80;
        updatePlacard(mockPlacardData);
        updateThermometer(mockCapacity);
    };

    const setupSocketListeners = () => {
        const socket = io();
        socket.on('connect', () => console.log('Placar conectado ao servidor Socket.IO.'));
        socket.on('placardUpdate', updatePlacard);
        socket.on('capacityUpdate', (data) => updateThermometer(data.currentCapacity));
    };
    
    initializeWithMockData();
    setupSocketListeners();
});