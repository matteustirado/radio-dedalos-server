const fs = require('fs');
const path = require('path');
const queueService = require('../../services/queueService');
const socketService = require('../../services/socketService');
const PlaylistModel = require('../models/playlistModel');
const SongModel = require('../models/songModel');
const SettingModel = require('../models/settingModel');
const logService = require('../../services/logService');
const storageService = require('../../services/storageService');

const overlayDir = path.resolve(__dirname, '../../../public/assets/uploads/overlay');
let maestroInterval = null;

const enrichAndEmitQueue = () => {
    const io = socketService.getIo();
    io.emit('queue:updated', {
        upcoming_requests: queueService.getQueue(),
        play_history: queueService.getHistory(),
        player_state: queueService.getPlayerState(),
        current_song: queueService.getCurrentSong()
    });
};

const _playNextSongAndNotify = async (request) => {
    const songToPlay = queueService.playNextInQueue();
    const io = socketService.getIo();

    if (songToPlay && songToPlay.filename) {
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
            await logService.logAction(request, 'SONG_PLAYED', { songId: songToPlay.id, title: songToPlay.title });
        }
        enrichAndEmitQueue();
        return { success: true, song: songToPlay };
    } else {
        queueService.stopPlayback();
        io.emit('playlist:finished');
        if (maestroInterval) {
            clearInterval(maestroInterval);
            maestroInterval = null;
        }
        enrichAndEmitQueue();
        return { success: false, message: 'Fila terminada.' };
    }
};

const startMaestroLoop = (request) => {
    if (maestroInterval) {
        clearInterval(maestroInterval);
    }

    maestroInterval = setInterval(async () => {
        const currentSong = queueService.getCurrentSong();
        const playerState = queueService.getPlayerState();

        if (!playerState.isPlaying || !currentSong) {
            return;
        }

        const songDurationMs = (currentSong.duration_seconds || 0) * 1000;
        if (songDurationMs <= 0) return;

        const startTime = playerState.playbackStartTimestamp;
        const pausedDuration = playerState.accumulatedPausedDuration;
        const elapsedTime = Date.now() - startTime - pausedDuration;

        if (elapsedTime >= songDurationMs - 1000) {
            await _playNextSongAndNotify(request);
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
            io.emit('overlay:updated', { filename: newFilename });
            
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
            const playlist = await PlaylistModel.findById(id);
            if (!playlist || playlist.status !== 'publicada') {
                return response.status(404).json({ message: 'Playlist não encontrada.' });
            }
            await queueService.loadPlaylistIntoQueue(playlist);
            await logService.logAction(request, 'PLAYLIST_ACTIVATED', { playlistId: id, name: playlist.name });

            await _playNextSongAndNotify(request);
            startMaestroLoop(request);
            
            response.status(200).json({ message: `Playlist "${playlist.name}" ativada.` });

        } catch (error) {
            response.status(500).json({ message: 'Erro ao ativar a playlist.', error: error.message });
        }
    }

    static async togglePause(request, response) {
        const playerState = queueService.getPlayerState();
        const io = socketService.getIo();

        if (playerState.isPlaying) {
            queueService.pause();
            io.emit('player:pause');
            await logService.logAction(request, 'PLAYER_PAUSED');
            enrichAndEmitQueue();
            response.status(200).json({ message: 'Transmissão pausada.' });
        } else {
            queueService.resume();
            const currentSong = queueService.getCurrentSong();
            if (currentSong) {
                const updatedPlayerState = queueService.getPlayerState();
                const startTime = updatedPlayerState.playbackStartTimestamp;
                const pausedDuration = updatedPlayerState.accumulatedPausedDuration;
                const currentTimeInSeconds = (Date.now() - startTime - pausedDuration) / 1000;

                const videoUrl = storageService.getFileUrl(currentSong.filename);
                io.emit('player:play', {
                    title: currentSong.title,
                    artist: currentSong.artist_name,
                    videoUrl: videoUrl,
                    currentTime: currentTimeInSeconds
                });
            }
            await logService.logAction(request, 'PLAYER_RESUMED');
            enrichAndEmitQueue();
            response.status(200).json({ message: 'Retomando a transmissão.' });
        }
    }

    static async skip(request, response) {
        try {
            const result = await _playNextSongAndNotify(request);
            if (result.success) {
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
            const result = await _playNextSongAndNotify(request);
            if (result.success) {
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
            enrichAndEmitQueue();
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
                enrichAndEmitQueue();
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
    
            await queueService.banSong(song_id, duration);
    
            enrichAndEmitQueue();
    
            const io = socketService.getIo();
            io.emit('bans:updated');
    
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
            
            enrichAndEmitQueue();
            
            await logService.logAction(request, 'COMMERCIAL_PLAYED', { commercialId: commercial.id, title: commercial.title });
            
            return response.status(200).json({ message: 'Comercial adicionado à fila com prioridade máxima.' });

        } catch (error) {
            console.error('Erro ao tocar comercial:', error);
            return response.status(500).json({ message: 'Erro interno ao processar o comercial.' });
        }
    }

    static async setVolume(request, response) {}
    static async promoteRequest(request, response) {}
}

module.exports = DjController;