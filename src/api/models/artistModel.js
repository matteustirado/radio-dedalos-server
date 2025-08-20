const db = require('../../config/database');

class ArtistModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM artists');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM artists WHERE id = ?', [id]);
        return rows[0];
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