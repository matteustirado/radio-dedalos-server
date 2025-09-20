const RollerModel = require('../models/rollerModel');

const LOCKER_CONFIG = {
    total: 210,
    micro: 60,
    small: 102,
    medium: 36,
    large: 12
};

const PRIZE_CARDS = 50;

class RollerController {
    static async startNewDraw(request, response) {
        try {
            const allLockers = [];
            for (let i = 1; i <= LOCKER_CONFIG.total; i++) {
                let size = '';
                if (i <= 60) size = 'MICRO';
                else if (i <= 162) size = 'PEQUENO';
                else if (i <= 198) size = 'MÉDIO';
                else size = 'GRANDE';
                allLockers.push({ locker_number: i, locker_size: size });
            }

            const shuffledLockers = allLockers.sort(() => 0.5 - Math.random());
            const drawnLockers = shuffledLockers.slice(0, PRIZE_CARDS);

            await RollerModel.createDraw(drawnLockers);
            const newDraw = await RollerModel.getLatestDraw();
            response.status(201).json(newDraw);
        } catch (error) {
            console.error("Erro ao iniciar novo sorteio:", error);
            response.status(500).json({ message: 'Erro ao iniciar novo sorteio.' });
        }
    }

    static async getCurrentDraw(request, response) {
        try {
            const draw = await RollerModel.getLatestDraw();
            response.status(200).json(draw);
        } catch (error) {
            console.error("Erro ao buscar sorteio atual:", error);
            response.status(500).json({ message: 'Erro ao buscar sorteio atual.' });
        }
    }

    static async updateLockerDetails(request, response) {
        try {
            const { id } = request.params;
            const { observation, redeemed } = request.body;
            const affectedRows = await RollerModel.updateLocker(id, observation, redeemed);
            if (affectedRows > 0) {
                response.status(200).json({ message: 'Armário atualizado com sucesso.' });
            } else {
                response.status(404).json({ message: 'Armário não encontrado.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar detalhes do armário:", error);
            response.status(500).json({ message: 'Erro ao atualizar detalhes do armário.' });
        }
    }

    static async clearCurrentDraw(request, response) {
        try {
            const historyId = await RollerModel.clearDraw();
            if (historyId) {
                response.status(200).json({ message: 'Sorteio limpo e salvo no histórico.', historyId });
            } else {
                response.status(200).json({ message: 'Nenhum sorteio para limpar.' });
            }
        } catch (error) {
            console.error("Erro ao limpar sorteio:", error);
            response.status(500).json({ message: 'Erro ao limpar sorteio.' });
        }
    }

    static async getDrawHistory(request, response) {
        try {
            const history = await RollerModel.getDrawHistory();
            response.status(200).json(history);
        } catch (error) {
            console.error("Erro ao buscar histórico de sorteios:", error);
            response.status(500).json({ message: 'Erro ao buscar histórico de sorteios.' });
        }
    }
}

module.exports = RollerController;