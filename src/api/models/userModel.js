const db = require('../../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT id, username, role, description, filial FROM users');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT id, username, role, description, filial FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async findByUsername(username) {
        const [rows] = await db.execute('SELECT * FROM `users` WHERE `username` = ?', [username]);
        return rows[0];
    }

    static async create(userData) {
        const { username, password, role, description, filial } = userData;
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO users (username, password_hash, role, description, filial) VALUES (?, ?, ?, ?, ?)';
        
        const [result] = await db.execute(sql, [username, password_hash, role, description, filial || null]);
        return { id: result.insertId, username, role, description, filial };
    }

    static async update(id, userData) {
        const { username, role, description, password, filial } = userData;
        
        if (password && password.trim() !== '') {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            const sql = 'UPDATE users SET username = ?, role = ?, description = ?, password_hash = ?, filial = ? WHERE id = ?';
            const [result] = await db.execute(sql, [username, role, description, password_hash, filial || null, id]);
            return result.affectedRows;
        } else {
            const sql = 'UPDATE users SET username = ?, role = ?, description = ?, filial = ? WHERE id = ?';
            const [result] = await db.execute(sql, [username, role, description, filial || null, id]);
            return result.affectedRows;
        }
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = UserModel;