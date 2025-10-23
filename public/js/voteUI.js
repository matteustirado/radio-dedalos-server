document.addEventListener('DOMContentLoaded', () => {
    const idleScreen = document.getElementById('idle-screen');
    const voteScreen = document.getElementById('vote-screen');
    const confirmationScreen = document.getElementById('confirmation-screen');
    const optionsGrid = document.getElementById('options-grid');
    const optionTemplate = document.getElementById('option-template');
    
    const loadingText = voteScreen.querySelector('.loading-text');
    const errorText = voteScreen.querySelector('.error-text');

    const detectUnitConfig = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('votebh.html')) {
            return {
                unit: 'bh',
                wsServer: 'https://placarbh-cf51a4a5b78a.herokuapp.com/'
            };
        }
        return {
            unit: 'sp',
            wsServer: 'https://placar-80b3f72889ba.herokuapp.com/'
        };
    };

    const config = detectUnitConfig();
    const unit = config.unit;
    const WS_SERVER_EXTERNAL = config.wsServer;

    console.log(`[voteUI.js] Configurando votação para unidade: ${unit}`);
    console.log(`[voteUI.js] Conectando ao WebSocket: ${WS_SERVER_EXTERNAL}`);

    let voteCasted = false;
    let currentPulseiraId = null;
    let voteTimeout = null;

    const showVoteScreen = () => {
        clearTimeout(voteTimeout);
        idleScreen.classList.add('hidden');
        confirmationScreen.classList.add('hidden');
        voteScreen.classList.remove('hidden');
        voteCasted = false;

        const optionCards = optionsGrid.querySelectorAll('.option-card');
        optionCards.forEach(card => {
            card.disabled = false;
            card.style.opacity = '1';
            card.classList.remove('selected');
        });

        if (optionCards.length > 0) {
            console.log(`Iniciando timeout de votação (${optionCards.length} opções visíveis).`);
            voteTimeout = setTimeout(() => {
                if (!voteCasted) {
                    console.log('Tempo esgotado para votação, voltando para tela de descanso.');
                    showIdleScreen();
                }
            }, 20000);
        } else {
             console.log("Nenhuma opção renderizada, timeout não iniciado.");
             setTimeout(showIdleScreen, 5000);
        }
    };

    const showIdleScreen = () => {
        clearTimeout(voteTimeout);
        voteScreen.classList.add('hidden');
        confirmationScreen.classList.add('hidden');
        idleScreen.classList.remove('hidden');
        currentPulseiraId = null;
    };

    const showConfirmationScreen = () => {
        clearTimeout(voteTimeout);
        voteScreen.classList.add('hidden');
        idleScreen.classList.add('hidden');
        confirmationScreen.classList.remove('hidden');
    };

    const handleVote = async (optionData) => {
        if (voteCasted) return;
        voteCasted = true;

        const optionCards = optionsGrid.querySelectorAll('.option-card');
        optionCards.forEach(card => {
            card.disabled = true;
            if (card.dataset.optionId === optionData.id) {
                 card.classList.add('selected');
            } else {
                 card.style.opacity = '0.5';
            }
        });

        showConfirmationScreen();

        try {
            const payload = {
                pulseiraId: currentPulseiraId,
                optionLabel: optionData.label,
            };
            console.log(`Enviando voto para /api/game/vote/${unit}:`, payload);

            await apiFetch(`/game/vote/${unit}`, {
                 method: 'POST',
                 body: JSON.stringify(payload)
            });

            console.log(`Voto para "${optionData.label}" enviado com sucesso.`);

        } catch (error) {
            console.error("Erro ao enviar voto para o backend:", error);
        } finally {
             setTimeout(showIdleScreen, 5000);
        }
    };

    const populateVoteOptions = (config) => {
        optionsGrid.innerHTML = '';
        optionsGrid.className = 'options-grid';

        if (!config || !config.options || !Array.isArray(config.options) || config.options.length === 0) {
            console.log("Nenhuma opção válida encontrada na configuração.");
            errorText.textContent = 'Nenhuma opção de voto configurada.';
            errorText.classList.remove('hidden');
            loadingText.classList.add('hidden');
            return false;
        }
        
        if (!optionTemplate) {
            console.error("Falha crítica: <template id='option-template'> não encontrado.");
            errorText.textContent = 'Erro interno ao carregar layout (Template missing).';
            errorText.classList.remove('hidden');
            loadingText.classList.add('hidden');
            return false;
        }

        const count = config.options.length;
        console.log(`Renderizando ${count} opções.`);

        if (count > 0 && count <= 9) {
             optionsGrid.classList.add(`count-${count}`);
        } else if (count > 9) {
             optionsGrid.classList.add(`count-9`);
        }

        config.options.forEach((option, index) => {
            const clone = optionTemplate.content.cloneNode(true);
            const button = clone.querySelector('.option-card');
            const visualWrapper = clone.querySelector('.option-visual');
            const emojiSpan = clone.querySelector('.option-emoji');
            const imageEl = clone.querySelector('.option-image');
            const textSpan = clone.querySelector('.option-text');
            
            const optionId = `option-${index}`;
            button.dataset.optionId = optionId;
            textSpan.textContent = option.label;
            
            emojiSpan.classList.add('hidden');
            imageEl.classList.add('hidden');
            visualWrapper.classList.add('hidden');

            if (option.type === 'image' && option.value) {
                const imageUrl = `/assets/uploads/game_options/${unit}/${option.value}?t=${Date.now()}`;
                imageEl.src = imageUrl;
                imageEl.alt = option.label;
                imageEl.classList.remove('hidden');
                visualWrapper.classList.remove('hidden');
            } else if (option.type === 'emoji' && option.value) {
                emojiSpan.textContent = option.value;
                emojiSpan.classList.remove('hidden');
                visualWrapper.classList.remove('hidden');
            }

            button.optionData = { id: optionId, label: option.label, type: option.type, value: option.value };

            button.addEventListener('click', () => {
                 handleVote(button.optionData);
            });
            optionsGrid.appendChild(button);
        });
        
        loadingText.classList.add('hidden');
        errorText.classList.add('hidden');
        return true;
    };

    const fetchConfigAndShowVoteScreen = async () => {
         optionsGrid.innerHTML = '';
         loadingText.classList.remove('hidden');
         errorText.classList.add('hidden');
         
         idleScreen.classList.add('hidden');
         confirmationScreen.classList.add('hidden');
         voteScreen.classList.remove('hidden');

        try {
            console.log(`Buscando configuração de /api/game-config/${unit}`);
            const config = await apiFetch(`/game-config/${unit}`);
            console.log('Configuração recebida:', JSON.stringify(config, null, 2));

            const optionsRendered = populateVoteOptions(config);

            if(optionsRendered) {
                console.log("Opções renderizadas, mostrando tela de votação e iniciando timer.");
                showVoteScreen();
            } else {
                 console.log("Nenhuma opção configurada ou erro ao renderizar, agendando retorno para idle.");
                 setTimeout(showIdleScreen, 5000);
            }
        } catch (error) {
            console.error("Erro ao buscar ou popular configuração do jogo:", error);
            optionsGrid.innerHTML = '';
            errorText.textContent = `Erro ao carregar opções: ${error.message}`;
            errorText.classList.remove('hidden');
            loadingText.classList.add('hidden');
            setTimeout(showIdleScreen, 5000);
        }
    };

    const setupExternalSocketListeners = () => {
        console.log(`Conectando ao WebSocket externo: ${WS_SERVER_EXTERNAL}`);
        const externalSocket = io(WS_SERVER_EXTERNAL);

        externalSocket.on('connect', () => {
            console.log('Conectado ao servidor WebSocket externo.');
        });

        externalSocket.on('disconnect', () => {
            console.log('Desconectado do servidor WebSocket externo.');
        });

        externalSocket.on('connect_error', (err) => {
             console.error('Erro ao conectar ao WebSocket externo:', err.message);
        });

        externalSocket.on('new_id', (data) => {
            console.log('GATILHO "new_id" RECEBIDO!', data);
            currentPulseiraId = data.id || 'ID Desconhecido';
            console.log(`ID da Pulseira: ${currentPulseiraId}`);
            fetchConfigAndShowVoteScreen();
        });
    };

    showIdleScreen();
    setupExternalSocketListeners();
});