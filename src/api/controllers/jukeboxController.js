const queueService = require('../../services/queueService');
const SongModel = require('../models/songModel');
const JukeboxModel = require('../models/jukeboxModel');
const SuggestionModel = require('../models/suggestionModel');
const socketService = require('../../services/socketService');

class JukeboxController {
    static async getAvailableSongs(request, response) {
        try {
            const today = new Date().toLocaleString('en-US', {
                weekday: 'long',
                timeZone: 'America/Sao_Paulo'
            }).toLowerCase();
            const songs = await JukeboxModel.findAvailableSongsByWeekday(today);
            response.status(200).json(songs);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar músicas disponíveis.'
            });
        }
    }

    static async makeRequest(request, response) {
        try {
            const {
                song_id,
                requester_info
            } = request.body;
            const song = await SongModel.findById(song_id);
            if (!song) {
                return response.status(404).json({
                    message: 'Música não encontrada.'
                });
            }

            const requestData = {
                ...song,
                song_id: song.id,
                requester_info
            };
            const result = await queueService.validateAndAddRequest(requestData);

            if (!result.success) {
                return response.status(409).json({
                    message: result.message
                });
            }

            const io = socketService.getIo();
            io.emit('queue:updated', {
                upcoming_requests: queueService.getQueue(),
                play_history: queueService.getHistory(),
                player_state: queueService.getPlayerState(),
                current_song: queueService.getCurrentSong()
            });

            response.status(201).json({
                message: 'Pedido de música enviado com sucesso!',
                request: result.request
            });

        } catch (error) {
            response.status(500).json({
                message: 'Erro ao processar pedido de música.'
            });
        }
    }

    static async makeSuggestion(request, response) {
        try {
            const {
                suggestion_text,
                requester_info
            } = request.body;
            let song_title = suggestion_text;
            let artist_name = 'Não especificado';

            if (suggestion_text && suggestion_text.includes('-')) {
                const parts = suggestion_text.split('-');
                song_title = parts[0].trim();
                artist_name = parts[1].trim();
            }

            const newSuggestion = await SuggestionModel.create({
                song_title,
                artist_name,
                requester_info
            });
            response.status(201).json(newSuggestion);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao registrar sugestão.'
            });
        }
    }
}

module.exports = JukeboxController;