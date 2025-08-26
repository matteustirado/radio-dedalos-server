const db = require('../../config/database');

class RecordLabelModel {
    static async findOrCreate(name) {
        if (!name || name.trim() === '') {
            return null;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            let [rows] = await connection.execute('SELECT id FROM record_labels WHERE name = ?', [name]);
            let labelId;

            if (rows.length > 0) {
                labelId = rows[0].id;
            } else {
                const [result] = await connection.execute('INSERT INTO record_labels (name) VALUES (?)', [name]);
                labelId = result.insertId;
            }
            
            await connection.commit();
            return { id: labelId, name: name };
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                let [rows] = await connection.execute('SELECT id FROM record_labels WHERE name = ?', [name]);
                return { id: rows[0].id, name: name };
            }
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = RecordLabelModel;