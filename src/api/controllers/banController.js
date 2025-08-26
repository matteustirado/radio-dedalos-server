const BannedModel = require('../models/bannedModel');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');
const queueService = require('../../services/queueService');

class BanController {
    static async createBan(request, response) {
        try {
            const { song_id, ban_period } = request.body;
            const user_id = request.user.id;

            if (!song_id || !ban_period) {
                return response.status(400).json({ message: 'Os campos song_id e ban_period são obrigatórios.' });
            }

            const newBan = await BannedModel.create({ song_id, user_id, ban_period });
            
            await logService.logAction(request, 'SONG_BANNED', { banId: newBan.id, songId: song_id, period: ban_period });
            
            // Força a atualização da lista de bans e da fila no servidor
            await queueService._refreshBans();

            const io = socketService.getIo();
            if (io) {
                // Notifica a todos que a lista de bans mudou
                io.emit('bans:updated');
                // Notifica a todos sobre a nova fila de reprodução (já sem a música banida)
                socketService.enrichAndEmitQueue();
            }

            response.status(201).json(newBan);
        } catch (error) {
            console.error("Erro ao criar banimento:", error);
            response.status(500).json({ message: 'Erro ao criar banimento.' });
        }
    }

    static async deactivateBan(request, response) {
        try {
            const { id } = request.params;
            const affectedRows = await BannedModel.deactivate(id);

            if (affectedRows > 0) {
                await logService.logAction(request, 'BAN_REMOVED', { banId: id });
                
                // Força a atualização da lista de bans no servidor
                await queueService._refreshBans();

                const io = socketService.getIo();
                if (io) {
                    // Notifica a todos que a lista de bans mudou
                    io.emit('bans:updated');
                    // Notifica a todos sobre a fila (caso a música desbanida possa ser adicionada de novo)
                    socketService.enrichAndEmitQueue();
                }
                response.status(200).json({ message: 'Banimento desativado com sucesso.' });
            } else {
                response.status(404).json({ message: 'Banimento não encontrado.' });
            }
        } catch (error) {
            console.error("Erro ao desativar banimento:", error);
            response.status(500).json({ message: 'Erro ao desativar banimento.' });
        }
    }
    
    static async getAllBansForManager(request, response) {
        try {
            const { status, month, year } = request.query;

            if (status && !['pendente', 'aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O parâmetro 'status' deve ser 'pendente', 'aceita' ou 'recusada'." });
            }

            const bans = await BannedModel.findAllForManager({ manager_status: status, month, year });
            response.status(200).json(bans);
        } catch (error) {
            console.error("Erro ao buscar banimentos para o gerente:", error);
            response.status(500).json({ message: 'Erro ao buscar banimentos.' });
        }
    }

    static async getActiveBans(request, response) {
        try {
            const activeBans = await BannedModel.findAllActive();
            response.status(200).json(activeBans);
        } catch (error) {
            console.error("Erro ao buscar banimentos ativos:", error);
            response.status(500).json({ message: 'Erro ao buscar banimentos ativos.' });
        }
    }

    static async updateBanManagerStatus(request, response) {
        try {
            const { id } = request.params;
            const { status } = request.body;

            if (!status || !['aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O novo status é obrigatório e deve ser 'aceita' ou 'recusada'." });
            }

            const affectedRows = await BannedModel.updateManagerStatus(id, status);

            if (affectedRows > 0) {
                const logType = status === 'aceita' ? 'BAN_REQUEST_ACCEPTED' : 'BAN_REQUEST_REFUSED';
                await logService.logAction(request, logType, { banId: id });

                const io = socketService.getIo();
                if (io) {
                    io.emit('bans:updated');
                }
                
                response.status(200).json({ message: `Status do banimento atualizado para '${status}' com sucesso.` });
            } else {
                response.status(404).json({ message: 'Banimento não encontrado.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar status do banimento:", error);
            response.status(500).json({ message: 'Erro ao atualizar status do banimento.' });
        }
    }
}

module.exports = BanController;