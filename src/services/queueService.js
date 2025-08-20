const db = require('../config/database');

let requestQueue = [];
let playHistory = [];
let currentSong = null;

let activePlaylistInfo = {
    id: null,
    description: 'Nenhuma playlist ativa. Fila de pedidos aberta.'
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
    validateAndAddRequest: async (requestData) => {
        const { song_id, artist_id, requester_info } = requestData;
        const [banned] = await db.execute('SELECT * FROM banned_songs WHERE song_id = ? AND (expires_at > NOW() OR expires_at IS NULL)', [song_id]);
        if (banned.length > 0) return { success: false, message: 'Esta música foi temporariamente banida da programação.' };
        
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
        const newRequest = { id: Date.now(), requestedAt: new Date(), ...requestData };

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

        if (requestQueue.length === 0) {
            currentSong = null;
            playerState.isPlaying = false;
            return null;
        }

        currentSong = requestQueue.shift();
        
        playerState.isPlaying = true;
        playerState.playbackStartTimestamp = Date.now();
        playerState.accumulatedPausedDuration = 0;
        playerState.lastPauseTimestamp = null;

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
        activePlaylistInfo = { id: null, description: 'Nenhuma playlist ativa. Fila de pedidos aberta.' };
    },

    pause: () => {
        if (!playerState.isPlaying || !currentSong) return;
        playerState.isPlaying = false;
        playerState.lastPauseTimestamp = Date.now();
    },

    resume: () => {
        if (playerState.isPlaying || !currentSong) return;
        if (!playerState.lastPauseTimestamp) return;

        const pauseDuration = Date.now() - playerState.lastPauseTimestamp;
        playerState.accumulatedPausedDuration += pauseDuration;
        playerState.isPlaying = true;
        playerState.lastPauseTimestamp = null;
    },

    getCurrentSong: () => {
        return currentSong;
    },

    setVolume: (level) => {
        playerState.volume = Math.max(0, Math.min(100, level));
        return playerState.volume;
    },

    getPlayerState: () => {
        return { ...playerState };
    },

    banSong: async (songId, duration) => {
        let expires_at;
        const now = new Date();
        if (duration === 'today') {
            expires_at = new Date();
            expires_at.setHours(23, 59, 59, 999);
        } else if (duration === 'week') {
            expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
            expires_at = null;
        }
        await db.execute('INSERT INTO banned_songs (song_id, ban_type, expires_at) VALUES (?, ?, ?)', [songId, duration, expires_at]);
        for (let i = requestQueue.length - 1; i >= 0; i--) {
            if (requestQueue[i].song_id === parseInt(songId, 10)) {
                requestQueue.splice(i, 1);
            }
        }
        return true;
    },

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

    loadPlaylistIntoQueue: async (playlist) => {
        const pendingRequests = requestQueue.filter(req => req.requester_info !== 'Playlist');
        requestQueue = [];
        
        const sql = `
            SELECT s.*, a.name as artist_name FROM playlist_items pi
            JOIN songs s ON pi.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            WHERE pi.playlist_id = ? 
            AND pi.song_id NOT IN (
                SELECT bs.song_id FROM banned_songs bs WHERE bs.expires_at > NOW() OR bs.expires_at IS NULL
            ) 
            ORDER BY pi.sequence_order ASC
        `;
        
        const [items] = await db.execute(sql, [playlist.id]);
        
        const playlistItems = items.map(song => ({
            ...song,
            song_id: song.id,
            requester_info: 'Playlist',
        }));

        requestQueue = [...pendingRequests, ...playlistItems];
        
        activePlaylistInfo = {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description
        };
    },

    getActivePlaylistInfo: () => activePlaylistInfo,
    getQueue: () => [...requestQueue],
    getHistory: () => [...playHistory]
};

module.exports = queueService;