const PlaylistModel = require('../api/models/playlistModel');
const BannedModel = require('../api/models/bannedModel');

let requestQueue = [];
let playHistory = [];
let currentSong = null;
let activeBans = new Set();

let queueState = {
    playlistId: null,
    playlistName: null,
    source: null,
    lastManualActionTimestamp: null
};

let playerState = {
    isPlaying: false,
    volume: 80,
    playbackStartTimestamp: null,
    accumulatedPausedDuration: 0,
    lastPauseTimestamp: null
};

const HISTORY_MAX_LENGTH = 50;
const SONG_COOLDOWN_COUNT = 20;
const ARTIST_COOLDOWN_SONG_LIMIT = 5;
const USER_REQUEST_LIMIT = 5;

const queueService = {
    _refreshBans: async () => {
        try {
            const bannedSongs = await BannedModel.findAllActive();
            const bannedSongIds = bannedSongs.map(ban => ban.song_id);
            activeBans = new Set(bannedSongIds);
            
            const originalQueueLength = requestQueue.length;
            requestQueue = requestQueue.filter(req => !activeBans.has(req.song_id));
            if (requestQueue.length < originalQueueLength) {
                console.log(`[QueueService] ${originalQueueLength - requestQueue.length} música(s) banida(s) removida(s) da fila.`);
            }

        } catch (error) {
            console.error('[QueueService] Erro ao atualizar a lista de bans:', error);
        }
    },
    
    activatePlaylist: async (playlistId, source = 'dj') => {
        await queueService._refreshBans();
        const playlist = await PlaylistModel.findById(playlistId);
        if (!playlist || !playlist.items || playlist.items.length === 0) {
            console.error(`[QueueService] Tentativa de ativar playlist vazia ou inexistente: ID ${playlistId}`);
            return null;
        }
        
        console.log(`[QueueService] Ativando playlist "${playlist.name}" com ${playlist.items.length} músicas.`);
        const pendingUserRequests = requestQueue.filter(req => req.requester_info !== 'Playlist' && req.requester_info !== 'Commercial');
        
        const playlistItems = playlist.items
            .filter(song => !activeBans.has(song.song_id))
            .map(song => ({
                ...song,
                requester_info: 'Playlist',
            }));

        if (playlistItems.length < playlist.items.length) {
            console.log(`[QueueService] ${playlist.items.length - playlistItems.length} música(s) banida(s) foram puladas ao ativar a playlist "${playlist.name}".`);
        }

        requestQueue = [...pendingUserRequests, ...playlistItems];
        
        queueState.playlistId = playlist.id;
        queueState.playlistName = playlist.name;
        queueState.source = source;

        if (source === 'dj') {
            queueState.lastManualActionTimestamp = Date.now();
        }
        
        return queueState;
    },

    validateAndAddRequest: async (requestData) => {
        const { song_id, artist_id, requester_info } = requestData;
        
        if (activeBans.has(song_id)) {
            return { success: false, message: 'Esta música foi temporariamente banida da programação.' };
        }
        
        const recentSongs = playHistory.slice(-SONG_COOLDOWN_COUNT);
        if (recentSongs.some(item => item.song_id === song_id)) return { success: false, message: 'Esta música tocou recentemente e precisa aguardar.' };
        
        if (recentSongs.filter(item => item.artist_id === artist_id).length >= ARTIST_COOLDOWN_SONG_LIMIT) return { success: false, message: 'Este artista tocou muitas vezes recentemente. Tente outro.' };
        
        if (requestQueue.filter(item => item.requester_info === requester_info).length >= USER_REQUEST_LIMIT) return { success: false, message: 'Você atingiu o limite de pedidos. Aguarde um pouco.' };

        const newRequest = { id: Date.now(), requestedAt: new Date(), ...requestData };
        const firstPlaylistItemIndex = requestQueue.findIndex(req => req.requester_info === 'Playlist');
        
        if (firstPlaylistItemIndex !== -1) {
            requestQueue.splice(firstPlaylistItemIndex, 0, newRequest);
        } else {
            requestQueue.push(newRequest);
        }
        return { success: true, request: newRequest };
    },

    validateAndAddDjRequest: (requestData) => {
        if (activeBans.has(requestData.song_id)) {
            return { success: false, message: 'Esta música está banida e não pode ser adicionada.' };
        }

        const newRequest = { id: Date.now(), requestedAt: new Date(), ...requestData };
        queueState.lastManualActionTimestamp = Date.now();
        
        let insertionIndex = 0;
        for (let i = 0; i < requestQueue.length; i++) {
            const req = requestQueue[i];
            if (req.requester_info === 'Commercial' || req.requester_info === 'DJ') {
                insertionIndex = i + 1;
            } else {
                break;
            }
        }

        requestQueue.splice(insertionIndex, 0, newRequest);
        return { success: true, request: newRequest };
    },

    addCommercialToQueue: (commercialData) => {
        const newRequest = {
            ...commercialData,
            id: Date.now(),
            song_id: commercialData.id,
            requestedAt: new Date(),
            requester_info: 'Commercial'
        };
        requestQueue.unshift(newRequest);
        return { success: true, request: newRequest };
    },

    playNextInQueue: () => {
        if (currentSong) {
            playHistory.push(currentSong);
            if (playHistory.length > HISTORY_MAX_LENGTH) {
                playHistory.shift();
            }
        }

        let nextSong = null;
        while (requestQueue.length > 0) {
            const potentialNextSong = requestQueue.shift();
            if (!activeBans.has(potentialNextSong.song_id)) {
                nextSong = potentialNextSong;
                break;
            }
            console.log(`[QueueService] Pulando a música banida "${potentialNextSong.title}" da fila.`);
        }

        currentSong = nextSong;
        
        if (currentSong) {
            playerState.isPlaying = true;
            playerState.playbackStartTimestamp = Date.now();
            playerState.accumulatedPausedDuration = 0;
            playerState.lastPauseTimestamp = null;
        } else {
            playerState.isPlaying = false;
        }

        return currentSong;
    },
    
    stopPlayback: () => {
        if (currentSong) {
            playHistory.push(currentSong);
            if (playHistory.length > HISTORY_MAX_LENGTH) {
                playHistory.shift();
            }
        }
        currentSong = null;
        playerState.isPlaying = false;
        playerState.playbackStartTimestamp = null;
        
        queueState.playlistId = null;
        queueState.playlistName = null;
        queueState.source = null;
    },

    pause: () => {
        if (!playerState.isPlaying || !currentSong) return;
        playerState.isPlaying = false;
        playerState.lastPauseTimestamp = Date.now();
    },

    resume: () => {
        if (playerState.isPlaying || !currentSong) return;
        if (!playerState.lastPauseTimestamp) {
             playerState.isPlaying = true;
             return;
        };

        const pauseDuration = Date.now() - playerState.lastPauseTimestamp;
        playerState.accumulatedPausedDuration += pauseDuration;
        playerState.isPlaying = true;
        playerState.lastPauseTimestamp = null;
    },

    getCurrentSong: () => currentSong,
    setVolume: (level) => {
        playerState.volume = Math.max(0, Math.min(100, level));
        return playerState.volume;
    },
    getPlayerState: () => ({ ...playerState }),
    getQueueState: () => queueState,
    isPlaying: () => playerState.isPlaying,
    
    promoteRequest: (requestId) => {
        const requestIndex = requestQueue.findIndex(req => req.id === requestId);
        if (requestIndex > 0) {
            const [requestToPromote] = requestQueue.splice(requestIndex, 1);
            requestQueue.unshift(requestToPromote);
            return true;
        }
        return false;
    },
    reorderQueue: (orderedRequestIds) => {
        const queueMap = new Map(requestQueue.map(req => [req.id.toString(), req]));
        const newQueue = [];
        orderedRequestIds.forEach(id => {
            if (queueMap.has(id.toString())) newQueue.push(queueMap.get(id.toString()));
        });
        requestQueue.length = 0;
        requestQueue.push(...newQueue);
        return true;
    },
    getActivePlaylistInfo: () => ({ id: queueState.playlistId, name: queueState.playlistName }),
    getQueue: () => [...requestQueue],
    getHistory: () => [...playHistory]
};

queueService._refreshBans();

module.exports = queueService;