document.addEventListener('DOMContentLoaded', () => {
    const config = ValidationConfig;
    const isClientCodeValid = config.getValidationFunction();

    const searchInput = document.getElementById('search-input');
    const dropdownContent = document.getElementById('dropdown-content');
    const requestBtn = document.getElementById('request-btn');
    const suggestBtn = document.getElementById('suggest-btn');
    const clientCodeInput = document.getElementById('client-code');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingArtist = document.getElementById('now-playing-artist');
    const nowPlayingCard = document.querySelector('.now-playing-card');
    const nextUpGrid = document.getElementById('next-up-grid');
    const dailyThemeTitle = document.getElementById('daily-theme-title');
    const dailyThemeArtists = document.getElementById('daily-theme-artists');
    const playlistDescription = document.getElementById('playlist-description');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const fullscreenTrigger = document.getElementById('fullscreen-trigger');
    const passwordPopup = document.getElementById('password-popup');
    const exitPasswordInput = document.getElementById('exit-password');
    const submitPasswordBtn = document.getElementById('submit-password-btn');
    const passwordError = document.getElementById('password-error');
    const reenterOverlay = document.getElementById('reenter-fullscreen-overlay');
    const messageAlertEl = document.getElementById('success-message');
    const messageTextEl = document.getElementById('success-text');

    const EXIT_PASSWORD = 'dedalos';
    let isFullscreenLocked = false;
    let selectedSongId = null;
    let playbackTimer = null;

    const resetRequestButton = () => {
        requestBtn.disabled = false;
        requestBtn.classList.remove('error');
        requestBtn.innerHTML = '<i class="fas fa-music"></i> Pedir Música';
    };

    const resetSuggestButton = () => {
        suggestBtn.disabled = false;
        suggestBtn.classList.remove('error');
        suggestBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Sugerir Adição';
    };

    const showMessage = (message, type = 'success') => {
        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert', 'hidden');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };

    const render = () => {
        const state = radioPlayer.getState();
        const { upcomingRequests, playerState, currentSong } = state;
        updatePlayerUI(currentSong, playerState);
        renderNextUp(upcomingRequests);
        renderPlaylistInfo(upcomingRequests);
    };

    const updatePlayerUI = (nowPlaying, playerState) => {
        clearInterval(playbackTimer);

        const now = new Date();
        const currentHour = now.getHours();
        const isRadioTime = currentHour >= 16 || currentHour < 6;
        const isPlaying = playerState && playerState.isPlaying;

        const titleElement = nowPlayingCard.querySelector('.section-title');
        
        let statusDotHTML = `<span class="status-dot ${isPlaying ? 'online' : 'offline'}"></span>`;

        if (nowPlaying && isPlaying) {
            titleElement.innerHTML = `<i class="fas fa-volume-up icon"></i> ${statusDotHTML} Tocando Agora`;
            nowPlayingTitle.textContent = nowPlaying.title;
            nowPlayingArtist.textContent = nowPlaying.artist_name;
            totalTimeEl.textContent = radioPlayer.formatDuration(nowPlaying.duration_seconds);
            const totalDuration = nowPlaying.duration_seconds;
            const startTime = playerState.playbackStartTimestamp;
            const accumulatedPaused = playerState.accumulatedPausedDuration || 0;
            const calculateProgress = () => {
                let elapsedMillis;
                if (playerState.isPlaying) {
                    elapsedMillis = (Date.now() - startTime) - accumulatedPaused;
                } else {
                    const lastPauseTime = playerState.lastPauseTimestamp || Date.now();
                    elapsedMillis = (lastPauseTime - startTime) - accumulatedPaused;
                }
                const elapsedSeconds = Math.max(0, Math.floor(elapsedMillis / 1000));
                if (elapsedSeconds >= totalDuration) {
                    currentTimeEl.textContent = radioPlayer.formatDuration(totalDuration);
                    progressBarFill.style.width = '100%';
                    clearInterval(playbackTimer);
                } else {
                    currentTimeEl.textContent = radioPlayer.formatDuration(elapsedSeconds);
                    progressBarFill.style.width = `${(elapsedSeconds / totalDuration) * 100}%`;
                }
            };
            calculateProgress();
            if (playerState.isPlaying) {
                playbackTimer = setInterval(calculateProgress, 1000);
            }
        } else {
            if (isRadioTime) {
                titleElement.innerHTML = `<i class="fas fa-volume-up icon"></i> ${statusDotHTML} A Rádio está no Ar`;
                nowPlayingTitle.textContent = 'Vire o DJ!';
                nowPlayingArtist.textContent = 'Faça seu pedido!';
            } else {
                titleElement.innerHTML = `<i class="fas fa-volume-up icon"></i> ${statusDotHTML} Fora do Ar`;
                nowPlayingTitle.textContent = 'Estamos em silêncio...';
                nowPlayingArtist.textContent = 'Voltamos às 16h com a melhor programação!';
            }
            totalTimeEl.textContent = '0:00';
            currentTimeEl.textContent = '0:00';
            progressBarFill.style.width = '0%';
        }
    };

    const renderNextUp = (upcomingRequests) => {
        nextUpGrid.innerHTML = '';
        if (upcomingRequests && upcomingRequests.length > 0) {
            upcomingRequests.slice(0, 3).forEach(song => {
                const item = document.createElement('div');
                item.className = 'next-up-item';
                item.innerHTML = `<p class="next-up-title">${song.title}</p><p class="next-up-artist">${song.artist_name}</p>`;
                nextUpGrid.appendChild(item);
            });
        }
    };

    const renderPlaylistInfo = (upcomingRequests) => {
        const today = new Date().getDay();
        const dailyTitles = ["Domingo Relax", "Segunda é Rock!", "Terça Black Music", "Quarta TOP POP", "Quinta #TBT", "Sexta MIX", "Sábado Rock"];
        const dailyThemes = [
            "Domingo de boa. 😌 Para fechar o fim de semana, uma trilha sonora mais tranquila, com clássicos e sons relaxantes para recarregar as energias. 🛋️☕",
            "Começando a semana com o pé na porta! 🤘 Hoje o dia é movido a guitarras, atitude e os maiores hinos do rock. Aumenta o volume que a energia aqui é garantida! 🎸⚡️",
            "Hoje é dia de celebrar a genialidade e a história da música preta. ✨ Nossa programação é uma homenagem aos artistas negros que revolucionaram o mundo com o soul, o funk e o R&B. E a partir das 23h, nosso DJ residente comanda um set ao vivo especial, mergulhando fundo nesse groove! 🎷🕺",
            "O meio da semana pede um som pra cima! 🎉 A 'Quarta TOP' chega com os maiores hits do pop internacional que estão dominando as paradas. A partir das 23h, a programação esquenta ainda mais com um DJ set especial só com as mais pedidas. 🔊💃",
            "Nostalgia no ar! 📼 Hoje, a programação é toda no clima de #TBT, com os clássicos do pop que a gente ama. E a noite promete: teremos o set especial do nosso 'DJ TBT' e a icônica 'Festa Cueca' rolando na nossa rádio! 🥰",
            "SEXTOU! 🔥 Hoje a gente bota fogo na pista com o MIX mais atualizado da cidade. É dia de virais, funk 🇧🇷 e tudo que tá no hype. A partir das 23h, começa o esquenta oficial para a 'Festa dos Novinhos'! Só vem! 🚀",
            "O aquecimento oficial para a sua noite! 🌃 Hoje é dia de Sábado Rock, com uma seleção de hinos para cantar junto e se preparar pra festa. 🍻"
        ];
        dailyThemeTitle.innerHTML = `<i class="fas fa-info-circle icon"></i> Playlist de Hoje: ${dailyTitles[today]}`;
        playlistDescription.textContent = dailyThemes[today];
        const uniqueArtists = [...new Set((upcomingRequests || []).map(song => song.artist_name.split(',')[0].trim()))].filter(Boolean);
        dailyThemeArtists.innerHTML = '';
        if (uniqueArtists.length > 0) {
            uniqueArtists.slice(0, 6).forEach(artistName => {
                const tag = document.createElement('div');
                tag.className = 'artist-tag';
                tag.textContent = artistName;
                dailyThemeArtists.appendChild(tag);
            });
        }
    };

    const setupAutocomplete = () => {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const { availableJukeboxSongs } = radioPlayer.getState();
            dropdownContent.innerHTML = '';
            if (!searchTerm) {
                dropdownContent.parentElement.classList.remove('show');
                return;
            }
            const results = availableJukeboxSongs.filter(song => song.title.toLowerCase().includes(searchTerm) || (song.artist_name && song.artist_name.toLowerCase().includes(searchTerm)));
            let exactMatchFound = false;
            results.slice(0, 10).forEach(song => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = `${song.title} - ${song.artist_name}`;
                if (item.textContent.toLowerCase() === searchTerm) {
                    exactMatchFound = true;
                    selectedSongId = song.id;
                }
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    searchInput.value = item.textContent;
                    selectedSongId = song.id;
                    dropdownContent.parentElement.classList.remove('show');
                    requestBtn.classList.remove('hidden');
                    suggestBtn.classList.add('hidden');
                });
                dropdownContent.appendChild(item);
            });
            dropdownContent.parentElement.classList.toggle('show', results.length > 0);
            if (!exactMatchFound && searchTerm.length > 2) {
                requestBtn.classList.add('hidden');
                suggestBtn.classList.remove('hidden');
                selectedSongId = null;
            } else {
                requestBtn.classList.remove('hidden');
                suggestBtn.classList.add('hidden');
            }
        });
        searchInput.addEventListener('blur', () => setTimeout(() => dropdownContent.parentElement.classList.remove('show'), 200));
    };

    requestBtn.addEventListener('click', async () => {
        const requester_info = clientCodeInput.value.trim();
        if (!selectedSongId) {
            showMessage('Selecione uma música válida da lista.', 'danger');
            return;
        }
        if (!requester_info) {
            clientCodeInput.classList.add('error');
            return;
        }

        requestBtn.disabled = true;
        requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
        
        const isValid = await isClientCodeValid(requester_info);

        if (!isValid) {
            clientCodeInput.classList.add('error');
            requestBtn.classList.add('error');
            requestBtn.innerHTML = 'Tentar Novamente';
            requestBtn.disabled = false;
            return;
        }

        requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        try {
            const response = await radioPlayer.actions.jukeboxRequest(selectedSongId, requester_info);
            showMessage(response.message || 'Música solicitada com sucesso!');
            searchInput.value = '';
            clientCodeInput.value = '';
            selectedSongId = null;
        } catch (error) {
            showMessage(`Erro: ${error.message}`, 'danger');
        } finally {
            resetRequestButton();
        }
    });

    suggestBtn.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        const requester_info = clientCodeInput.value.trim();
        if (searchTerm.length < 3) {
            showMessage('A sugestão precisa ter pelo menos 3 caracteres.', 'danger');
            return;
        }
        if (!requester_info) {
            clientCodeInput.classList.add('error');
            showMessage('Digite seu nome ou código para sugerir.', 'danger');
            return;
        }

        suggestBtn.disabled = true;
        suggestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';

        const isValid = await isClientCodeValid(requester_info);

        if (!isValid) {
            clientCodeInput.classList.add('error');
            suggestBtn.classList.add('error');
            suggestBtn.innerHTML = 'Tentar Novamente';
            suggestBtn.disabled = false;
            return;
        }

        suggestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        try {
            const response = await radioPlayer.actions.jukeboxSuggest(searchTerm, requester_info, config.unit);
            showMessage(response.message || 'Sugestão enviada com sucesso!');
            searchInput.value = '';
            clientCodeInput.value = '';
            requestBtn.classList.remove('hidden');
            suggestBtn.classList.add('hidden');
        } catch (error) {
            showMessage(`Erro: ${error.message}`, 'danger');
        } finally {
            resetSuggestButton();
        }
    });
    
    clientCodeInput.addEventListener('input', () => {
        if (clientCodeInput.classList.contains('error')) {
            clientCodeInput.classList.remove('error');
            resetRequestButton();
            resetSuggestButton();
        }
        clientCodeInput.value = clientCodeInput.value.replace(/[^0-9]/g, '');
    });

    const enterFullscreen = () => document.documentElement.requestFullscreen().catch(err => console.error(err));
    const exitFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); };
    fullscreenTrigger.addEventListener('click', () => { if (!document.fullscreenElement && !isFullscreenLocked) { enterFullscreen(); isFullscreenLocked = true; } else if (isFullscreenLocked) { passwordPopup.classList.remove('hidden'); exitPasswordInput.focus(); } });
    submitPasswordBtn.addEventListener('click', () => { if (exitPasswordInput.value === EXIT_PASSWORD) { isFullscreenLocked = false; passwordPopup.classList.add('hidden'); passwordError.classList.add('hidden'); exitPasswordInput.value = ''; exitFullscreen(); reenterOverlay.classList.add('hidden'); } else { passwordError.classList.remove('hidden'); exitPasswordInput.value = ''; } });
    exitPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitPasswordBtn.click(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && isFullscreenLocked) { reenterOverlay.classList.remove('hidden'); } else if (document.fullscreenElement) { reenterOverlay.classList.add('hidden'); passwordPopup.classList.add('hidden'); } });
    reenterOverlay.addEventListener('click', () => { if (isFullscreenLocked) enterFullscreen(); });

    radioPlayer.subscribe(render);
    setupAutocomplete();
    ValidationConfig.setupInactivityRedirect();
    radioPlayer.initialize();
});