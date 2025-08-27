const radioPlayer = (() => {
    const state = {
        allSongs: [],
        availableJukeboxSongs: [],
        allArtists: [],
        commercials: [],
        availablePlaylists: [],
        bannedSongs: [],
        upcomingRequests: [],
        playHistory: [],
        playerState: {},
        currentSong: null,
        isLoading: true,
        error: null,
    };

    const subscribers = [];

    const subscribe = (callback) => {
        subscribers.push(callback);
    };

    const notify = () => {
        for (const callback of subscribers) {
            try {
                callback();
            } catch (e) {
                console.error('Erro em um dos callbacks de subscribe:', e);
            }
        }
    };

    let socket = null;

    const _processQueueData = (data) => {
        if (!data) return;

        const enrich = (req) => {
            if (!req) return null;
            const song = state.allSongs.find(s => String(s.id) === String(req.song_id)) || state.commercials.find(c => String(c.id) === String(req.song_id));
            if (!song) {
                console.warn(`Música com ID ${req.song_id} não encontrada no estado local para enriquecimento.`);
                return null;
            }
            return { ...req, ...song };
        };
        
        state.upcomingRequests = (data.upcoming_requests || []).map(enrich).filter(Boolean);
        state.playHistory = (data.play_history || []).map(enrich).filter(Boolean);
        state.playerState = data.player_state || {};
        state.currentSong = enrich(data.current_song);
        
        console.log('[RadioPlayer] Estado atualizado:', { current: state.currentSong, queue: state.upcomingRequests.length });
        notify();
    };

    const _setupSocketListeners = () => {
        if (socket) return;
        socket = io(window.location.origin);

        socket.on('connect', () => console.log('Player Service: Conectado ao servidor.'));

        const refreshQueueState = async () => {
            try {
                const queueData = await apiFetch('/dj/queue');
                _processQueueData(queueData);
            } catch (e) {
                console.error('Falha ao atualizar o estado da fila via socket.', e);
            }
        };

        socket.on('queue:updated', _processQueueData);
        socket.on('song:change', refreshQueueState);
        socket.on('playlist:finished', refreshQueueState);

        socket.on('player:pause', () => {
            if (state.playerState) state.playerState.isPlaying = false;
            notify();
        });
        socket.on('player:play', () => {
            if (state.playerState) state.playerState.isPlaying = true;
            notify();
        });
        socket.on('bans:updated', async () => {
            console.log('[RadioPlayer] Evento de banimento recebido. Atualizando listas.');
            state.bannedSongs = await apiFetch('/bans/active');
            
            const isJukeboxPage = window.location.pathname.toLowerCase().includes('jukebox');
            if (isJukeboxPage) {
                state.availableJukeboxSongs = await apiFetch('/jukebox/songs');
            }
            notify();
        });

        socket.on('songs:updated', async () => {
            console.log('[RadioPlayer] Evento de atualização de músicas recebido. Buscando nova lista.');
            try {
                const isJukeboxPage = window.location.pathname.toLowerCase().includes('jukebox');
                const allSongs = await apiFetch('/songs');
                state.allSongs = allSongs || [];
        
                if (isJukeboxPage) {
                    const jukeboxSongs = await apiFetch('/jukebox/songs');
                    state.availableJukeboxSongs = jukeboxSongs || [];
                }
        
                const artistMap = new Map(state.allArtists.map(a => [String(a.id), a.name]));
                const enrichArtistNames = (songList) => {
                    songList.forEach(s => {
                        let mainArtistName = artistMap.get(String(s.artist_id)) || 'Desconhecido';
                        let fullArtistString = mainArtistName;
                        if (s.featuring_artists && s.featuring_artists.length > 0) {
                            const featuringArtistsNames = s.featuring_artists.map(f => f.name).join(', ');
                            fullArtistString += `, ${featuringArtistsNames}`;
                        }
                        s.artist_name = fullArtistString;
                    });
                };
        
                enrichArtistNames(state.allSongs);
                if (isJukeboxPage) {
                    enrichArtistNames(state.availableJukeboxSongs);
                }
        
                notify();
            } catch (e) {
                console.error('Falha ao atualizar a lista de músicas via socket.', e);
            }
        });
    };

    const initialize = async () => {
        _setupSocketListeners();
        state.isLoading = true;
        notify();
        try {
            const isJukeboxPage = window.location.pathname.toLowerCase().includes('jukebox');

            const allSongsPromise = apiFetch('/songs');
            const jukeboxSongsPromise = isJukeboxPage ? apiFetch('/jukebox/songs') : Promise.resolve(null);

            const [allSongs, artists, commercials, playlists, bans, initialQueue, jukeboxSongs] = await Promise.all([
                allSongsPromise,
                apiFetch('/artists'),
                apiFetch('/commercials'),
                apiFetch('/playlists?status=published'),
                apiFetch('/bans/active'),
                apiFetch('/dj/queue'),
                jukeboxSongsPromise
            ]);

            state.allArtists = artists || [];
            state.commercials = commercials || [];
            state.availablePlaylists = playlists || [];
            state.bannedSongs = bans || [];
            state.allSongs = allSongs || [];
            state.availableJukeboxSongs = jukeboxSongs || allSongs || [];

            const artistMap = new Map(state.allArtists.map(a => [String(a.id), a.name]));

            const enrichArtistNames = (songList) => {
                songList.forEach(s => {
                    let mainArtistName = artistMap.get(String(s.artist_id));
                    if (!mainArtistName) {
                        s.artist_name = 'Desconhecido';
                        return;
                    }
                    let fullArtistString = mainArtistName;
                    if (s.featuring_artists && s.featuring_artists.length > 0) {
                        const featuringArtistsNames = s.featuring_artists.map(f => f.name).join(', ');
                        fullArtistString += `, ${featuringArtistsNames}`;
                    }
                    s.artist_name = fullArtistString;
                });
            };
            
            enrichArtistNames(state.allSongs);
            if (jukeboxSongs) {
                enrichArtistNames(state.availableJukeboxSongs);
            }

            state.commercials.forEach(c => c.artist_name = c.album || 'Comercial');

            _processQueueData(initialQueue);

        } catch (e) {
            state.error = 'Falha ao carregar dados da rádio.';
            console.error(e);
        } finally {
            state.isLoading = false;
            notify();
        }
    };
    
    const actions = {
        togglePause: () => apiFetch('/dj/control/toggle-pause', { method: 'POST' }),
        skip: () => apiFetch('/dj/control/skip', { method: 'POST' }),
        activatePlaylist: async (playlistId) => {
            const response = await apiFetch(`/dj/control/activate-playlist/${playlistId}`, { method: 'POST' });
            if (response && response.queueState) {
                _processQueueData(response.queueState);
            }
            return response;
        },
        setVolume: (volume) => apiFetch('/dj/control/set-volume', { method: 'POST', body: JSON.stringify({ volume }) }),
        addDjRequest: (songId) => apiFetch('/dj/control/add-priority', { method: 'POST', body: JSON.stringify({ song_id: songId }) }),
        playCommercial: (commercialId) => apiFetch('/dj/control/play-commercial', { method: 'POST', body: JSON.stringify({ commercial_id: commercialId }) }),
        reorderQueue: (orderedRequestIds) => apiFetch('/dj/control/reorder-queue', { method: 'POST', body: JSON.stringify({ ordered_request_ids: orderedRequestIds }) }),
        requestBanSong: (songId, banPeriod) => apiFetch('/bans', { method: 'POST', body: JSON.stringify({ song_id: songId, ban_period: banPeriod }) }),
        unbanSong: (banId) => apiFetch(`/bans/${banId}`, { method: 'DELETE' }),
        jukeboxRequest: (songId, requesterInfo) => apiFetch('/jukebox/request', { method: 'POST', body: JSON.stringify({ song_id: songId, requester_info: requesterInfo }) }),
        jukeboxSuggest: (searchTerm, requesterInfo, unit) => apiFetch('/jukebox/suggest', { method: 'POST', body: JSON.stringify({ suggestion_text: searchTerm.trim(), requester_info: requesterInfo, unit: (typeof JukeboxConfig !== 'undefined') ? JukeboxConfig.unit : null }) }),
    };

    return {
        subscribe,
        getState: () => state,
        actions,
        initialize,
        formatDuration: (seconds) => {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec.toString().padStart(2, '0')}`;
        }
    };
})();