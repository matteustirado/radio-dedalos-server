const ArtistModel = require('../models/artistModel');

class ArtistController {
    static async getAllArtists(request, response) {
        try {
            const artists = await ArtistModel.findAll();
            response.status(200).json(artists);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar artistas.'
            });
        }
    }

    static async createArtist(request, response) {
        try {
            const artist = await ArtistModel.findOrCreate(request.body.name);
            response.status(201).json(artist);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao criar ou encontrar artista.',
                error: error.message
            });
        }
    }

    static async updateArtist(request, response) {
        try {
            const affectedRows = await ArtistModel.update(request.params.id, request.body);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Artista atualizado com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Artista não encontrado.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao atualizar artista.'
            });
        }
    }

    static async deleteArtist(request, response) {
        try {
            const affectedRows = await ArtistModel.delete(request.params.id);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Artista deletado com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Artista não encontrado.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao deletar artista.'
            });
        }
    }
}

module.exports = ArtistController;