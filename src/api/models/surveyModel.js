const db = require('../../config/database');

class SurveyModel {
    static async create(surveyData) {
        const {
            wristband_code,
            unit,
            satisfaction_cleanliness,
            satisfaction_service,
            satisfaction_labyrinth,
            is_organized,
            is_staff_helpful,
            has_all_drinks,
            final_comment
        } = surveyData;

        const sql = `INSERT INTO survey_responses 
            (wristband_code, unit, satisfaction_cleanliness, satisfaction_service, satisfaction_labyrinth, is_organized, is_staff_helpful, has_all_drinks, final_comment) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.execute(sql, [
            wristband_code, unit, satisfaction_cleanliness, satisfaction_service, satisfaction_labyrinth, is_organized, is_staff_helpful, has_all_drinks, final_comment
        ]);
        
        return { id: result.insertId, ...surveyData };
    }
}

module.exports = SurveyModel;