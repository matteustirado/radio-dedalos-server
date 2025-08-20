const UserModel = require('../models/userModel');

class UserController {

    static async createUser(request, response) {
        try {
            const newUser = await UserModel.create(request.body);
            response.status(201).json(newUser);
        } catch (error) {
            
            console.error("ERRO DETALHADO DO BANCO DE DADOS:", error); 

            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                response.status(409).json({ message: 'Nome de usuário já existe.' });
            } else {
                response.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
            }
        }
    }

    static async getAllUsers(request, response) {
        try {
            const users = await UserModel.findAll();
            response.status(200).json(users);
        } catch (error) {
            console.error("Erro em getAllUsers:", error);
            response.status(500).json({ message: 'Erro ao buscar usuários.' });
        }
    }

    static async updateUser(request, response) {
        try {
            const affectedRows = await UserModel.update(request.params.id, request.body);
            if (affectedRows > 0) {
                response.status(200).json({ message: 'Usuário atualizado com sucesso.' });
            } else {
                response.status(404).json({ message: 'Usuário não encontrado.' });
            }
        } catch (error) {
            console.error("Erro em updateUser:", error);
            response.status(500).json({ message: 'Erro ao atualizar usuário.' });
        }
    }

    static async deleteUser(request, response) {
        try {
            const affectedRows = await UserModel.delete(request.params.id);
            if (affectedRows > 0) {
                response.status(200).json({ message: 'Usuário deletado com sucesso.' });
            } else {
                response.status(404).json({ message: 'Usuário não encontrado.' });
            }
        } catch (error) {
            console.error("Erro em deleteUser:", error);
            response.status(500).json({ message: 'Erro ao deletar usuário.' });
        }
    }
}

module.exports = UserController;