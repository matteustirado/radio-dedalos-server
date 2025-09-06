const fs = require('fs');
const path = require('path');
const queueService = require('../../services/queueService');
const socketService = require('../../services/socketService');
const SongModel = require('../models/songModel');
const SettingModel = require('../models/settingModel');
const logService = require('../../services/logService');
const BannedModel = require('../models/bannedModel');

const overlayDir = path.resolve(__dirname, '../../../public/assets/uploads/overlay');
let maestroInterval = null;

const startMaestroLoop = (request) => {
    if (maestroInterval) {
        clearInterval(maestroInterval);
    }
    console.log('[Maestro] Iniciando loop de verificação do player.');

    maestroInterval = setInterval(async () => {
        const currentSong = queueService.getCurrentSong();
        const playerState = queueService.getPlayerState();

        if (!playerState.isPlaying || !currentSong) {
            console.log('[Maestro] Player não está tocando ou não há música. Parando o loop.');
            clearInterval(maestroInterval);
            maestroInterval = null;
            return;
        }

        const songDurationMs = (currentSong.duration_seconds || 0) * 1000;
        if (songDurationMs <= 0) {
            console.log(`[Maestro] Música "${currentSong.title}" com duração inválida (${songDurationMs}ms). Pulando para a próxima.`);
            await socketService.playNextSong(request);
            return;
        }

        const startTime = playerState.playbackStartTimestamp;
        const pausedDuration = playerState.accumulatedPausedDuration;
        const elapsedTime = Date.now() - startTime - pausedDuration;

        if (elapsedTime >= songDurationMs) {
            console.log(`[Maestro] Música "${currentSong.title}" terminou. Tocando a próxima.`);
            await socketService.playNextSong(request);
        }
    }, 1000);
};


