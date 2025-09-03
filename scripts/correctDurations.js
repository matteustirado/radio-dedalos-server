require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'correction_report.json');

async function correctDurations() {
    console.log('Iniciando script de correção de duração das músicas...');

    if (!fs.existsSync(reportPath)) {
        console.error('ERRO: O arquivo "correction_report.json" não foi encontrado. Execute o script de auditoria primeiro.');
        return;
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    if (!reportData || reportData.length === 0) {
        console.log('Nenhuma música para corrigir no relatório.');
        return;
    }

    console.log(`Encontradas ${reportData.length} músicas para corrigir.`);
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        let updatedCount = 0;

        for (const song of reportData) {
            console.log(`Atualizando ID ${song.id}: Duração para ${song.actual_duration}s`);
            const [result] = await connection.execute(
                'UPDATE songs SET duration_seconds = ? WHERE id = ?',
                [song.actual_duration, song.id]
            );
            if (result.affectedRows > 0) {
                updatedCount++;
            }
        }

        await connection.commit();
        console.log(`\n--- Correção Finalizada ---`);
        console.log(`${updatedCount} de ${reportData.length} registros de músicas foram atualizados com sucesso.`);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Ocorreu um erro durante a atualização do banco de dados:', error);
    } finally {
        if (connection) connection.release();
    }
}

correctDurations();