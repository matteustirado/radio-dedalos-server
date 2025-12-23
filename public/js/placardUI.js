document.addEventListener('DOMContentLoaded', () => {
    const placardMainWrapper = document.getElementById('placard-main-wrapper');
    const placardContainer = document.getElementById('placard-container');
    const loadingMessage = document.getElementById('placard-loading');
    const errorMessage = document.getElementById('placard-error');
    const thermometerFill = document.querySelector('.thermometer-fill');
    // REMOVIDO: const thermometerLabel = document.querySelector('.thermometer-label');
    const movementMessage = document.querySelector('.movement-message');

    let currentConfig = null;
    let currentVotes = {};
    
    const MAX_CAPACITIES = {
        sp: 210,
        bh: 162
    };
    

    const detectUnitConfig = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('placardbh.html')) {
            return {
                unit: 'bh',
                wsServer: 'https://placarbh-cf51a4a5b78a.herokuapp.com/',
                apiServer: 'https://dedalosadm2bh-09d55dca461e.herokuapp.com',
                apiToken: '919d97d7df39ecbd0036631caba657221acab99d'
            };
        }
        return {
            unit: 'sp',
            wsServer: 'https://placar-80b3f72889ba.herokuapp.com',
            apiServer: 'https://dedalosadm2-3dab78314381.herokuapp.com',
            apiToken: '7a9e64071564f6fee8d96cd209ed3a4e86801552'
        };
    };

    const config = detectUnitConfig();
    const unit = config.unit;
    const WS_SERVER_EXTERNAL = config.wsServer;
    const API_SERVER_EXTERNAL = config.apiServer;
    const API_TOKEN_EXTERNAL = config.apiToken;

    const MAX_CAPACITY = MAX_CAPACITIES[unit] || 210; 
    
    const movementMessages = {
        0: "A diversão está só começando! 🎉",
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

    const showLoading = () => {
        placardContainer.innerHTML = '';
        if (loadingMessage) loadingMessage.classList.remove('hidden');
        if (errorMessage) errorMessage.classList.add('hidden');
        if (thermometerFill) thermometerFill.parentElement.parentElement.style.opacity = '0';
    };

    const showError = (message) => {
        placardContainer.innerHTML = '';
        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (errorMessage) {
            errorMessage.textContent = `Erro: ${message}`;
            errorMessage.classList.remove('hidden');
        }
        if (thermometerFill) thermometerFill.parentElement.parentElement.style.opacity = '0';
    };

    const renderPlacardStructure = () => {
        if (!currentConfig || !currentConfig.options || !Array.isArray(currentConfig.options) || currentConfig.options.length === 0) {
            showError("Configuração de opções inválida ou vazia.");
            return;
        }

        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (errorMessage) errorMessage.classList.add('hidden');
        placardContainer.innerHTML = '';

        if (placardMainWrapper) {
            placardMainWrapper.className = 'gradient-border';
            placardMainWrapper.classList.add(`${currentConfig.placard_orientation}-layout-wrapper`);
        }
        
        placardContainer.className = 'score-board';
        placardContainer.classList.add(`${currentConfig.placard_orientation}-layout`);
        
        const count = currentConfig.options.length;
        if (count > 0 && count <= 9) {
             placardContainer.classList.add(`count-${count}`);
        } else if (count > 9) {
             placardContainer.classList.add(`count-9`);
        }

        currentConfig.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('placard-option');
            optionElement.dataset.optionLabel = option.label;
            optionElement.dataset.optionIndex = index;

            let visualHTML = '';
            if (option.type === 'image' && option.value) {
                const imageUrl = `/assets/uploads/game_options/${unit}/${option.value}?t=${Date.now()}`;
                visualHTML = `<img src="${imageUrl}" alt="" class="placard-visual placard-image">`;
            } else if (option.type === 'emoji' && option.value) {
                visualHTML = `<span class="placard-visual placard-emoji">${option.value}</span>`;
            } else {
                 visualHTML = `<div class="placard-visual placeholder"></div>`;
            }

            let innerHTML = '';
            
            if (currentConfig.placard_orientation === 'horizontal') {
                optionElement.classList.add('placard-bar-container');
                innerHTML = `
                    <div class="placard-bar-track"></div>
                    <div class="placard-bar"></div>
                    <div class="placard-content-wrapper-horizontal">
                        ${visualHTML}
                        <div class="placard-center-content">
                            <span class="placard-percentage">0%</span>
                            <span class="placard-label">${option.label}</span>
                        </div>
                        ${visualHTML}
                    </div>
                `;
            } else {
                innerHTML = `
                    <div class="placard-bar-container">
                        <div class="placard-bar-track"></div>
                        <div class="placard-bar"></div>
                        <div class="placard-content-wrapper">
                            <span class="placard-percentage">0%</span>
                            ${visualHTML}
                            <span class="placard-label">${option.label}</span>
                        </div>
                    </div>
                `;
            }
            
            optionElement.innerHTML = innerHTML;
            placardContainer.appendChild(optionElement);
        });
        
        if (thermometerFill) thermometerFill.parentElement.parentElement.style.opacity = '1';
    };

    const updatePlacardVotes = (votesData) => {
        if (!currentConfig || !currentConfig.options) return;

        currentVotes = votesData || {};
        let totalVotes = 0;
        Object.values(currentVotes).forEach(count => totalVotes += Number(count));
        
        const optionsWithData = currentConfig.options.map(option => {
            const voteCount = Number(currentVotes[option.label]) || 0;
            const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100) : 0;
            const element = placardContainer.querySelector(`.placard-option[data-option-label="${option.label}"]`);
            
            return {
                option,
                voteCount,
                percentage,
                element
            };
        });

        // Ordenação Decrescente (Ranking)
        optionsWithData.sort((a, b) => b.voteCount - a.voteCount);

        optionsWithData.forEach(item => {
            if (!item.element) return;
            const percentageText = item.percentage.toFixed(0);
            const percentageElement = item.element.querySelector('.placard-percentage');

            if (percentageElement) {
                percentageElement.textContent = `${percentageText}%`;
            }
            // Reordena no DOM
            placardContainer.appendChild(item.element);
        });
    };

    const updateThermometer = (currentCapacity) => {
         // REMOVIDO: thermometerLabel
         if (!thermometerFill || !movementMessage) return;

        const count = Number(currentCapacity) || 0;
        let percentage = 0;
        if (MAX_CAPACITY > 0) { 
            percentage = Math.max(0, Math.min((count / MAX_CAPACITY) * 100, 100));
        }
        const roundedPercentage = Math.max(0, Math.round(percentage / 5) * 5);
        
        thermometerFill.style.width = `${percentage}%`;
        
        // REMOVIDO: thermometerLabel.textContent = ...
        
        thermometerFill.classList.toggle('full', percentage >= 100);
        
        movementMessage.textContent = movementMessages[roundedPercentage] || movementMessages[0];
    };
    
    const buscarContadorExterno = async () => {
        const url = `${API_SERVER_EXTERNAL}/api/contador/`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Authorization': `Token ${API_TOKEN_EXTERNAL}`
                }
            });
            if (!response.ok) {
                throw new Error(`Erro de rede ou acesso negado: ${response.status}`);
            }
            const dados = await response.json();
            const numeroContador = dados.length > 0 ? dados[0].contador : 0;
            updateThermometer(numeroContador); 
        } catch (error) {
            updateThermometer(0);
        }
    };

    const setupInternalSocketListeners = () => {
        const socket = io();
        socket.on('placardUpdate', (data) => {
            if (data && data.unit === unit && data.votes) {
                updatePlacardVotes(data.votes);
            }
        });
    };

    const setupExternalSocketListeners = () => {
        const externalSocket = io(WS_SERVER_EXTERNAL, {
            transports: ['websocket', 'polling']
        });
        externalSocket.on('new_id', () => {
            buscarContadorExterno();
        });
    };

    const initializePlacard = async () => {
        showLoading();
        try {
            const config = await apiFetch(`/game-config/${unit}`);
            currentConfig = config;
            renderPlacardStructure();
            
            const initialVotes = await apiFetch(`/game/counts/${unit}`);
            updatePlacardVotes(initialVotes);

            setupInternalSocketListeners();
            setupExternalSocketListeners();
            buscarContadorExterno();
        } catch (error) {
            showError(error.message);
        }
    };

    initializePlacard();
});