const RankingModel = require('../models/rankingModel');

class RankingController {
    static async createVote(request, response) {
        try {
            const { artist_name, wristband_code, unit } = request.body;
            if (!artist_name || !wristband_code || !unit) {
                return response.status(400).json({ message: 'Campos artist_name, wristband_code e unit são obrigatórios.' });
            }
            const newVote = await RankingModel.createVote({ artist_name, wristband_code, unit });
            response.status(201).json(newVote);
        } catch (error) {
            console.error("Erro ao registrar voto no ranking:", error);
            response.status(500).json({ message: 'Erro ao registrar voto.' });
        }
    }

    static async getRankings(request, response) {
        try {
            const { period, unit } = request.query;
            if (!period || !['current_week', 'previous_week'].includes(period)) {
                return response.status(400).json({ message: "O parâmetro 'period' é obrigatório e deve ser 'current_week' ou 'previous_week'." });
            }
            if (!unit) {
                return response.status(400).json({ message: "O parâmetro 'unit' é obrigatório." });
            }
            const rankings = await RankingModel.getRankings(period, unit);
            response.status(200).json(rankings);
        } catch (error) {
            console.error("Erro ao buscar rankings:", error);
            response.status(500).json({ message: 'Erro ao buscar rankings.' });
        }
    }
}

module.exports = RankingController;