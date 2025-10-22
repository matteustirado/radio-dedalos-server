const GameConfigModel = require('../models/gameConfigModel');
const path = require('path');
const fs = require('fs');

const uploadDirBase = path.join(__dirname, '../../../public/assets/uploads/game_options');

const ensureUploadDir = (unit) => {
    const unitDir = path.join(uploadDirBase, unit);
    if (!fs.existsSync(unitDir)) {
        fs.mkdirSync(unitDir, { recursive: true });
    }
    return unitDir;
};

class GameConfigController {

    static async getGameConfig(request, response) {
        try {
            const { unit } = request.params;
            console.log(`[GameConfigController] GET /api/game-config/${unit}`);
            const config = await GameConfigModel.getConfig(unit);
            if (config) {
                 console.log(`[GameConfigController] Config found for ${unit}:`, JSON.stringify(config));
                response.status(200).json(config);
            } else {
                 console.log(`[GameConfigController] Config NOT found for ${unit}.`);
                response.status(404).json({ message: 'Configuração não encontrada para esta unidade.' });
            }
        } catch (error) {
            console.error("Erro ao buscar configuração do game:", error);
            response.status(500).json({ message: 'Erro ao buscar configuração.' });
        }
    }

    static async updateGameConfig(request, response) {
        const tempFilesToCleanup = (request.files || []).map(f => f.path);

        try {
            const { unit } = request.params;
            console.log(`[GameConfigController] PUT /api/game-config/${unit}`);
            console.log('[GameConfigController] Raw req.body:', JSON.stringify(request.body));
            console.log('[GameConfigController] req.files:', request.files);

            const configData = {
                 options: request.body.options ? JSON.parse(request.body.options) : [],
                 placard_orientation: request.body.placard_orientation
            };

            console.log('[GameConfigController] Parsed configData.options:', JSON.stringify(configData.options));

            const imageFilenames = {};
            const files = request.files || [];

            if (files.length > 0) {
                 console.log(`[GameConfigController] Processing ${files.length} files...`);
                 const unitUploadDir = ensureUploadDir(unit);
                 files.forEach(file => {
                    const match = file.fieldname.match(/option_image_(\d+)/);
                    if (match && match[1]) {
                        const index = parseInt(match[1], 10);
                        const newFilename = `${unit}_option_${index}_${Date.now()}${path.extname(file.originalname)}`;
                        const newPath = path.join(unitUploadDir, newFilename);
                        const tempPath = file.path;

                        console.log(`[GameConfigController] Copying file ${file.originalname} for index ${index} from ${tempPath} to ${newPath}`);
                        
                        fs.copyFileSync(tempPath, newPath);
                        

                        imageFilenames[index] = newFilename;

                        const oldOption = configData.options[index];
                        if(oldOption?.type === 'image' && oldOption?.value && oldOption.value !== newFilename) {
                            const oldPath = path.join(unitUploadDir, oldOption.value);
                            if (fs.existsSync(oldPath)) {
                                 console.log(`[GameConfigController] Deleting old image for index ${index}: ${oldPath}`);
                                fs.unlink(oldPath, (err) => {
                                    if(err) console.error(`Error deleting old image ${oldOption.value}:`, err);
                                });
                            }
                        }
                    } else {
                         console.warn(`[GameConfigController] Unexpected file fieldname: ${file.fieldname}.`);
                    }
                 });
            }

            if (configData.options && Array.isArray(configData.options)) {
                 configData.options.forEach((option, index) => {
                     if(option.type === 'image' && imageFilenames[index] === undefined) {
                         imageFilenames[index] = null;
                         console.log(`[GameConfigController] Index ${index} is image, no new file found.`);
                     }
                 });
             } else {
                  console.error("[GameConfigController] configData.options is not an array!");
                  throw new Error("Dados de opções inválidos recebidos.");
             }

             console.log('[GameConfigController] Calling saveConfig with imageFilenames map:', JSON.stringify(imageFilenames));
            await GameConfigModel.saveConfig(unit, configData, imageFilenames);

             console.log('[GameConfigController] Config saved successfully.');
            response.status(200).json({ message: 'Configuração atualizada com sucesso.' });

        } catch (error) {
            console.error("Erro ao atualizar configuração do game:", error);
            response.status(500).json({ message: 'Erro ao atualizar configuração.', error: error.message });
        } finally {
             tempFilesToCleanup.forEach(tempPath => {
                 if (tempPath && fs.existsSync(tempPath)) {
                     console.log(`[GameConfigController] Cleaning up temp file: ${tempPath}`);
                     fs.unlinkSync(tempPath);
                 }
             });
        }
    }
}

module.exports = GameConfigController;