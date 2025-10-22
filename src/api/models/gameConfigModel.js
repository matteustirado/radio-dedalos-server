const db = require('../../config/database');

class GameConfigModel {
    static async getConfig(unit) {
        console.log(`[GameConfigModel] Fetching config for unit: ${unit} from DB.`);
        const [rows] = await db.execute(
            'SELECT options, placard_orientation FROM game_config WHERE unit = ?',
            [unit]
        );
        if (rows.length > 0) {
             console.log(`[GameConfigModel] Raw options from DB for ${unit}:`, rows[0].options);
            try {
                const optionsString = (typeof rows[0].options === 'string') ? rows[0].options : JSON.stringify(rows[0].options);
                rows[0].options = JSON.parse(optionsString || '[]');
                
                 if (!Array.isArray(rows[0].options)) {
                     console.warn(`[GameConfigModel] Parsed options for ${unit} is NOT an array, defaulting to empty. Parsed value:`, rows[0].options);
                     rows[0].options = [];
                 }
            } catch (e) {
                console.error(`[GameConfigModel] Error parsing DB options JSON for ${unit}:`, e, "Raw data:", rows[0].options);
                rows[0].options = [];
            }
             console.log(`[GameConfigModel] Returning parsed options for ${unit}:`, JSON.stringify(rows[0].options));
            return rows[0];
        }
        console.log(`[GameConfigModel] No config found in DB for ${unit}.`);
        return null;
    }

    static async saveConfig(unit, configData, imageFilenames = {}) {
        const { options: optionsArray, placard_orientation } = configData;
         console.log(`[GameConfigModel] Starting saveConfig for unit: ${unit}`);

        if (!Array.isArray(optionsArray)) {
             console.error("[GameConfigModel] optionsArray received in saveConfig is not an array!", optionsArray);
             throw new Error("Invalid options data provided to saveConfig.");
         }

        const finalOptions = optionsArray.map((option, index) => {
            if (option.type === 'image') {
                
                
                if (imageFilenames[index] !== undefined && imageFilenames[index] !== null) {
                     console.log(`[GameConfigModel] Index ${index}: Using NEW filename ${imageFilenames[index]}`);
                    return { ...option, value: imageFilenames[index] };
                } else {
                    
                     console.log(`[GameConfigModel] Index ${index}: Keeping EXISTING value ${option.value}`);
                     return option;
                }
            }
            return option;
        });

        const optionsJson = JSON.stringify(finalOptions);
         console.log(`[GameConfigModel] Final optionsJson to save for ${unit}: ${optionsJson}`);

        const sql = `
            INSERT INTO game_config (unit, options, placard_orientation)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                options = VALUES(options),
                placard_orientation = VALUES(placard_orientation)
        `;
        try {
            const [result] = await db.execute(sql, [unit, optionsJson, placard_orientation]);
             console.log(`[GameConfigModel] DB execute result for unit ${unit}:`, result);
        } catch(dbError) {
             console.error(`[GameConfigModel] Database error during save for unit ${unit}:`, dbError);
             throw dbError;
        }
    }

}

module.exports = GameConfigModel;