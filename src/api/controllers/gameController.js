const socketService = require('../../services/socketService');

class GameController {
    static triggerVoteScreen(request, response) {
        try {
            const io = socketService.getIo();
            if (io) {
                console.log('[GameController] Manually triggering vote screen.');
                io.emit('triggerVote', { source: 'manual' });
                response.status(200).json({ message: 'Gatilho de votação acionado com sucesso.' });
            } else {
                response.status(500).json({ message: 'Socket.IO não inicializado.' });
            }
        } catch (error) {
            console.error("Erro ao acionar o gatilho de votação:", error);
            response.status(500).json({ message: 'Erro interno ao acionar o gatilho.' });
        }
    }

    static simulatePlacard(request, response) {
        try {
            const io = socketService.getIo();
            if (io) {
                const { votes, capacity } = request.body;
                console.log('[GameController] Emitting simulated placard data:', { votes, capacity });
                io.emit('placardUpdate', votes);
                io.emit('capacityUpdate', { currentCapacity: parseInt(capacity, 10) });
                response.status(200).json({ message: 'Dados do placar simulados com sucesso.' });
            } else {
                response.status(500).json({ message: 'Socket.IO não inicializado.' });
            }
        } catch (error) {
            console.error("Erro ao simular dados do placar:", error);
            response.status(500).json({ message: 'Erro interno ao simular dados.' });
        }
    }
}

module.exports = GameController;