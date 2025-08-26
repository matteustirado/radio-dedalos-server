const { Server } = require('socket.io');
const queueService = require('./queueService');
const storageService = require('./storageService');
const logService = require('./logService');

let io = null;

const enrichAndEmitQueue = () => {
    if (io) {
        console.log('[Socket Service] Emitindo evento queue:updated');
        io.emit('queue:updated', {
            upcoming_requests: queueService.getQueue(),
            play_history: queueService.getHistory(),
            player_state: queueService.getPlayerState(),
            current_song: queueService.getCurrentSong()
        });
    }
};

const playNextSong = async (request = null) => {
    if (!io) return { success: false, message: 'Socket.IO não inicializado.' };

    const songToPlay = queueService.playNextInQueue();
    
    if (songToPlay && songToPlay.filename) {
        console.log(`[Socket Service] Tocando próxima música: ${songToPlay.title}`);
        const videoUrl = storageService.getFileUrl(songToPlay.filename);
        
        let fullArtistString = songToPlay.artist_name;
        if (songToPlay.featuring_artists && songToPlay.featuring_artists.length > 0) {
            const featuringNames = songToPlay.featuring_artists.map(feat => feat.name).join(', ');
            fullArtistString += ` feat. ${featuringNames}`;
        }

        const songDataForClient = {
            videoUrl: videoUrl,
            duration_seconds: songToPlay.duration_seconds,
            title: songToPlay.title,
            album: songToPlay.album,
            artist: fullArtistString,
            record_label: songToPlay.record_label_name,
            director: songToPlay.director
        };

        io.emit('song:change', songDataForClient);

        if (request) {
            await logService.logAction(request, 'SONG_PLAYED', { songId: songToPlay.song_id, title: songToPlay.title });
        }

        enrichAndEmitQueue();
        
        return { success: true, song: songToPlay };
    } else {
        console.log('[Socket Service] Fila de reprodução terminada.');
        queueService.stopPlayback();
        io.emit('playlist:finished');
        enrichAndEmitQueue();
        return { success: false, message: 'Fila terminada.' };
    }
};


const socketService = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            console.log(`[Socket.io] Novo cliente conectado: ${socket.id}`);
            socket.on('disconnect', () => {
                console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
            });
        });
    },
    getIo: () => io,
    playNextSong,
    enrichAndEmitQueue
};

module.exports = socketService;