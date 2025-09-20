const db = require('../../config/database');

class RollerModel {
    static async createDraw(drawData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute('DELETE FROM roller_current_draw');

            const sql = 'INSERT INTO roller_current_draw (locker_number, locker_size, observation, redeemed) VALUES ?';
            const values = drawData.map(locker => [locker.locker_number, locker.locker_size, '', false]);

            if (values.length > 0) {
                await connection.query(sql, [values]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getLatestDraw() {
        const [rows] = await db.execute('SELECT * FROM roller_current_draw ORDER BY locker_number ASC');
        return rows;
    }

    static async updateLocker(id, observation, redeemed) {
        const sql = 'UPDATE roller_current_draw SET observation = ?, redeemed = ? WHERE id = ?';
        const [result] = await db.execute(sql, [observation, redeemed, id]);
        return result.affectedRows;
    }

    static async clearDraw() {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [draw] = await connection.execute('SELECT * FROM roller_current_draw');

            if (draw.length > 0) {
                const drawDate = new Date();
                const [historyResult] = await connection.execute('INSERT INTO roller_draw_history (draw_date, drawn_lockers) VALUES (?, ?)', [drawDate, JSON.stringify(draw)]);
                const historyId = historyResult.insertId;

                await connection.execute('DELETE FROM roller_current_draw');

                await connection.commit();
                return historyId;
            }

            await connection.commit();
            return null;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getDrawHistory() {
        const [rows] = await db.execute('SELECT * FROM roller_draw_history ORDER BY draw_date DESC');
        return rows;
    }
}

module.exports = RollerModel;