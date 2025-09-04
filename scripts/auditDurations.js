require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/database');
const storageService = require('../src/services/storageService');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp_audio');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

async function getActualDuration(song) {
    if (!song.filename) {
        return Promise.resolve(null);
    }

    const fileUrl = storageService.getFileUrl(song.filename);
    const tempFilePath = path.join(TEMP_DIR, `${song.id}_${path.basename(song.filename)}`);
    
    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
                fs.unlinkSync(tempFilePath); 
                if (err) {
                    return reject(new Error(`ffprobe error for song ${song.id}: ${err.message}`));
                }
                resolve(metadata.format.duration ? Math.round(metadata.format.duration) : 0);
            });
        });
    } catch (error) {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        console.error(`Erro ao processar a música ID ${song.id}: ${error.message}`);
        return null; 
    }
}

async function auditSongs() {
    console.log('Iniciando auditoria de duração das músicas...');
    let connection;
    try {
        connection = await db.getConnection();
        const [songs] = await connection.execute('SELECT id, title, filename, duration_seconds FROM songs');
        console.log(`Encontradas ${songs.length} músicas para auditar.`);

        const discrepancies = [];

        for (const song of songs) {
            console.log(`Analisando: ID ${song.id} - ${song.title}`);
            const actualDuration = await getActualDuration(song);
            
            if (actualDuration === null) {
                console.log(` -> Não foi possível obter a duração real.`);
                continue;
            }

            const dbDuration = song.duration_seconds;

            if (Math.abs(actualDuration - dbDuration) > 2) { // Tolerância de 2 segundos
                discrepancies.push({
                    id: song.id,
                    title: song.title,
                    db_duration: dbDuration,
                    actual_duration: actualDuration,
                    difference: Math.abs(actualDuration - dbDuration)
                });
                console.log(` -> DISCREPÂNCIA ENCONTRADA! DB: ${dbDuration}s, Real: ${actualDuration}s`);
            } else {
                 console.log(` -> Duração OK. DB: ${dbDuration}s, Real: ${actualDuration}s`);
            }
        }

        console.log('\n--- Relatório Final da Auditoria ---');
        if (discrepancies.length > 0) {
            console.log(`${discrepancies.length} músicas com duração incorreta encontradas:`);
            console.table(discrepancies);
            
            const correctionData = discrepancies.map(d => ({ id: d.id, actual_duration: d.actual_duration }));
            const reportPath = path.join(__dirname, 'correction_report.json');
            fs.writeFileSync(reportPath, JSON.stringify(correctionData, null, 2));
            console.log(`\nArquivo de correção 'correction_report.json' foi gerado na pasta 'scripts'.`);

        } else {
            console.log('Nenhuma discrepância encontrada. Todas as durações estão corretas!');
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a auditoria:', error);
    } finally {
        if (connection) connection.release();
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        }
        console.log('Auditoria finalizada.');
    }
}

auditSongs();