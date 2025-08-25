const BanRequestModel = require('../models/bannedModel');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');

class BanRequestController {
    static async createBanRequest(request, response) {
        try {
            const { song_id, ban_period } = request.body;
            const user_id = request.user.id;

            if (!song_id || !ban_period) {
                return response.status(400).json({ message: 'Os campos song_id e ban_period são obrigatórios.' });
            }

            const newBanRequest = await BanRequestModel.create({ song_id, user_id, ban_period });
            
            await logService.logAction(request, 'BAN_REQUEST_CREATED', { banRequestId: newBanRequest.id });
            
            const io = socketService.getIo();
            io.emit('bans:updated');

            response.status(201).json(newBanRequest);
        } catch (error) {
            console.error("Erro ao criar solicitação de banimento:", error);
            response.status(500).json({ message: 'Erro ao criar solicitação de banimento.' });
        }
    }

    static async getAllBanRequests(request, response) {
        try {
            const { status, month, year } = request.query;

            if (status && !['pendente', 'aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O parâmetro 'status' deve ser 'pendente', 'aceita' ou 'recusada'." });
            }

            const banRequests = await BanRequestModel.findAllByStatus({ status, month, year });
            response.status(200).json(banRequests);
        } catch (error) {
            console.error("Erro ao buscar solicitações de banimento:", error);
            response.status(500).json({ message: 'Erro ao buscar solicitações de banimento.' });
        }
    }

    static async updateBanRequestStatus(request, response) {
        try {
            const { id } = request.params;
            const { status } = request.body;

            if (!status || !['aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O novo status é obrigatório e deve ser 'aceita' ou 'recusada'." });
            }

            const affectedRows = await BanRequestModel.updateStatus(id, status);

            if (affectedRows > 0) {
                const logType = status === 'aceita' ? 'BAN_REQUEST_ACCEPTED' : 'BAN_REQUEST_REFUSED';
                await logService.logAction(request, logType, { banRequestId: id });

                const io = socketService.getIo();
                io.emit('bans:updated');
                
                response.status(200).json({ message: `Solicitação de banimento marcada como '${status}' com sucesso.` });
            } else {
                response.status(404).json({ message: 'Solicitação de banimento não encontrada.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar status do banimento:", error);
            response.status(500).json({ message: 'Erro ao atualizar status do banimento.' });
        }
    }
}

module.exports = BanRequestController;