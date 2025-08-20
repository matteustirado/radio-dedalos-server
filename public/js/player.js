const radioPlayer = (() => {
    const state = {
        allSongs: [],
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
            const song = state.allSongs.find(s => s.id === req.song_id) || state.commercials.find(c => c.id === req.song_id);
            if (!song) return null;
            const artist = state.allArtists.find(a => a.id === song.artist_id);
            let fullArtistString = artist ? artist.name : 'Comercial';
            if (req.requester_info !== 'Commercial' && song.featuring_artists?.length > 0) {
                fullArtistString += `, ${song.featuring_artists.map(f => f.name).join(', ')}`;
            }
            return { ...req,
                ...song,
                artist_name: fullArtistString
            };
        };

        state.upcomingRequests = (data.upcoming_requests || []).map(enrich).filter(Boolean);
        state.playHistory = (data.play_history || []).map(enrich).filter(Boolean);
        state.playerState = data.player_state || {};
        state.currentSong = enrich(data.current_song);
    };

    const _fetchBans = async () => {
        try {
            state.bannedSongs = await apiFetch('/bans');
        } catch (e) {
            console.error('Falha ao buscar bans:', e);
        }
    };

    const _setupSocketListeners = () => {
        if (socket) return;
        socket = io(window.location.origin);

        socket.on('connect', () => console.log('Player Service: Conectado ao servidor.'));

        const refreshQueueState = async () => {
            try {
                const queueData = await apiFetch('/dj/queue');
                _processQueueData(queueData);
                notify();
            } catch (e) {
                console.error('Falha ao atualizar o estado da fila via socket.', e);
            }
        };

        socket.on('queue:updated', (data) => {
            console.log('%c[player.js] Recebido "queue:updated"', 'color: lightblue; font-weight: bold;');
            _processQueueData(data);
            notify();
        });

        socket.on('song:change', () => {
            console.log('%c[player.js] Recebido "song:change"', 'color: lightgreen; font-weight: bold;');
            refreshQueueState();
        });

        socket.on('player:pause', () => {
            console.log('%c[player.js] Recebido "player:pause"', 'color: orange; font-weight: bold;');
            if (state.playerState) state.playerState.isPlaying = false;
            notify();
            refreshQueueState();
        });

        socket.on('player:play', () => {
            console.log('%c[player.js] Recebido "player:play"', 'color: cyan; font-weight: bold;');
            if (state.playerState) state.playerState.isPlaying = true;
            notify();
            refreshQueueState();
        });

        socket.on('bans:updated', async () => {
            console.log('Recebido: bans:updated');
            await _fetchBans();
            notify();
        });
    };

    const _fetchAllInitialData = async () => {
        state.isLoading = true;
        notify();
        try {
            const isJukeboxPage = window.location.pathname.toLowerCase().includes('jukebox');
            const songsEndpoint = isJukeboxPage ? '/jukebox/songs' : '/songs';
            
            const [songs, artists, commercials, playlists, bans, initialQueue] = await Promise.all([
                apiFetch(songsEndpoint),
                apiFetch('/artists'),
                apiFetch('/commercials'),
                apiFetch('/playlists?status=published'),
                apiFetch('/bans'),
                apiFetch('/dj/queue')
            ]);

            state.allSongs = songs || [];
            state.allArtists = artists || [];
            state.commercials = commercials || [];
            state.availablePlaylists = playlists || [];
            state.bannedSongs = bans || [];

            const artistMap = new Map(state.allArtists.map(a => [a.id, a.name]));
            state.allSongs.forEach(s => s.artist_name = artistMap.get(s.artist_id) || 'Desconhecido');
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
        togglePause: () => apiFetch('/dj/control/toggle-pause', {
            method: 'POST'
        }),
        skip: () => apiFetch('/dj/control/skip', {
            method: 'POST'
        }),
        setVolume: (volume) => apiFetch('/dj/control/set-volume', {
            method: 'POST',
            body: JSON.stringify({
                volume
            })
        }),
        addDjRequest: (songId) => apiFetch('/dj/control/add-priority', {
            method: 'POST',
            body: JSON.stringify({
                song_id: songId,
                requester_info: "DJ"
            })
        }),
        playCommercial: (commercialId) => apiFetch('/dj/control/play-commercial', {
            method: 'POST',
            body: JSON.stringify({
                commercial_id: commercialId
            })
        }),
        activatePlaylist: (playlistId) => apiFetch(`/dj/control/activate-playlist/${playlistId}`, {
            method: 'POST'
        }),
        reorderQueue: (orderedRequestIds) => apiFetch('/dj/control/reorder-queue', {
            method: 'POST',
            body: JSON.stringify({
                ordered_request_ids: orderedRequestIds
            })
        }),
        banSong: (songId, duration) => apiFetch('/dj/control/ban', {
            method: 'POST',
            body: JSON.stringify({
                song_id: songId,
                duration
            })
        }),
        unbanSong: (songId) => apiFetch(`/bans/${songId}`, {
            method: 'DELETE'
        }),
        jukeboxRequest: (songId, requesterInfo) => apiFetch('/jukebox/request', {
            method: 'POST',
            body: JSON.stringify({
                song_id: songId,
                requester_info: requesterInfo
            })
        }),
        jukeboxSuggest: (searchTerm, requesterInfo) => {
            const [title, artist_name] = searchTerm.includes('-') ? searchTerm.split('-').map(s => s.trim()) : [searchTerm, 'Desconhecido'];
            return apiFetch('/jukebox/suggest', {
                method: 'POST',
                body: JSON.stringify({
                    song_title: title,
                    artist_name,
                    requester_info: requesterInfo
                })
            })
        },
        setLogo: (filename) => apiFetch('/settings/active_logo_filename', {
            method: 'PUT',
            body: JSON.stringify({
                value: filename
            })
        }),
    };

    return {
        subscribe,
        getState: () => state,
        actions,
        initialize: () => {
            _fetchAllInitialData();
            _setupSocketListeners();
        },
        formatDuration: (seconds) => {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec.toString().padStart(2, '0')}`;
        }
    };
})();