const SuggestionModel = require('../models/suggestionModel');

class SuggestionController {
    static async getAllSuggestions(request, response) {
        try {
            const { status, month, year } = request.query;

            if (!status || !['pendente', 'aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O parâmetro 'status' é obrigatório e deve ser 'pendente', 'aceita' ou 'recusada'." });
            }

            const suggestions = await SuggestionModel.findAllByStatus({ status, month, year });
            response.status(200).json(suggestions);
        } catch (error) {
            console.error("Erro ao buscar sugestões:", error);
            response.status(500).json({
                message: 'Erro ao buscar sugestões.'
            });
        }
    }

    static async updateSuggestionStatus(request, response) {
        try {
            const { id } = request.params;
            const { status } = request.body;

            if (!status || !['aceita', 'recusada'].includes(status)) {
                return response.status(400).json({ message: "O novo status é obrigatório e deve ser 'aceita' ou 'recusada'." });
            }

            const affectedRows = await SuggestionModel.updateStatus(id, status);

            if (affectedRows > 0) {
                response.status(200).json({ message: `Sugestão marcada como '${status}' com sucesso.` });
            } else {
                response.status(404).json({ message: 'Sugestão não encontrada.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar status da sugestão:", error);
            response.status(500).json({
                message: 'Erro ao atualizar status da sugestão.'
            });
        }
    }

    static async deleteSuggestion(request, response) {
        try {
            const affectedRows = await SuggestionModel.delete(request.params.id);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Sugestão deletada com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Sugestão não encontrada.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao deletar sugestão.'
            });
        }
    }
}

module.exports = SuggestionController;