const socketService = require('../../services/socketService');
const GameVoteModel = require('../models/gameVoteModel'); 

const gameVotes = {};

class GameController {

    static async registerVote(request, response) {
        try {
            const { unit } = request.params;
            const { pulseiraId, optionLabel } = request.body;

            if (!pulseiraId || !optionLabel || !unit) {
                return response.status(400).json({ message: 'Dados incompletos para registrar o voto (pulseiraId, optionLabel, unit).' });
            }

            
            if (!gameVotes[unit]) {
                gameVotes[unit] = {};
            }
            if (!gameVotes[unit][optionLabel]) {
                gameVotes[unit][optionLabel] = 0;
            }
            gameVotes[unit][optionLabel]++;

            console.log(`[GameController] Voto em memória para ${unit}: Opção='${optionLabel}', Pulseira='${pulseiraId}'. Contagem:`, gameVotes[unit]);

            
            try {
                await GameVoteModel.create({ unit, pulseiraId, optionLabel });
                console.log(`[GameController] Voto de ${pulseiraId} salvo no banco de dados.`);
            } catch (dbError) {
                console.error("[GameController] Falha ao salvar voto no banco de dados:", dbError);
                
            }

            
            const io = socketService.getIo();
            if (io) {
                io.emit('placardUpdate', { unit: unit, votes: gameVotes[unit] });
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

     static resetVotes(request, response) {
         try {
            const { unit } = request.params;
            if (unit && gameVotes[unit]) {
                gameVotes[unit] = {};
                console.log(`[GameController] Votos em memória resetados para unidade ${unit}.`);
                 const io = socketService.getIo();
                 if (io) {
                     io.emit('placardUpdate', { unit: unit, votes: gameVotes[unit] });
                 }
                response.status(200).json({ message: `Votos para ${unit} resetados.` });
            } else if (unit) {
                response.status(404).json({ message: `Nenhum voto em memória encontrado para a unidade ${unit}.` });
            }
             else {
                 Object.keys(gameVotes).forEach(key => {
                     gameVotes[key] = {};
                     const io = socketService.getIo();
                     if (io) {
                         io.emit('placardUpdate', { unit: key, votes: gameVotes[key] });
                     }
                 });
                 console.log(`[GameController] Todos os votos em memória foram resetados.`);
                 response.status(200).json({ message: 'Todos os votos em memória foram resetados.' });
            }
         } catch(error) {
             console.error("Erro ao resetar votos em memória:", error);
             response.status(500).json({ message: 'Erro interno ao resetar votos.' });
         }
     }
}

module.exports = GameController;