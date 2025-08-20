const db = require('../../config/database');

class CategoryModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM categories');
        return rows;
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