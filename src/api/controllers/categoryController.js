const CategoryModel = require('../models/categoryModel');

class CategoryController {
    static async getAllCategories(request, response) {
        try {
            const categories = await CategoryModel.findAll();
            response.status(200).json(categories);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao buscar categorias.'
            });
        }
    }

    static async createCategory(request, response) {
        try {
            const newCategory = await CategoryModel.create(request.body);
            response.status(201).json(newCategory);
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao criar categoria.'
            });
        }
    }

    static async updateCategory(request, response) {
        try {
            const affectedRows = await CategoryModel.update(request.params.id, request.body);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Categoria atualizada com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Categoria não encontrada.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao atualizar categoria.'
            });
        }
    }

    static async deleteCategory(request, response) {
        try {
            const affectedRows = await CategoryModel.delete(request.params.id);
            if (affectedRows > 0) {
                response.status(200).json({
                    message: 'Categoria deletada com sucesso.'
                });
            } else {
                response.status(404).json({
                    message: 'Categoria não encontrada.'
                });
            }
        } catch (error) {
            response.status(500).json({
                message: 'Erro ao deletar categoria.'
            });
        }
    }
}

module.exports = CategoryController;