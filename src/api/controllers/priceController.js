const PriceModel = require('../models/priceModel');
const logService = require('../../services/logService');
const socketService = require('../../services/socketService');

class PriceController {
    static async getPricesByLocation(request, response) {
        try {
            const {
                locationSlug
            } = request.params;
            const data = await PriceModel.findAllByLocationSlug(locationSlug);

            if (!data) {
                return response.status(404).json({
                    message: 'Localização não encontrada.'
                });
            }

            const formattedResponse = {
                dias: {},
                feriados: data.holidays.map(h => {
                    const date = new Date(h.holiday_date);
                    const day = String(date.getUTCDate()).padStart(2, '0');
                    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                    return `${day}-${month}-${date.getUTCFullYear()}`;
                })
            };

            data.prices.forEach(p => {
                if (!formattedResponse.dias[p.day_type]) {
                    formattedResponse.dias[p.day_type] = {
                        prices: {},
                        messages: {}
                    };
                }
                if (!formattedResponse.dias[p.day_type].prices[p.service_type]) {
                    formattedResponse.dias[p.day_type].prices[p.service_type] = {};
                }
                formattedResponse.dias[p.day_type].prices[p.service_type][p.time_slot] = parseFloat(p.price);
            });

            data.messages.forEach(m => {
                if (!formattedResponse.dias[m.day_type]) {
                    formattedResponse.dias[m.day_type] = {
                        prices: {},
                        messages: {}
                    };
                }
                if (!formattedResponse.dias[m.day_type].messages[m.service_type]) {
                    formattedResponse.dias[m.day_type].messages[m.service_type] = {};
                }
                formattedResponse.dias[m.day_type].messages[m.service_type].message = m.message;
            });

            response.status(200).json(formattedResponse);
        } catch (error) {
            console.error("ERRO AO BUSCAR PREÇOS:", error);
            response.status(500).json({
                message: 'Erro ao buscar a tabela de preços.',
                error: error.message
            });
        }
    }

    static async updatePricesByLocation(request, response) {
        try {
            const {
                locationSlug
            } = request.params;
            const priceData = request.body;
            await PriceModel.updateAllByLocationSlug(locationSlug, priceData);
            await logService.logAction(request, 'PRICES_UPDATED', {
                location: locationSlug
            });

            const io = socketService.getIo();
            if (io) {
                io.emit('prices:updated', {
                    location: locationSlug
                });
            }

            response.status(200).json({
                message: `Tabela de preços para ${locationSlug.toUpperCase()} atualizada com sucesso.`
            });
        } catch (error) {
            console.error("ERRO AO ATUALIZAR TABELA DE PREÇOS", error);
            response.status(500).json({
                message: 'Erro ao atualizar a tabela de preços.',
                error: error.message
            });
        }
    }
}

module.exports = PriceController;