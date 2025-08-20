const SongModel = require('../models/songModel');

class CommercialController {
    static async getAllCommercials(request, response) {
        try {
            const commercials = await SongModel.findAllCommercials();
            response.status(200).json(commercials);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar comerciais.'
            });
        }
    }
}

module.exports = CommercialController;