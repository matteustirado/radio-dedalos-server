const cron = require('node-cron');
const PlaylistModel = require('../api/models/playlistModel');
const PriceModel = require('../api/models/priceModel');
const queueService = require('./queueService');
const socketService = require('./socketService');

const TIMEZONE = 'America/Sao_Paulo';

const getCurrentTimeInfo = () => {
    const now = new Date();
    const nowInSaoPaulo = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    
    const weekday = nowInSaoPaulo.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const time = nowInSaoPaulo.toTimeString().split(' ')[0];
    const date = nowInSaoPaulo.toISOString().split('T')[0];
    const hour = nowInSaoPaulo.getHours();

    return { now: nowInSaoPaulo, weekday, time, date, hour };
};

const checkSchedule = async () => {
    const { now, weekday, time, date, hour } = getCurrentTimeInfo();

    const isOperatingHours = hour >= 16 || hour < 6;
    if (!isOperatingHours) {
        return;
    }
    
    const { specificPlaylist, fallbackPlaylist } = await PlaylistModel.findPlaylistsForScheduler(weekday, date, time);
    const currentQueueState = queueService.getQueueState();
    
    if (specificPlaylist) {
        const scheduledStartTime = new Date(`${specificPlaylist.scheduled_date || date}T${specificPlaylist.scheduled_time}`);
        
        if (currentQueueState.lastManualActionTimestamp && currentQueueState.lastManualActionTimestamp > scheduledStartTime.getTime()) {
            console.log(`[Scheduler] DJ assumiu o controle. Agendamento para "${specificPlaylist.name}" ignorado.`);
            return;
        }

        if (currentQueueState.playlistId === specificPlaylist.id && currentQueueState.source === 'scheduler') {
            return;
        }
        
        console.log(`[Scheduler] Iniciando playlist agendada: "${specificPlaylist.name}"`);
        await queueService.activatePlaylist(specificPlaylist.id, 'scheduler');
        await socketService.playNextSong();
        return;
    }
    
    if (!queueService.isPlaying()) {
        if (fallbackPlaylist) {
            if (currentQueueState.playlistId === fallbackPlaylist.id) {
                return;
            }
            console.log(`[Scheduler] Preenchendo o silêncio com a playlist padrão: "${fallbackPlaylist.name}"`);
            await queueService.activatePlaylist(fallbackPlaylist.id, 'scheduler');
            await socketService.playNextSong();
        }
    }
};

const cleanupTasks = async () => {
    try {
        const deletedRows = await PriceModel.cleanupPastHolidays();
        if (deletedRows > 0) {
            console.log(`[Scheduler] Limpeza concluída. ${deletedRows} feriado(s) passado(s) foram removidos.`);
        } else {
            console.log(`[Scheduler] Nenhuma data de feriado passada para limpar.`);
        }
    } catch (error) {
        console.error('[Scheduler] Erro durante a limpeza de feriados:', error);
    }
};

const initialize = () => {
    cron.schedule('* * * * *', () => {
        const nowInSaoPaulo = new Date().toLocaleString('pt-BR', { timeZone: TIMEZONE });
        console.log(`[Scheduler] Verificando agendamento... [${nowInSaoPaulo}]`);
        checkSchedule().catch(error => {
            console.error('[Scheduler] Erro durante a verificação:', error);
        });
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });
    console.log(`[Scheduler] O DJ Robô foi ativado e está verificando a programação a cada minuto no fuso horário: ${TIMEZONE}.`);
    
    cron.schedule('0 5 * * *', () => {
        console.log(`[Scheduler] Executando tarefas de limpeza diária...`);
        cleanupTasks();
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });
    console.log('[Scheduler] Tarefa de limpeza de feriados agendada para executar diariamente às 05:00.');
};

module.exports = {
    initialize
};