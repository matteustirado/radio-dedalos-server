const SettingModel = require('../models/settingModel');
const logService = require('../../services/logService');

class SettingController {
    static async getSetting(request, response) {
        try {
            const setting = await SettingModel.find(request.params.key);
            if (setting) {
                response.status(200).json(setting);
            } else {
                response.status(404).json({
                    message: 'Configuração não encontrada.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar configuração.'
            });
        }
    }

    static async updateSetting(request, response) {
        try {
            const {
                key
            } = request.params;
            const {
                value
            } = request.body;
            await SettingModel.upsert(key, value);
            await logService.logAction(request, 'SETTING_UPDATED', {
                key,
                value
            });
            response.status(200).json({
                message: 'Configuração atualizada com sucesso.'
            });
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao atualizar configuração.'
            });
        }
    }

    static async getActiveOverlay(request, response) {
        try {
            const setting = await SettingModel.find('active_overlay_filename');
            if (setting && setting.setting_value) {
                response.status(200).json({ filename: setting.setting_value });
            } else {
                response.status(404).json({ message: 'Nenhum overlay ativo encontrado.' });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar overlay ativo.'
            });
        }
    }
}

module.exports = SettingController;