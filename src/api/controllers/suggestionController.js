const SuggestionModel = require('../models/suggestionModel');

class SuggestionController {
    static async getAllSuggestions(request, response) {
        try {
            const suggestions = await SuggestionModel.findAll();
            response.status(200).json(suggestions);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar sugestões.'
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