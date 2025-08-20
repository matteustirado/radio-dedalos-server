const db = require('../../config/database');

class ReportModel {
    static async create(reportData) {
        const {
            category,
            description
        } = reportData;
        const sql = 'INSERT INTO problem_reports (category, description) VALUES (?, ?)';
        const [result] = await db.execute(sql, [category, description]);
        return {
            id: result.insertId,
            ...reportData
        };
    }

    static async findAll() {
        const sql = `
            SELECT * FROM problem_reports
            ORDER BY
                CASE
                    WHEN status = 'pendente' THEN 1
                    WHEN status = 'em_analise' THEN 2
                    WHEN status = 'resolvido' THEN 3
                    ELSE 4
                END ASC,
                reported_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    static async updateStatus(id, status) {
        const sql = 'UPDATE problem_reports SET status = ? WHERE id = ?';
        const [result] = await db.execute(sql, [status, id]);
        return result.affectedRows;
    }
}

module.exports = ReportModel;