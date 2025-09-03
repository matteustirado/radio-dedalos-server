document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    const validRoles = ['dj', 'admin', 'master'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado. Esta área é restrita para DJs.');
        window.location.href = '/';
        return;
    }

    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingArtist = document.getElementById('now-playing-artist');
    const playlistBody = document.getElementById('playlist-body');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const skipBtn = document.getElementById('skip-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const banSongInput = document.getElementById('ban-song-input');
    const banSongDropdown = document.getElementById('ban-song-dropdown');
    const banSearchView = document.getElementById('ban-search-view');
    const banLockedView = document.getElementById('ban-locked-view');
    const banSongName = document.getElementById('ban-song-name');
    const editBanSongBtn = document.getElementById('edit-ban-song-btn');
    const banDurationOptions = document.getElementById('ban-duration-options');
    const banListToday = document.getElementById('ban-list-today');
    const banListWeek = document.getElementById('ban-list-week');
    const banListPermanent = document.getElementById('ban-list-permanent');
    const addSongInput = document.getElementById('add-song-input');
    const addSongDropdown = document.getElementById('add-song-dropdown');
    const addSongError = document.getElementById('add-song-error');
    const messageAlertEl = document.getElementById('success-message');
    const messageTextEl = document.getElementById('success-text');
    const playlistInfoText = document.getElementById('playlist-info-text');
    const dailyThemeTitle = document.getElementById('daily-theme-title');
    const availablePlaylistsGrid = document.getElementById('available-playlists-grid');
    const specialPlaylistsGrid = document.getElementById('special-playlists-grid');
    const commercialsGrid = document.getElementById('commercials-grid');
    const uploadOverlayBtn = document.getElementById('upload-overlay-btn');
    const overlayUploadInput = document.getElementById('overlay-upload-input');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const liveIndicator = document.getElementById('live-indicator');

    let selectedSongForBan = null;
    let playbackTimer = null;

    const showMessage = (message, type = 'success') => {
        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert', 'hidden');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };

    const renderQueue = (nowPlaying, upcomingRequests) => {
        const isQueueEmpty = !nowPlaying && (!upcomingRequests || upcomingRequests.length === 0);
        playlistBody.classList.toggle('is-empty', isQueueEmpty);

        if (isQueueEmpty) {
            playlistBody.innerHTML = `<div class="placeholder-text">Você ainda não tem uma play carregada. Som na caixa DJ!</div>`;
            return;
        }

        playlistBody.innerHTML = '';
        const renderRow = (song, index, isNowPlaying = false) => {
            const row = document.createElement('div');
            row.className = isNowPlaying ? 'playlist-row current-song' : 'playlist-row';
            row.innerHTML = `<div>${isNowPlaying ? '<i class="fa-solid fa-volume-high"></i>' : index + 1}</div><div>${song.title}</div><div>${song.artist_name}</div><div>${radioPlayer.formatDuration(song.duration_seconds)}</div><div class="action-buttons"><button class="button danger-button small icon-only ban-btn-from-queue" data-id="${song.song_id}" data-name="${song.title} - ${song.artist_name}" title="Banir música"><i class="fa-solid fa-ban"></i></button></div>`;
            return row;
        };

        if (nowPlaying) {
            playlistBody.appendChild(renderRow(nowPlaying, 0, true));
        }
        (upcomingRequests || []).forEach((req, index) => playlistBody.appendChild(renderRow(req, index)));
    };

    const updatePlayerUI = (nowPlaying, playerState) => {
        clearInterval(playbackTimer);
        liveIndicator.classList.toggle('active', playerState.isPlaying);

        if (nowPlaying && playerState && playerState.playbackStartTimestamp) {
            nowPlayingTitle.textContent = nowPlaying.title;
            nowPlayingArtist.textContent = nowPlaying.artist_name;
            totalTimeEl.textContent = radioPlayer.formatDuration(nowPlaying.duration_seconds);
            playPauseIcon.classList.toggle('fa-pause', playerState.isPlaying);
            playPauseIcon.classList.toggle('fa-play', !playerState.isPlaying);

            const totalDuration = nowPlaying.duration_seconds;
            const startTime = playerState.playbackStartTimestamp;
            const accumulatedPaused = playerState.accumulatedPausedDuration || 0;

            const calculateProgress = () => {
                let elapsedMillis = playerState.isPlaying ?
                    (Date.now() - startTime) - accumulatedPaused :
                    (playerState.lastPauseTimestamp || Date.now()) - startTime - accumulatedPaused;
                const elapsedSeconds = Math.max(0, Math.floor(elapsedMillis / 1000));

                if (elapsedSeconds >= totalDuration && totalDuration > 0) {
                     clearInterval(playbackTimer);
                }

                currentTimeEl.textContent = radioPlayer.formatDuration(elapsedSeconds);
                progressBarFill.style.width = totalDuration > 0 ? `${(elapsedSeconds / totalDuration) * 100}%` : '0%';
            };

            calculateProgress();
            if (playerState.isPlaying) {
                playbackTimer = setInterval(calculateProgress, 1000);
            }
        } else {
            nowPlayingTitle.textContent = 'Nenhuma música tocando';
            nowPlayingArtist.textContent = 'Aguardando...';
            totalTimeEl.textContent = '0:00';
            currentTimeEl.textContent = '0:00';
            progressBarFill.style.width = '0%';
            playPauseIcon.classList.add('fa-play');
            playPauseIcon.classList.remove('fa-pause');
        }
    };

    const renderBanList = (bannedSongs) => {
        const createBanPill = (song) => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            pill.innerHTML = `<span>${song.song_title} - ${song.artist_name}</span><button class="delete-tag-btn unban-btn" data-id="${song.id}" title="Remover banimento"><i class="fas fa-times"></i></button>`;
            return pill;
        };

        const lists = { today: banListToday, week: banListWeek, permanent: banListPermanent };
        Object.values(lists).forEach(list => list.innerHTML = '');
        
        (bannedSongs || []).forEach(song => {
            if (lists[song.ban_period]) {
                lists[song.ban_period].appendChild(createBanPill(song));
            }
        });

        if (lists.today.children.length === 0) lists.today.innerHTML = '<div class="ban-list-empty">Nenhuma música banida hoje.</div>';
        if (lists.week.children.length === 0) lists.week.innerHTML = '<div class="ban-list-empty">Nenhuma música no castigo semanal.</div>';
        if (lists.permanent.children.length === 0) lists.permanent.innerHTML = '<div class="ban-list-empty">Nenhum banimento permanente.</div>';
    };
    
    const createPlaylistCard = (pl) => {
        const card = document.createElement('div');
        card.className = 'card playlist-card';
        const state = radioPlayer.getState();
        const isActive = pl.id === state.queueState?.playlistId;

        const stats = `${pl.song_count || 0} músicas • ${radioPlayer.formatDuration(pl.total_duration || 0)}`;
        card.innerHTML = `<div class="card-content"><div class="card-header"><h3>${pl.name}</h3>${isActive ? '<span class="status-tag active">Ativa</span>' : ''}</div><p>${stats}</p></div><div class="card-footer"><button class="button ${isActive ? 'secondary-button' : 'primary-button'} small activate-playlist-btn" data-id="${pl.id}" ${isActive ? 'disabled' : ''}>${isActive ? 'Ativa' : 'Ativar'}</button></div>`;
        return card;
    };

    const renderAvailablePlaylists = (availablePlaylists) => {
        if (!Array.isArray(availablePlaylists)) return;
        availablePlaylistsGrid.innerHTML = '';
    
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateString = `${year}-${month}-${day}`;
    
        const dailyPlaylists = availablePlaylists.filter(p => {
            if (p.type !== 'diaria' || !p.scheduled_date) return false;
            const playlistDateString = p.scheduled_date.split('T')[0];
            return playlistDateString === todayDateString;
        });
        
        const standardPlaylists = availablePlaylists.filter(p => p.type === 'padrao');
        
        const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; 
        const sortedWeekdayOrder = [...weekdayOrder.slice(todayIndex), ...weekdayOrder.slice(0, todayIndex)];
        
        standardPlaylists.sort((a, b) => {
            return sortedWeekdayOrder.indexOf(a.weekday) - sortedWeekdayOrder.indexOf(b.weekday);
        });

        const playlistsToRender = [...dailyPlaylists, ...standardPlaylists];

        if (playlistsToRender.length === 0) {
            availablePlaylistsGrid.innerHTML = '<div class="placeholder-text">Nenhuma playlist padrão ou diária para hoje encontrada.</div>';
            return;
        }
        playlistsToRender.forEach(pl => availablePlaylistsGrid.appendChild(createPlaylistCard(pl)));
    };

    const renderSpecialPlaylists = (availablePlaylists) => {
        specialPlaylistsGrid.innerHTML = '';
        const special = (availablePlaylists || []).filter(p => p.type === 'especial');
        if (special.length > 0) special.forEach(pl => specialPlaylistsGrid.appendChild(createPlaylistCard(pl)));
        else specialPlaylistsGrid.innerHTML = '<div class="placeholder-text">Nenhuma playlist especial encontrada.</div>';
    };

    const renderCommercials = (commercials) => {
        commercialsGrid.innerHTML = '';
        if (commercials && commercials.length > 0) {
            commercials.forEach(comm => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<div class="card-content"><h3>${comm.title}</h3><p>${comm.artist_name || ''}</p></div><div class="card-footer"><button class="button primary-button small play-commercial-btn" data-id="${comm.id}">Tocar Agora</button></div>`;
                commercialsGrid.appendChild(card);
            });
        } else {
            commercialsGrid.innerHTML = '<div class="placeholder-text">Nenhum comercial disponível.</div>';
        }
    };
    
    const renderPlaylistInfo = (upcomingRequests) => {
        const today = new Date().getDay();
        const dailyTitles = ["Domingo Relax", "Segunda Rock", "Terça Black Music", "Quarta POP", "Quinta #TBT", "Sexta MIX", "Sábado Rock"];
        const dailyThemes = [
            "Domingo de boa. 😌 Para fechar o fim de semana, uma trilha sonora mais tranquila, com clássicos e sons relaxantes para recarregar as energias. 🛋️☕",
            "Começando a semana com o pé na porta! 🤘 Hoje o dia é movido a guitarras, atitude e os maiores hinos do rock. Aumenta o volume que a energia aqui é garantida! 🎸⚡️",
            "Hoje é dia de celebrar a genialidade e a história da música preta. ✨ Nossa programação é uma homenagem aos artistas negros que revolucionaram o mundo com o soul, o funk e o R&B. E a partir das 23h, nosso DJ residente comanda um set ao vivo especial, mergulhando fundo nesse groove! 🎷🕺",
            "O meio da semana pede um som pra cima! 🎉 A 'Quarta TOP' chega com os maiores hits do pop internacional que estão dominando as paradas. A partir das 23h, a programação esquenta ainda mais com um DJ set especial só com as mais pedidas. 🔊💃",
            "Nostalgia no ar! 📼 Hoje, a programação é toda no clima de #TBT, com os clássicos do pop que a gente ama. E a noite promete: teremos o set especial do nosso 'DJ TBT' e a icônica 'Festa Cueca' rolando na nossa rádio! 🥰",
            "SEXTOU! 🔥 Hoje a gente bota fogo na pista com o MIX mais atualizado da cidade. É dia de virais, funk 🇧🇷 e tudo que tá no hype. A partir das 23h, começa o esquenta oficial para a 'Festa dos Novinhos'! Só vem! 🚀",
            "O aquecimento oficial para a sua noite! 🌃 Hoje é dia de Sábado Rock, com uma seleção de hinos para cantar junto e se preparar pra festa. 🍻"
        ];

        dailyThemeTitle.innerHTML = `<i class="fa-solid fa-circle-info icon"></i> Playlist do Dia: ${dailyTitles[today]}`;
        playlistInfoText.textContent = dailyThemes[today];

        const uniqueArtists = [...new Set((upcomingRequests || []).map(song => song.artist_name))].filter(Boolean);
        const artistContainer = document.getElementById('daily-theme-artists');
        artistContainer.innerHTML = '';
        if (uniqueArtists.length > 0) {
            uniqueArtists.slice(0, 6).forEach(artistName => {
                const tag = document.createElement('div');
                tag.className = 'artist-tag';
                tag.textContent = artistName;
                artistContainer.appendChild(tag);
            });
        }
    };

    const showSearchBanView = () => {
        selectedSongForBan = null;
        banSongInput.value = '';
        banLockedView.classList.add('hidden');
        banSearchView.classList.remove('hidden');
        banSongInput.focus();
    };

    const setupAutocomplete = (input, dropdown, onSelect) => {
        input.addEventListener('input', function() {
            const term = this.value.toLowerCase().trim();
            const { allSongs, bannedSongs } = radioPlayer.getState();
            const bannedSongIds = new Set((bannedSongs || []).map(s => s.song_id));
            dropdown.innerHTML = '';
            if (term.length < 1) {
                dropdown.classList.remove('show');
                return;
            }
            
            const results = allSongs.filter(s => 
                !bannedSongIds.has(s.id) && 
                (s.title.toLowerCase().includes(term) || (s.artist_name && s.artist_name.toLowerCase().includes(term)))
            );

            results.slice(0, 5).forEach(song => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = `${song.title} - ${song.artist_name}`;
                item.onmousedown = (e) => {
                    e.preventDefault();
                    onSelect(song);
                    input.value = '';
                    dropdown.classList.remove('show');
                };
                dropdown.appendChild(item);
            });
            dropdown.classList.toggle('show', results.length > 0);
        });
        input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('show'), 200));
    };

    const handleOverlayUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('overlayImage', file);

        try {
            await apiFetch('/dj/control/overlay', {
                method: 'POST',
                body: formData
            });
            showMessage('Imagem de overlay enviada com sucesso!');
        } catch (error) {
            showMessage(`Erro ao enviar imagem: ${error.message}`, 'danger');
        } finally {
            overlayUploadInput.value = '';
        }
    };

    const setupEventListeners = () => {
        playPauseBtn.addEventListener('click', radioPlayer.actions.togglePause);
        skipBtn.addEventListener('click', radioPlayer.actions.skip);
        logoutBtn.addEventListener('click', logout);
        uploadOverlayBtn.addEventListener('click', () => overlayUploadInput.click());
        overlayUploadInput.addEventListener('change', handleOverlayUpload);
        
        document.getElementById('app-container').addEventListener('click', async (e) => {
            const activateBtn = e.target.closest('.activate-playlist-btn');
            if (activateBtn && !activateBtn.disabled) {
                 await radioPlayer.actions.activatePlaylist(parseInt(activateBtn.dataset.id, 10));
            }

            const playCommercialBtn = e.target.closest('.play-commercial-btn');
            if (playCommercialBtn) {
                 radioPlayer.actions.playCommercial(parseInt(playCommercialBtn.dataset.id, 10)).then(() => showMessage('Comando para tocar comercial enviado.'));
            }

            const banBtn = e.target.closest('.ban-btn-from-queue');
            if (banBtn) {
                const songId = parseInt(banBtn.dataset.id, 10);
                const songName = banBtn.dataset.name;
                radioPlayer.actions.requestBanSong(songId, 'today')
                    .then(() => {
                        showMessage(`"${songName}" foi banida por hoje.`);
                    })
                    .catch(error => showMessage(`Erro ao banir: ${error.message}`, 'danger'));
            }
            
            const unbanBtn = e.target.closest('.unban-btn');
            if (unbanBtn) {
                const banId = unbanBtn.dataset.id;
                radioPlayer.actions.unbanSong(banId)
                    .then(() => {
                        showMessage(`Banimento removido.`);
                    })
                    .catch(error => showMessage(`Erro ao remover banimento: ${error.message}`, 'danger'));
            }
        });
        
        banDurationOptions.addEventListener('click', (e) => {
            const durationBtn = e.target.closest('.day-option');
            if (!durationBtn || !selectedSongForBan) return;
            radioPlayer.actions.requestBanSong(selectedSongForBan.id, durationBtn.dataset.duration)
                .then(() => {
                    showMessage(`"${selectedSongForBan.title}" foi banida.`);
                    showSearchBanView();
                })
                .catch(error => showMessage(`Erro ao banir: ${error.message}`, 'danger'));
        });

        editBanSongBtn.addEventListener('click', showSearchBanView);
    };

    const setupScrollButtons = () => {
        document.querySelectorAll('.playlists-container').forEach(container => {
            const grid = container.querySelector('.card-grid'),
                prevBtn = container.querySelector('.scroll-btn.prev'),
                nextBtn = container.querySelector('.scroll-btn.next');
            if (!grid || !prevBtn || !nextBtn) return;
            const update = () => {
                const maxScroll = grid.scrollWidth - grid.clientWidth;
                prevBtn.classList.toggle('hidden', grid.scrollLeft < 1);
                nextBtn.classList.toggle('hidden', grid.scrollLeft >= maxScroll - 1);
            };
            prevBtn.onclick = () => grid.scrollBy({ left: -grid.offsetWidth * 0.8, behavior: 'smooth' });
            nextBtn.onclick = () => grid.scrollBy({ left: grid.offsetWidth * 0.8, behavior: 'smooth' });
            grid.addEventListener('scroll', update);
            new ResizeObserver(update).observe(grid);
            update();
        });
    };

    const fullRender = () => {
        const state = radioPlayer.getState();
        const { upcomingRequests, playerState, currentSong, availablePlaylists, commercials, bannedSongs } = state;
        
        renderQueue(currentSong, upcomingRequests);
        updatePlayerUI(currentSong, playerState);
        renderPlaylistInfo(upcomingRequests);
        renderAvailablePlaylists(availablePlaylists);
        renderSpecialPlaylists(availablePlaylists);
        renderCommercials(commercials);
        renderBanList(bannedSongs);
        setupScrollButtons();
    };

    radioPlayer.subscribe(fullRender);
    radioPlayer.initialize();
    
    setupEventListeners();
    setupAutocomplete(addSongInput, addSongDropdown, (song) => {
        addSongError.classList.add('hidden');
        radioPlayer.actions.addDjRequest(song.id).then(() => showMessage(`"${song.title}" adicionada à fila.`)).catch(err => {
            addSongError.textContent = err.message;
            addSongError.classList.remove('hidden');
        });
    });
    setupAutocomplete(banSongInput, banSongDropdown, (song) => {
        selectedSongForBan = song;
        banSongName.textContent = `${song.title} - ${song.artist_name}`;
        banSearchView.classList.add('hidden');
        banLockedView.classList.remove('hidden');
    });
});