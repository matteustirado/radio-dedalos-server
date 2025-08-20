const LogModel = require('../models/logModel');

class LogController {
    static async getAllLogs(request, response) {
        try {
            const logs = await LogModel.findAll();
            response.status(200).json(logs);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar logs.'
            });
        }
    }
}

module.exports = LogController;