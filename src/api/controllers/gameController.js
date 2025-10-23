const socketService = require('../../services/socketService');
const GameVoteModel = require('../models/gameVoteModel'); 

class GameController {

    static async registerVote(request, response) {
        try {
            const { unit } = request.params;
            const { pulseiraId, optionLabel } = request.body;

            if (!pulseiraId || !optionLabel || !unit) {
                return response.status(400).json({ message: 'Dados incompletos para registrar o voto (pulseiraId, optionLabel, unit).' });
            }

            // 1. Salva o novo voto no banco de dados
            try {
                await GameVoteModel.create({ unit, pulseiraId, optionLabel });
                console.log(`[GameController] Voto de ${pulseiraId} salvo no banco de dados.`);
            } catch (dbError) {
                console.error("[GameController] Falha ao salvar voto no banco de dados:", dbError);
            }

            // 2. Busca a contagem TOTAL de votos (persistente) no banco de dados
            const updatedVoteCounts = await GameVoteModel.getVoteCounts(unit);
            console.log(`[GameController] Contagem atualizada do banco para ${unit}:`, updatedVoteCounts);

            // 3. Emite o evento Socket.IO com a contagem persistente
            const io = socketService.getIo();
            if (io) {
                io.emit('placardUpdate', { unit: unit, votes: updatedVoteCounts });
                console.log(`[GameController] Evento 'placardUpdate' emitido para unidade ${unit}.`);
            } else {
                console.warn('[GameController] Socket.IO não inicializado. Não foi possível emitir atualização do placar.');
            }

            response.status(200).json({ message: 'Voto registrado com sucesso.' });

        } catch (error) {
            console.error("Erro ao registrar voto:", error);
            response.status(500).json({ message: 'Erro interno ao registrar voto.' });
        }
    }

     static async resetVotes(request, response) {
         try {
            const { unit } = request.params;
            
            // Limpa os votos no banco de dados
            await GameVoteModel.clearVotes(unit);
            console.log(`[GameController] Votos no banco de dados resetados para unidade ${unit}.`);
             
            // Emite um objeto de votos vazio para zerar o placar no cliente
            const io = socketService.getIo();
            if (io) {
                io.emit('placardUpdate', { unit: unit, votes: {} }); 
            }
             
             console.log(`[GameController] Sinal de reset emitido para unidade ${unit}.`);
             response.status(200).json({ message: `Votos para ${unit} resetados com sucesso.` });
             
         } catch(error) {
             console.error("Erro ao resetar votos:", error);
             response.status(500).json({ message: 'Erro interno ao resetar votos.' });
         }
     }
}

module.exports = GameController;