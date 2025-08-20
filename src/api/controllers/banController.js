const BannedSongModel = require('../models/bannedSongModel');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');

class BanController {
    static async getActiveBans(request, response) {
        try {
            const bannedSongs = await BannedSongModel.findAllActive();
            response.status(200).json(bannedSongs);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar banimentos.'
            });
        }
    }

    static async removeBan(request, response) {
        try {
            const {
                song_id
            } = request.params;
            const affectedRows = await BannedSongModel.remove(song_id);
            if (affectedRows > 0) {
                await logService.logAction(request, 'BAN_REMOVED', {
                    songId: song_id
                });

                const io = socketService.getIo();
                io.emit('bans:updated');

                response.status(200).json({
                    message: 'Banimento removido com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Banimento não encontrado para esta música.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao remover banimento.'
            });
        }
    }
}

module.exports = BanController;