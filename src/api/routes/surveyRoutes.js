const SurveyModel = require('../models/surveyModel');

class SurveyController {
    static async createResponse(request, response) {
        try {
            const newResponse = await SurveyModel.create(request.body);
            response.status(201).json(newResponse);
        } catch (error) {
            console.error("Erro ao salvar resposta da pesquisa:", error);
            response.status(500).json({ message: 'Erro ao salvar resposta da pesquisa.' });
        }
    }
}

module.exports = SurveyController;