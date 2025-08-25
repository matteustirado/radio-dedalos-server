const RequestHistoryModel = require('../models/requestHistoryModel');

class RequestHistoryController {
    static async createHistoryEntry(request, response) {
        try {
            const { song_id, requester_type, requester_identifier } = request.body;

            if (!song_id || !requester_type || !requester_identifier) {
                return response.status(400).json({ message: 'Campos song_id, requester_type, e requester_identifier são obrigatórios.' });
            }

            const newEntry = await RequestHistoryModel.create({ song_id, requester_type, requester_identifier });
            response.status(201).json(newEntry);
        } catch (error) {
            console.error("Erro ao criar registro no histórico:", error);
            response.status(500).json({ message: 'Erro ao criar registro no histórico de pedidos.' });
        }
    }

    static async getHistory(request, response) {
        try {
            const { month, year } = request.query;
            const history = await RequestHistoryModel.findAll({ month, year });
            response.status(200).json(history);
        } catch (error) {
            console.error("Erro ao buscar histórico de pedidos:", error);
            response.status(500).json({ message: 'Erro ao buscar histórico de pedidos.' });
        }
    }
}

module.exports = RequestHistoryController;