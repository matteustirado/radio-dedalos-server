const PlaylistModel = require('../models/playlistModel');
const queueService = require('../../services/queueService');
const storageService = require('../../services/storageService');
const socketService = require('../../services/socketService');

class PlaylistController {
    static async createPlaylist(request, response) {
        try {
            const { special_dates, ...playlistData } = request.body;
            const newPlaylist = await PlaylistModel.create(playlistData);

            if ((newPlaylist.type === 'especial' || newPlaylist.type === 'diaria') && special_dates) {
                await PlaylistModel.manageSpecialDates(newPlaylist.id, special_dates);
            }

            const fullPlaylistObject = await PlaylistModel.findById(newPlaylist.id);
            response.status(201).json(fullPlaylistObject);
        } catch (error) {
            console.error('ERRO NO CONTROLLER AO CRIAR PLAYLIST:', error);
            response.status(500).json({
                message: 'Erro ao criar playlist.',
                error: error.message
            });
        }
    }

    static async getAllPlaylists(request, response) {
        try {
            const { status } = request.query;
            const statusMap = { published: 'publicada', draft: 'rascunho' };
            const dbStatus = statusMap[status] || status;

            const playlists = await PlaylistModel.findAll(dbStatus);
            const queueState = queueService.getQueueState();

            const playlistsWithStatus = playlists.map(p => ({
                ...p,
                is_active: p.id === queueState.playlistId
            }));

            response.status(200).json(playlistsWithStatus);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar playlists.'
            });
        }
    }

    static async getPlaylistDetails(request, response) {
        try {
            const { id } = request.params;
            const playlistInfo = await PlaylistModel.findById(id);
            if (!playlistInfo) {
                return response.status(404).json({
                    message: 'Playlist não encontrada.'
                });
            }
            response.status(200).json(playlistInfo);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar detalhes da playlist.'
            });
        }
    }

    static async updatePlaylist(request, response) {
        try {
            const { id } = request.params;
            const { special_dates, ...playlistData } = request.body;
            const playlistExists = await PlaylistModel.findById(id);

            if (!playlistExists) {
                return response.status(404).json({
                    message: 'Playlist não encontrada.'
                });
            }

            await PlaylistModel.update(id, playlistData);

            if ((playlistData.type === 'especial' || playlistData.type === 'diaria') && special_dates) {
                await PlaylistModel.manageSpecialDates(id, special_dates);
            }

            const updatedPlaylist = await PlaylistModel.findById(id);
            response.status(200).json(updatedPlaylist);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao atualizar playlist.',
                error: error.message
            });
        }
    }
    
    static async activatePlaylist(request, response) {
        try {
            const { id } = request.params;
            const newState = await queueService.activatePlaylist(id, 'dj');
            
            if (!newState) {
                return response.status(404).json({ message: 'Playlist não encontrada ou está vazia.' });
            }

            const io = socketService.getIo();
            io.emit('queue:updated', {
                upcoming_requests: queueService.getQueue(),
                play_history: queueService.getHistory(),
                player_state: queueService.getPlayerState(),
                current_song: queueService.getCurrentSong()
            });

            response.status(200).json({
                message: `Playlist "${newState.playlistName}" ativada com sucesso.`
            });
        } catch (error) {
            console.error('ERRO AO ATIVAR PLAYLIST:', error);
            response.status(500).json({ message: 'Erro ao ativar playlist.', error: error.message });
        }
    }

    static async deletePlaylist(request, response) {
        try {
            const affectedRows = await PlaylistModel.delete(request.params.id);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Playlist deletada com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Playlist não encontrada.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao deletar playlist.'
            });
        }
    }

    static async getCurrentSong(request, response) {
        try {
            const currentSong = queueService.getCurrentSong();
            const playerState = queueService.getPlayerState();

            if (currentSong && currentSong.filename && playerState.isPlaying) {
                const videoUrl = storageService.getFileUrl(currentSong.filename);
                
                const startTime = playerState.playbackStartTimestamp;
                const pausedDuration = playerState.accumulatedPausedDuration;
                const elapsedTimeMs = Date.now() - startTime - pausedDuration;
                const currentTimeSec = Math.max(0, elapsedTimeMs / 1000);

                let fullArtistString = currentSong.artist_name;
                if (currentSong.featuring_artists && currentSong.featuring_artists.length > 0) {
                    const featuringNames = currentSong.featuring_artists.map(feat => feat.name).join(', ');
                    fullArtistString += ` feat. ${featuringNames}`;
                }

                response.status(200).json({
                    videoUrl: videoUrl,
                    currentTime: currentTimeSec,
                    duration_seconds: currentSong.duration_seconds,
                    title: currentSong.title,
                    album: currentSong.album,
                    artist: fullArtistString,
                    record_label: currentSong.record_label_name,
                    director: currentSong.director
                });
            } else {
                response.status(200).json({ 
                    message: 'Nenhuma música tocando no momento.', 
                    videoUrl: null,
                    currentTime: 0
                });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar a música atual.', error: error.message });
        }
    }

    static async managePlaylistItems(request, response) {
        const { id } = request.params;
        const { items } = request.body;
        try {
            await PlaylistModel.managePlaylistItems(id, items);
            const updatedPlaylist = await PlaylistModel.findById(id);
            response.status(200).json(updatedPlaylist);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao gerenciar itens da playlist.',
                error: error.message
            });
        }
    }
}

module.exports = PlaylistController;