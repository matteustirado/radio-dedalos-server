const db = require('../../config/database');

class ArtistModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM artists ORDER BY name ASC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM artists WHERE id = ?', [id]);
        return rows[0];
    }

    static async findOrCreate(name) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            let [rows] = await connection.execute('SELECT id FROM artists WHERE name = ?', [name]);
            let artistId;
            if (rows.length > 0) {
                artistId = rows[0].id;
            } else {
                const [result] = await connection.execute('INSERT INTO artists (name) VALUES (?)', [name]);
                artistId = result.insertId;
            }
            await connection.commit();
            return { id: artistId, name: name };
        } catch (error) {
            await connection.rollback();
            // Ignora erro de entrada duplicada que pode ocorrer em condições de concorrência
            if (error.code === 'ER_DUP_ENTRY') {
                let [rows] = await connection.execute('SELECT id FROM artists WHERE name = ?', [name]);
                return { id: rows[0].id, name: name };
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    static async create(artistData) {
        const {
            name
        } = artistData;
        const [result] = await db.execute('INSERT INTO artists (name) VALUES (?)', [name]);
        return {
            id: result.insertId,
            name
        };
    }

    static async update(id, artistData) {
        const {
            name
        } = artistData;
        const [result] = await db.execute('UPDATE artists SET name = ? WHERE id = ?', [name, id]);
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM artists WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = ArtistModel;