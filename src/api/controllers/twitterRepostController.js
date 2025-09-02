const TwitterRepostModel = require('../models/twitterRepostModel');
const TweetScraperService = require('../../services/tweetScraperService');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');

class TwitterRepostController {
    static async scrapeAndCreate(request, response) {
        const { tweetUrl, location_slug } = request.body;
        if (!tweetUrl || !location_slug) {
            return response.status(400).json({ message: 'A URL do tweet e a localização são obrigatórias.' });
        }

        try {
            const scrapedData = await TweetScraperService.scrapeTweet(tweetUrl);
            
            const payload = {
                ...scrapedData,
                location_slug
            };

            const newRepost = await TwitterRepostModel.create(payload);
            await logService.logAction(request, 'TWITTER_REPOST_CREATED', { repostId: newRepost.id });
            
            const io = socketService.getIo();
            if (io) {
                io.emit('reviews:updated', { location: location_slug });
            }
            
            response.status(201).json(newRepost);

        } catch (error) {
            response.status(500).json({ message: error.message || 'Erro ao buscar e salvar o tweet.' });
        }
    }

    static async getAllByLocation(request, response) {
        try {
            const reposts = await TwitterRepostModel.findAllByLocation(request.params.locationSlug);
            response.status(200).json(reposts);
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar reposts.' });
        }
    }

    static async deleteRepost(request, response) {
        try {
            const affectedRows = await TwitterRepostModel.delete(request.params.id);
            if (affectedRows > 0) {
                await logService.logAction(request, 'TWITTER_REPOST_DELETED', { repostId: request.params.id });
                 const io = socketService.getIo();
                if (io) {
                    io.emit('reviews:updated', { location: 'sp' });
                    io.emit('reviews:updated', { location: 'bh' });
                }
                response.status(200).json({ message: 'Repost deletado com sucesso.' });
            } else {
                response.status(404).json({ message: 'Repost não encontrado.' });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao deletar repost.' });
        }
    }
}

module.exports = TwitterRepostController;