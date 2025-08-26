const db = require('../../config/database');

class CategoryModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
        return rows;
    }
    
    static async findOrCreate(name) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            let [rows] = await connection.execute('SELECT id FROM categories WHERE name = ?', [name]);
            let categoryId;
            if (rows.length > 0) {
                categoryId = rows[0].id;
            } else {
                const [result] = await connection.execute('INSERT INTO categories (name) VALUES (?)', [name]);
                categoryId = result.insertId;
            }
            await connection.commit();
            return { id: categoryId, name: name };
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                let [rows] = await connection.execute('SELECT id FROM categories WHERE name = ?', [name]);
                return { id: rows[0].id, name: name };
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    static async create(categoryData) {
        const {
            name
        } = categoryData;
        const [result] = await db.execute('INSERT INTO categories (name) VALUES (?)', [name]);
        return {
            id: result.insertId,
            name
        };
    }

    static async update(id, categoryData) {
        const {
            name
        } = categoryData;
        const [result] = await db.execute('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = CategoryModel;