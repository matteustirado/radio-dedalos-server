const {
    Server
} = require('socket.io');
const queueService = require('./queueService');
const SongModel = require('../api/models/songModel');
const SettingModel = require('../api/models/settingModel');

let io = null;

const playNextSong = async () => {
    if (!io) return;

    const songToPlay = queueService.playNextInQueue();
    if (songToPlay) {
        const songDetails = await SongModel.findById(songToPlay.song_id);
        if (!songDetails) {
            console.error(`Música com ID ${songToPlay.song_id} não encontrada no banco, pulando para a próxima.`);
            playNextSong();
            return;
        }

        songToPlay.duration_seconds = songDetails.duration_seconds;

        const activeLogo = await SettingModel.find('active_logo_filename');
        const logo_filename = activeLogo ? activeLogo.setting_value : null;

        io.to('player_agents').emit('player:play', {
            song: songDetails,
            logo_filename
        });

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
                    console.log(`[Socket.io] Agente de Player ${socket.id} autenticado e adicionado à sala 'player_agents'.`);
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
    getIo: () => io
};

module.exports = socketService;