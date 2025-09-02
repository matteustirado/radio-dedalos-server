const cron = require('node-cron');
const PlaylistModel = require('../api/models/playlistModel');
const PriceModel = require('../api/models/priceModel');
const TwitterRepostModel = require('../api/models/twitterRepostModel');
const queueService = require('./queueService');
const socketService = require('./socketService');
const webRatingService = require('./webRatingService');

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
        const deletedHolidays = await PriceModel.cleanupPastHolidays();
        if (deletedHolidays > 0) {
            console.log(`[Scheduler] Limpeza concluída. ${deletedHolidays} feriado(s) passado(s) foram removidos.`);
        } else {
            console.log(`[Scheduler] Nenhuma data de feriado passada para limpar.`);
        }

        const deletedTweets = await TwitterRepostModel.deleteOldReposts();
        if (deletedTweets > 0) {
            console.log(`[Scheduler] Limpeza concluída. ${deletedTweets} repost(s) do Twitter expirado(s) foram removidos.`);
        } else {
            console.log(`[Scheduler] Nenhum repost do Twitter para expirar.`);
        }
    } catch (error) {
        console.error('[Scheduler] Erro durante as tarefas de limpeza:', error);
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
        console.log(`[Scheduler] Executando tarefas diárias de limpeza e atualização de reviews...`);
        cleanupTasks();
        webRatingService.updateAllReviews();
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });
    console.log('[Scheduler] Tarefas diárias (limpeza e atualização de reviews) agendadas para 05:00.');
};

module.exports = {
    initialize
};