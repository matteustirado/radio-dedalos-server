const WebRatingModel = require('../models/webRatingModel');
const TwitterRepostModel = require('../models/twitterRepostModel'); // Nome do model corrigido
const webRatingService = require('../../services/webRatingService');

class WebRatingController {
    static async getGoogleReviews(request, response) {
        const { locationSlug } = request.params;
        try {
            let reviews = await WebRatingModel.findByLocation(locationSlug);

            if (!reviews || reviews.length === 0) {
                console.log(`[WebRatingController] Nenhuma avaliação encontrada no banco para ${locationSlug}. Disparando busca inicial...`);
                await webRatingService.fetchAndStoreReviews(locationSlug);
                reviews = await WebRatingModel.findByLocation(locationSlug);
            }
            
            response.status(200).json(reviews);
        } catch (error) {
            console.error("Erro ao buscar avaliações do banco de dados:", error.message);
            response.status(500).json({ message: 'Erro ao buscar as avaliações do Google.' });
        }
    }

    static async getTwitterReposts(request, response) {
        try {
            const reposts = await TwitterRepostModel.findAllByLocation(request.params.locationSlug);
            response.status(200).json(reposts);
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar reposts.' });
        }
    }
}

module.exports = WebRatingController;