const SlideModel = require('../models/slideModel');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');
const fs = require('fs');
const path = require('path');
const db = require('../../config/database');

const baseUploadsDir = path.join(__dirname, '../../../public/assets/uploads');

const cleanupFiles = (files, locationSlug) => {
    if (files && files.length > 0) {
        files.forEach(file => {
            fs.unlink(path.join(baseUploadsDir, locationSlug, file.filename), (err) => {
                if (err) console.error(`Erro ao tentar limpar arquivo ${file.filename}:`, err);
            });
        });
    }
};

class SlideController {
    static async uploadSlides(request, response) {
        try {
            const {
                locationSlug
            } = request.params;
            const {
                daysOfWeek
            } = request.body;
            const files = request.files;

            if (!files || files.length === 0) {
                return response.status(400).json({
                    message: 'Nenhum arquivo de imagem foi enviado.'
                });
            }
            if (!daysOfWeek) {
                cleanupFiles(files, locationSlug);
                return response.status(400).json({
                    message: 'Dados sobre os dias da semana estão faltando.'
                });
            }

            const parsedDays = JSON.parse(daysOfWeek);

            if (files.length !== parsedDays.length) {
                cleanupFiles(files, locationSlug);
                return response.status(400).json({
                    message: 'A quantidade de imagens não corresponde à quantidade de dados de dias da semana.'
                });
            }

            const [locations] = await db.execute('SELECT id FROM locations WHERE slug = ?', [locationSlug]);
            if (locations.length === 0) {
                cleanupFiles(files, locationSlug);
                return response.status(404).json({
                    message: 'Localização não encontrada.'
                });
            }
            const locationId = locations[0].id;

            const promises = [];
            files.forEach((file, index) => {
                const daysForThisFile = parsedDays[index];
                if (daysForThisFile && daysForThisFile.length > 0) {
                    daysForThisFile.forEach(day => {
                        promises.push(SlideModel.create(locationId, file.filename, day));
                    });
                }
            });

            if (promises.length === 0) {
                cleanupFiles(files, locationSlug);
                return response.status(400).json({ message: 'Nenhum dia foi selecionado para as imagens enviadas.' });
            }

            const newSlides = await Promise.all(promises);

            await logService.logAction(request, 'SLIDES_UPLOADED', {
                count: newSlides.length,
                location: locationSlug
            });

            const io = socketService.getIo();
            if (io) {
                io.emit('slides:updated', {
                    location: locationSlug
                });
            }

            response.status(201).json({
                message: `${files.length} slide(s) enviados com sucesso!`,
                slides: newSlides
            });

        } catch (error) {
            console.error("ERRO CRÍTICO DENTRO DO UPLOADSLIDES", error);
            cleanupFiles(request.files, request.params.locationSlug);
            response.status(500).json({
                message: 'Erro ao fazer upload dos slides.',
                error: error.message
            });
        }
    }

    static async getAllSlidesGrouped(request, response) {
        try {
            const {
                locationSlug
            } = request.params;
            const slides = await SlideModel.findAllByLocationSlugGrouped(locationSlug);
            response.status(200).json(slides);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar os slides.',
                error: error.message
            });
        }
    }
    static async getSlidesByDay(request, response) {
        try {
            const {
                locationSlug,
                dayOfWeek
            } = request.params;
            const slides = await SlideModel.findByLocationAndDay(locationSlug, dayOfWeek);
            response.status(200).json(slides);
        } catch (error) {
            response.status(500).json({
                message: `Erro ao buscar slides para ${dayOfWeek}.`,
                error: error.message
            });
        }
    }
    static async deleteSlide(request, response) {
        try {
            const {
                slideId
            } = request.params;
            const slide = await SlideModel.findById(slideId);
            if (!slide) {
                return response.status(404).json({
                    message: 'Slide não encontrado.'
                });
            }
            const success = await SlideModel.remove(slideId);
            if (success) {
                const filePath = path.join(baseUploadsDir, slide.location_slug, slide.image_filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                await logService.logAction(request, 'SLIDE_DELETED', {
                    slideId
                });
                const io = socketService.getIo();
                if (io) {
                    io.emit('slides:updated', {
                        location: slide.location_slug
                    });
                }
                response.status(200).json({
                    message: 'Slide excluído com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Não foi possível excluir o slide.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao excluir o slide.',
                error: error.message
            });
        }
    }
}

module.exports = SlideController;