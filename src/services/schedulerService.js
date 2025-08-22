const cron = require('node-cron');
const PlaylistModel = require('../api/models/playlistModel');
const queueService = require('./queueService');

const TIMEZONE = 'America/Sao_Paulo';

const getCurrentTimeInfo = () => {
    const now = new Date();
    const weekday = now.toLocaleString('en-US', { weekday: 'long', timeZone: TIMEZONE }).toLowerCase();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TIMEZONE, hour12: false });
    const date = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE })).toISOString().split('T')[0];
    const hour = parseInt(time.substring(0, 2), 10);
    return { now, weekday, time, date, hour };
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
        
        if (currentQueueState.lastManualActionTimestamp && currentQueueState.lastManualActionTimestamp > scheduledStartTime) {
            console.log(`[Scheduler] DJ assumiu o controle. Agendamento para "${specificPlaylist.name}" ignorado.`);
            return;
        }

        if (currentQueueState.playlistId === specificPlaylist.id && currentQueueState.source === 'scheduler') {
            return;
        }
        
        console.log(`[Scheduler] Iniciando playlist agendada: "${specificPlaylist.name}"`);
        await queueService.activatePlaylist(specificPlaylist.id, 'scheduler');
        return;
    }
    
    if (!queueService.isPlaying()) {
        if (fallbackPlaylist) {
            if (currentQueueState.playlistId === fallbackPlaylist.id) {
                return;
            }
            console.log(`[Scheduler] Preenchendo o silêncio com a playlist padrão: "${fallbackPlaylist.name}"`);
            await queueService.activatePlaylist(fallbackPlaylist.id, 'scheduler');
        }
    }
};

const initialize = () => {
    cron.schedule('* * * * *', () => {
        console.log(`[Scheduler] Verificando agendamento... [${new Date().toLocaleString()}]`);
        checkSchedule().catch(error => {
            console.error('[Scheduler] Erro durante a verificação:', error);
        });
    });
    console.log('[Scheduler] O DJ Robô foi ativado e está verificando a programação a cada minuto.');
};

module.exports = {
    initialize
};