class DjController {
    static async uploadOverlay(request, response) {
        try {
            if (!request.file) {
                return response.status(400).json({ message: 'Nenhum arquivo enviado.' });
            }
            
            const newFilename = request.file.filename;
            const settingKey = 'active_overlay_filename';

            const oldSetting = await SettingModel.find(settingKey);
            if (oldSetting && oldSetting.setting_value) {
                const oldFilePath = path.join(overlayDir, oldSetting.setting_value);
                if (fs.existsSync(oldFilePath) && oldSetting.setting_value !== newFilename) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            
            await SettingModel.upsert(settingKey, newFilename);

            const io = socketService.getIo();
            if (io) {
                io.emit('overlay:updated', { filename: newFilename });
            }
            
            await logService.logAction(request, 'OVERLAY_UPDATED', { filename: newFilename });
            
            response.status(200).json({ message: 'Overlay atualizado com sucesso.', filename: newFilename });

        } catch (error) {
            console.error('Erro no upload do overlay:', error);
            if (request.file) {
                const filePath = path.join(overlayDir, request.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            response.status(500).json({ message: 'Erro interno ao processar o overlay.' });
        }
    }
    
    static async getLiveQueue(request, response) {
        try {
            response.status(200).json({
                upcoming_requests: queueService.getQueue(),
                play_history: queueService.getHistory(),
                player_state: queueService.getPlayerState(),
                current_song: queueService.getCurrentSong()
            });
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar a fila.' });
        }
    }

    static async activatePlaylist(request, response) {
        try {
            const { id } = request.params;
            console.log(`[DJ Controller] Recebida requisição para ativar playlist ID: ${id}`);
            const newState = await queueService.activatePlaylist(id, 'dj');
            
            if (!newState) {
                return response.status(404).json({ message: 'Playlist não encontrada, está vazia ou não está publicada.' });
            }

            await logService.logAction(request, 'PLAYLIST_ACTIVATED', { playlistId: id, name: newState.playlistName });

            await socketService.playNextSong(request);
            startMaestroLoop(request);
            
            const fullQueueState = {
                upcoming_requests: queueService.getQueue(),
                play_history: queueService.getHistory(),
                player_state: queueService.getPlayerState(),
                current_song: queueService.getCurrentSong()
            };
            
            console.log('[DJ Controller] Playlist ativada com sucesso. Enviando novo estado da fila.');
            response.status(200).json({ 
                message: `Playlist "${newState.playlistName}" ativada e tocando.`,
                queueState: fullQueueState
            });

        } catch (error) {
            console.error('ERRO AO ATIVAR PLAYLIST (DJ Controller):', error);
            response.status(500).json({ message: 'Erro ao ativar a playlist.', error: error.message });
        }
    }

    static async togglePause(request, response) {
        const playerState = queueService.getPlayerState();
        const io = socketService.getIo();

        if (playerState.isPlaying) {
            queueService.pause();
            if(io) io.emit('player:pause');
            await logService.logAction(request, 'PLAYER_PAUSED');
            socketService.enrichAndEmitQueue();
            response.status(200).json({ message: 'Transmissão pausada.' });
        } else {
            queueService.resume();
            if(io) io.emit('player:play');
            startMaestroLoop(request);
            await logService.logAction(request, 'PLAYER_RESUMED');
            socketService.enrichAndEmitQueue();
            response.status(200).json({ message: 'Retomando a transmissão.' });
        }
    }

    static async skip(request, response) {
        try {
            console.log('[DJ Controller] Recebida requisição para pular música.');
            const result = await socketService.playNextSong(request);
            if (result.success) {
                if (!maestroInterval) {
                    startMaestroLoop(request);
                }
                response.status(200).json({ message: 'Música pulada.', now_playing: result.song });
            } else {
                response.status(404).json({ message: result.message || 'Não há próxima música.' });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao pular música.' });
        }
    }
    
    static async play(request, response) {
        try {
            const result = await socketService.playNextSong(request);
            if (result.success) {
                startMaestroLoop(request);
                response.status(200).json({ message: 'Comando de play enviado.', now_playing: result.song });
            } else {
                response.status(404).json({ message: result.message });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao processar play.' });
        }
    }

    static async getPlaylistInfo(request, response) {
       try {
            const info = queueService.getActivePlaylistInfo();
            response.status(200).json({ description: info.description });
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar informação da playlist.' });
        }
    }
    
    static async reorderQueue(request, response) {
        const { ordered_request_ids } = request.body;
        if (!ordered_request_ids || !Array.isArray(ordered_request_ids)) {
            return response.status(400).json({ message: 'Array de IDs ordenados é obrigatório.' });
        }
        try {
            queueService.reorderQueue(ordered_request_ids);
            socketService.enrichAndEmitQueue();
            response.status(200).json({ message: 'Fila reordenada.' });
        } catch (error) {
            response.status(500).json({ message: 'Erro ao reordenar a fila.', error: error.message });
        }
    }

    static async addPriority(request, response) {
        try {
            const { song_id } = request.body;
            if (!song_id) {
                return response.status(400).json({ message: 'O ID da música é obrigatório.' });
            }

            const song = await SongModel.findById(song_id);
            if (!song) {
                return response.status(404).json({ message: 'Música não encontrada.' });
            }

            const requestData = {
                ...song,
                song_id: song.id,
                requester_info: 'DJ'
            };

            const result = queueService.validateAndAddDjRequest(requestData);

            if (result.success) {
                socketService.enrichAndEmitQueue();
                await logService.logAction(request, 'DJ_SONG_ADDED', { songId: song.id, title: song.title });
                return response.status(200).json({ message: 'Música adicionada à fila com prioridade.', request: result.request });
            } else {
                return response.status(400).json({ message: result.message });
            }
        } catch (error) {
            console.error('Erro ao adicionar música prioritária:', error);
            return response.status(500).json({ message: 'Erro interno ao processar a solicitação.' });
        }
    }
    
    static async banSong(request, response) {
        try {
            const { song_id, duration } = request.body;
            if (!song_id || !duration) {
                return response.status(400).json({ message: 'ID da música e duração do banimento são obrigatórios.' });
            }
    
            await BannedModel.create({
                song_id,
                user_id: request.user.id,
                ban_period: duration,
            });
            await queueService._refreshBans();
    
            socketService.enrichAndEmitQueue();
    
            const io = socketService.getIo();
            if(io) io.emit('bans:updated');
    
            await logService.logAction(request, 'SONG_BANNED', { songId: song_id, duration });
    
            return response.status(200).json({ message: 'Música banida com sucesso.' });
    
        } catch (error) {
            console.error('Erro ao banir música:', error);
            return response.status(500).json({ message: 'Erro interno ao processar o banimento.' });
        }
    }

    static async playCommercial(request, response) {
        try {
            const { commercial_id } = request.body;
            if (!commercial_id) {
                return response.status(400).json({ message: 'O ID do comercial é obrigatório.' });
            }

            const commercial = await SongModel.findById(commercial_id);
            if (!commercial) {
                return response.status(404).json({ message: 'Comercial não encontrado.' });
            }
            
            queueService.addCommercialToQueue(commercial);
            
            socketService.enrichAndEmitQueue();
            
            await logService.logAction(request, 'COMMERCIAL_PLAYED', { commercialId: commercial.id, title: commercial.title });
            
            return response.status(200).json({ message: 'Comercial adicionado à fila com prioridade máxima.' });

        } catch (error) {
            console.error('Erro ao tocar comercial:', error);
            return response.status(500).json({ message: 'Erro interno ao processar o comercial.' });
        }
    }

    static async setVolume(request, response) {
        try {
            const { volume } = request.body;
            if (typeof volume !== 'number' || volume < 0 || volume > 100) {
                return response.status(400).json({ message: 'O volume deve ser um número entre 0 e 100.' });
            }
            queueService.setVolume(volume);
            const io = socketService.getIo();
            if(io) io.emit('player:volume_change', { volume });
            response.status(200).json({ message: `Volume ajustado para ${volume}.` });
        } catch(error) {
            response.status(500).json({ message: 'Erro ao ajustar o volume.' });
        }
    }
    
    static async promoteRequest(request, response) {
         try {
            const { request_id } = request.body;
            if (!request_id) {
                return response.status(400).json({ message: 'O ID da requisição é obrigatório.' });
            }
            const success = queueService.promoteRequest(request_id);
            if (success) {
                socketService.enrichAndEmitQueue();
                response.status(200).json({ message: 'Requisição promovida para o topo da fila.' });
            } else {
                response.status(404).json({ message: 'Requisição não encontrada na fila.' });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao promover requisição.' });
        }
    }
}

module.exports = DjController;