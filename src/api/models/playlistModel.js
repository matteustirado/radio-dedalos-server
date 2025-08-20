const db = require('../../config/database');

class PlaylistModel {
    static async createOrUpdatePadrao(playlistData) {
        const {
            name,
            type,
            status,
            weekday
        } = playlistData;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute(
                "SELECT id FROM playlists WHERE type = 'padrao' AND weekday = ?",
                [weekday]
            );

            let playlistId;
            if (existing.length > 0) {
                playlistId = existing[0].id;
                await connection.execute(
                    "UPDATE playlists SET name = ?, status = ? WHERE id = ?",
                    [name, status || 'rascunho', playlistId]
                );
            } else {
                const [result] = await connection.execute(
                    "INSERT INTO playlists (name, type, status, weekday) VALUES (?, ?, ?, ?)",
                    [name, type, status || 'rascunho', weekday]
                );
                playlistId = result.insertId;
            }

            await connection.commit();

            const [rows] = await connection.execute('SELECT * FROM playlists WHERE id = ?', [playlistId]);
            return rows[0];

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async create(playlistData) {
        const {
            name,
            type,
            status
        } = playlistData;
        const sql = 'INSERT INTO playlists (name, type, status) VALUES (?, ?, ?)';
        const [result] = await db.execute(sql, [name, type, status || 'rascunho']);

        return this.findById(result.insertId);
    }

    static async findAll(status = null) {
        let sql = `
            SELECT
                p.*,
                COUNT(pi.song_id) AS song_count,
                COALESCE(SUM(s.duration_seconds), 0) AS total_duration
            FROM 
                playlists p
            LEFT JOIN 
                playlist_items pi ON p.id = pi.playlist_id
            LEFT JOIN 
                songs s ON pi.song_id = s.id
        `;
        const params = [];
        if (status) {
            sql += ' WHERE p.status = ?';
            params.push(status);
        }
        sql += ' GROUP BY p.id ORDER BY p.id DESC';

        const [playlists] = await db.execute(sql, params);
        return playlists;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM playlists WHERE id = ?', [id]);
        if (!rows[0]) return null;

        const playlist = rows[0];
        if (playlist.type === 'especial' || playlist.type === 'diaria') {
            const [dates] = await db.execute('SELECT play_date FROM playlist_dates WHERE playlist_id = ? ORDER BY play_date ASC', [id]);
            playlist.special_dates = dates.map(d => new Date(d.play_date));
        }

        const items = await this.getPlaylistItems(id);
        playlist.items = items;

        return playlist;
    }

    static async update(id, playlistData) {
        const {
            name,
            type,
            status,
            weekday
        } = playlistData;
        const sql = 'UPDATE playlists SET name = ?, type = ?, status = ?, weekday = ? WHERE id = ?';
        await db.execute(sql, [name, type, status, weekday || null, id]);

        return this.findById(id);
    }

    static async manageSpecialDates(playlistId, dates) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM playlist_dates WHERE playlist_id = ?', [playlistId]);
            if (dates && dates.length > 0) {
                const values = dates.map(date => [playlistId, new Date(date).toISOString().split('T')[0]]);
                await connection.query('INSERT INTO playlist_dates (playlist_id, play_date) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM playlists WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async getPlaylistItems(playlistId) {
        const sql = `
            SELECT pi.sequence_order, s.id as song_id, s.title, a.name as artist_name, s.duration_seconds
            FROM playlist_items pi
            JOIN songs s ON pi.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            WHERE pi.playlist_id = ?
            ORDER BY pi.sequence_order ASC
        `;
        const [rows] = await db.execute(sql, [playlistId]);
        return rows;
    }

    static async managePlaylistItems(playlistId, items) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM playlist_items WHERE playlist_id = ?', [playlistId]);
            if (items && items.length > 0) {
                const values = items.map(item => [playlistId, item.song_id, item.sequence_order]);
                await connection.query('INSERT INTO playlist_items (playlist_id, song_id, sequence_order) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = PlaylistModel;