const {
    Server
} = require('socket.io');
const queueService = require('./queueService');
const SongModel = require('../api/models/songModel');

let io = null;

const playNextSong = async () => {
    if (!io) return;

    const songToPlay = queueService.playNextInQueue();
    if (songToPlay) {
        const songDetails = await SongModel.findById(songToToPlay.song_id);
        if (!songDetails) {
            console.error(`Música com ID ${songToPlay.song_id} não encontrada no banco, pulando para a próxima.`);
            playNextSong();
            return;
        }

        const videoUrl = `https://${process.env.BUNNY_STREAM_HOSTNAME}/${songDetails.filename}/playlist.m3u8`;

        const payload = {
            videoUrl: videoUrl,
            title: songDetails.title,
            album: songDetails.album,
            artist: songDetails.artist_name,
            record_label: songDetails.record_label_name,
            director: songDetails.director,
            currentTime: 0
        };

        io.emit('song:change', payload);

        const playerState = queueService.getPlayerState();
        let history = queueService.getHistory();
        if (history.length > 0) {
            history[history.length - 1] = { ...history[history.length - 1],
                ...playerState
            };
        }
        io.emit('queue:updated', {
            upcoming_requests: queueService.getQueue(),
            play_history: history
        });
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

            socket.on('auth:agent', (secretKey) => {
                if (secretKey === process.env.AGENT_SECRET_KEY) {
                    console.log(`[Socket.io] Agente de Player ${socket.id} autenticado.`);
                    socket.join('player_agents');

                    socket.on('player:song_ended', () => {
                        console.log(`[Socket.io] Agente ${socket.id} avisou que a música terminou. Tocando a próxima.`);
                        playNextSong();
                    });
                } else {
                    console.log(`[Socket.io] Tentativa de autenticação de agente falhou do ID: ${socket.id}`);
                }
            });

            socket.on('disconnect', () => {
                console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
            });
        });
    },
    getIo: () => io,
    playNextSong
};

module.exports = socketService;