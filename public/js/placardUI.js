document.addEventListener('DOMContentLoaded', () => {
    const scoreItems = document.querySelectorAll('.score-item');
    const thermometerFill = document.querySelector('.thermometer-fill');
    const thermometerLabel = document.querySelector('.thermometer-label');
    const movementMessage = document.querySelector('.movement-message');

    const MAX_CAPACITY = 200;

    const movementMessages = {
        5: "A galera tá chegando, que tal um drink no bar para ver o que está rolando?",
        20: "O movimento está esquentando! A noite promete...",
        40: "A pista já está animada! Ótimo momento para se jogar.",
        60: "Clima perfeito! A casa está com uma energia incrível.",
        80: "A casa está bombando! A pegação está liberada.",
        100: "Casa cheia! O clima está quente e ótimo para pegação!"
    };

    const updatePlacard = (placardData) => {
        const totalVotes = Object.values(placardData.votes).reduce((sum, count) => sum + count, 0);

        scoreItems.forEach(item => {
            const option = item.dataset.option;
            const votes = placardData.votes[option] || 0;
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(0) : 0;

            const fill = item.querySelector('.progress-bar-fill');
            const percentageText = item.querySelector('.progress-bar-percentage');

            fill.style.width = `${percentage}%`;
            percentageText.textContent = `${percentage}%`;
        });
    };

    const updateThermometer = (currentCapacity) => {
        const percentage = Math.min((currentCapacity / MAX_CAPACITY) * 100, 100).toFixed(0);
        
        thermometerFill.style.width = `${percentage}%`;
        thermometerLabel.textContent = `Movimento: ${percentage}%`;

        let message = movementMessages[5];
        for (const threshold in movementMessages) {
            if (percentage >= threshold) {
                message = movementMessages[threshold];
            }
        }
        movementMessage.textContent = message;
    };

    const initializeWithMockData = () => {
        const mockPlacardData = {
            votes: {
                versatil: 25,
                passivo: 40,
                ativo: 15,
                beber_curtir: 10,
                so_amizade: 5
            }
        };
        const mockCapacity = 80;

        updatePlacard(mockPlacardData);
        updateThermometer(mockCapacity);
    };

    const setupSocketListeners = () => {
        const socket = io();

        socket.on('placardUpdate', (data) => {
            console.log('Dados do placar recebidos:', data);
            updatePlacard(data);
        });

        socket.on('capacityUpdate', (data) => {
            console.log('Dados de capacidade recebidos:', data);
            updateThermometer(data.currentCapacity);
        });
    };
    
    initializeWithMockData();
    setupSocketListeners();
});