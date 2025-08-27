const MoodVoteModel = require('../models/moodVoteModel');

const MoodVoteController = {
    async createVote(request, response) {
        try {
            const { rating, comment, wristband_code, unit } = request.body;

            if (!rating || !wristband_code || !unit) {
                return response.status(400).json({ message: 'Campos rating, wristband_code e unit são obrigatórios.' });
            }

            const newVote = await MoodVoteModel.create({ rating, comment, wristband_code, unit });
            response.status(201).json(newVote);
        } catch (error) {
            console.error("Erro ao registrar voto:", error);
            response.status(500).json({ message: 'Erro ao registrar voto.' });
        }
    }
};

module.exports = MoodVoteController;