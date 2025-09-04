require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise'); // Usando o mysql2/promise diretamente
const storageService = require('../src/services/storageService');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Lógica de conexão com o banco de dados adicionada diretamente aqui
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const reportPath = path.join(__dirname, 'correction_report.json');

async function getActualDuration(song) {
    if (!song.filename) {
        return Promise.resolve(null);
    }

    const fileUrl = storageService.getFileUrl(song.filename);

    return new Promise((resolve) => {
        ffmpeg.ffprobe(fileUrl, (err, metadata) => {
            if (err) {
                console.error(`ffprobe error for song ${song.id} (${fileUrl}): ${err.message}`);
                return resolve(null);
            }
            resolve(metadata.format.duration ? Math.round(metadata.format.duration) : 0);
        });
    });
}

async function auditSongs() {
    console.log('Iniciando auditoria de duração das músicas...');
    let connection;
    try {
        connection = await dbPool.getConnection();
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
            fs.writeFileSync(reportPath, JSON.stringify(correctionData, null, 2));
            console.log(`\nArquivo de correção 'correction_report.json' foi gerado na pasta 'scripts'.`);

        } else {
            console.log('Nenhuma discrepância encontrada. Todas as durações estão corretas!');
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a auditoria:', error);
    } finally {
        if (connection) connection.release();
        await dbPool.end(); 
        console.log('Auditoria finalizada.');
    }
}

auditSongs();