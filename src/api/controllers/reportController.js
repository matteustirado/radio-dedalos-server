const ReportModel = require('../models/reportModel');
const logService = require('../../services/logService');

class ReportController {
    static async createReport(request, response) {
        try {
            const newReport = await ReportModel.create(request.body);
            response.status(201).json(newReport);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao registrar o relatório.'
            });
        }
    }

    static async getAllReports(request, response) {
        try {
            const reports = await ReportModel.findAll();
            response.status(200).json(reports);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar relatórios.'
            });
        }
    }

    static async updateReportStatus(request, response) {
        try {
            const {
                id
            } = request.params;
            const {
                status
            } = request.body;
            const affectedRows = await ReportModel.updateStatus(id, status);
            if (affectedRows > 0) {
                await logService.logAction(request, 'REPORT_STATUS_UPDATED', {
                    reportId: id,
                    newStatus: status
                });
                response.status(200).json({
                    message: 'Status do relatório atualizado com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Relatório não encontrado.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao atualizar status do relatório.'
            });
        }
    }
}

module.exports = ReportController;