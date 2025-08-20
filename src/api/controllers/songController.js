const SongModel = require('../models/songModel');
const logService = require('../../services/logService');
const storageService = require('../../services/storageService');
const socketService = require('../../services/socketService');
const path = require('path');
const fs = require('fs');
const { convertToHls, ensureDir } = require('../../services/mediaPipeline');

const formatFilenameForStorage = (originalFilename) => {
    if (!originalFilename) return null;
    const timestamp = Date.now();
    const extension = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, extension);
    const sanitizedBaseName = baseName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '');
    return `${timestamp}_${sanitizedBaseName}`;
};

const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.m3u8') return 'application/vnd.apple.mpegurl';
    if (ext === '.ts') return 'video/mp2t';
    return 'application/octet-stream';
};

const parseDurationToSeconds = (durationStr) => {
    if (!durationStr || typeof durationStr !== 'string' || !durationStr.includes(':')) {
        return null;
    }
    const parts = durationStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) {
        return null;
    }
    return (minutes * 60) + seconds;
};


class SongController {
    static async getAllSongs(request, response) {
        try {
            const { include_commercials } = request.query;
            const options = {
                includeCommercials: include_commercials === 'true'
            };
            const songs = await SongModel.findAll(options);
            response.status(200).json(songs);
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar músicas.' });
        }
    }

    static async getSongById(request, response) {
        try {
            const song = await SongModel.findById(request.params.id);
            if (song) {
                response.status(200).json(song);
            } else {
                response.status(404).json({ message: 'Música não encontrada.' });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao buscar música.' });
        }
    }

    static async createSong(request, response) {
        let originalTempPath = '';
        let hlsOutputDir = '';
        const { jobId } = request.body;

        const emitStatus = (status) => {
            if (jobId) {
                socketService.getIo().emit(jobId, { status });
            }
        };

        try {
            if (!request.file) {
                return response.status(400).json({ message: 'Nenhum arquivo de mídia foi enviado.' });
            }

            const songData = request.body;
            const file = request.file;

            if (songData.weekdays && typeof songData.weekdays === 'string') songData.weekdays = JSON.parse(songData.weekdays);
            if (songData.tags && typeof songData.tags === 'string') songData.tags = JSON.parse(songData.tags);
            if (songData.featuringArtists && typeof songData.featuringArtists === 'string') songData.featuringArtists = JSON.parse(songData.featuringArtists);

            const uploadsRoot = path.join(__dirname, '../../..', 'uploads');
            const originalsDir = path.join(uploadsRoot, 'originals');
            ensureDir(originalsDir);

            const baseName = formatFilenameForStorage(file.originalname);
            const originalExtension = path.extname(file.originalname);
            originalTempPath = path.join(originalsDir, `${baseName}${originalExtension}`);
            fs.writeFileSync(originalTempPath, file.buffer);

            emitStatus('Convertendo vídeo...');
            const convertedDir = path.join(uploadsRoot, 'converted');
            hlsOutputDir = path.join(convertedDir, baseName);
            await convertToHls(originalTempPath, hlsOutputDir);

            emitStatus('Enviando para o armazenamento...');
            const hlsFiles = fs.readdirSync(hlsOutputDir);
            for (const fileName of hlsFiles) {
                const filePath = path.join(hlsOutputDir, fileName);
                const fileBuffer = fs.readFileSync(filePath);
                await storageService.uploadFile({
                    fileBuffer: fileBuffer,
                    fileName: `${baseName}/${fileName}`,
                    mimeType: getMimeType(fileName),
                });
            }

            const filename = `${baseName}/playlist.m3u8`;

            emitStatus('Salvando informações...');
            
            const dataToSave = {
                title: songData.title,
                artist_id: songData.artist_id,
                album: songData.album,
                release_year: songData.releaseYear,
                director: songData.director,
                record_label_id: songData.label_id || null,
                duration_seconds: parseDurationToSeconds(songData.duration),
                filename: filename
            };
            
            const newSong = await SongModel.create(dataToSave);
            
            if (songData.weekdays) await SongModel.manageWeekdays(newSong.id, songData.weekdays);
            if (songData.tags) await SongModel.manageCategories(newSong.id, songData.tags);
            if (songData.featuringArtists) await SongModel.manageFeaturingArtists(newSong.id, songData.featuringArtists);

            await logService.logAction(request, 'SONG_CREATED', { songId: newSong.id, title: newSong.title });
            response.status(201).json(newSong);

        } catch (error) {
            console.error("ERRO DETALHADO AO CRIAR MÚSICA:", error);
            emitStatus(`Erro: ${error.message}`);
            response.status(500).json({ message: 'Erro ao criar música.', error: error.message });
        } finally {
            if (originalTempPath && fs.existsSync(originalTempPath)) {
                fs.unlinkSync(originalTempPath);
            }
            if (hlsOutputDir && fs.existsSync(hlsOutputDir)) {
                fs.rmSync(hlsOutputDir, { recursive: true, force: true });
            }
        }
    }

    static async updateSong(request, response) {
        let originalTempPath = '';
        let hlsOutputDir = '';
        const { jobId } = request.body;

        const emitStatus = (status) => {
            if (jobId) {
                socketService.getIo().emit(jobId, { status });
            }
        };

        try {
            const songId = request.params.id;
            const songData = request.body;
            const file = request.file;

            if (songData.weekdays && typeof songData.weekdays === 'string') songData.weekdays = JSON.parse(songData.weekdays);
            if (songData.tags && typeof songData.tags === 'string') songData.tags = JSON.parse(songData.tags);
            if (songData.featuringArtists && typeof songData.featuringArtists === 'string') songData.featuringArtists = JSON.parse(songData.featuringArtists);

            const dataToUpdate = {
                title: songData.title,
                artist_id: songData.artist_id,
                record_label_id: songData.label_id || null,
                album: songData.album,
                release_year: songData.releaseYear,
                director: songData.director,
                duration_seconds: parseDurationToSeconds(songData.duration),
            };

            if (file) {
                const uploadsRoot = path.join(__dirname, '../../..', 'uploads');
                const originalsDir = path.join(uploadsRoot, 'originals');
                ensureDir(originalsDir);

                const baseName = formatFilenameForStorage(file.originalname);
                const originalExtension = path.extname(file.originalname);
                originalTempPath = path.join(originalsDir, `${baseName}${originalExtension}`);
                fs.writeFileSync(originalTempPath, file.buffer);

                emitStatus('Convertendo vídeo...');
                const convertedDir = path.join(uploadsRoot, 'converted');
                hlsOutputDir = path.join(convertedDir, baseName);
                await convertToHls(originalTempPath, hlsOutputDir);

                emitStatus('Enviando para o armazenamento...');
                const hlsFiles = fs.readdirSync(hlsOutputDir);
                for (const fileName of hlsFiles) {
                    const filePath = path.join(hlsOutputDir, fileName);
                    const fileBuffer = fs.readFileSync(filePath);
                    await storageService.uploadFile({
                        fileBuffer: fileBuffer,
                        fileName: `${baseName}/${fileName}`,
                        mimeType: getMimeType(fileName),
                    });
                }
                dataToUpdate.filename = `${baseName}/playlist.m3u8`;
            }

            emitStatus('Atualizando informações...');
            const affectedRows = await SongModel.update(songId, dataToUpdate);

            if (songData.weekdays) await SongModel.manageWeekdays(songId, songData.weekdays);
            if (songData.tags) await SongModel.manageCategories(songId, songData.tags);
            if (songData.featuringArtists) await SongModel.manageFeaturingArtists(songId, songData.featuringArtists);


            if (affectedRows > 0) {
                await logService.logAction(request, 'SONG_UPDATED', { songId: songId });
                response.status(200).json({ message: 'Música atualizada com sucesso.' });
            } else {
                response.status(404).json({ message: 'Música não encontrada.' });
            }
        } catch (error) {
            console.error("ERRO DETALHADO AO ATUALIZAR MÚSICA:", error);
            emitStatus(`Erro: ${error.message}`);
            response.status(500).json({ message: 'Erro ao atualizar música.', error: error.message });
        } finally {
            if (originalTempPath && fs.existsSync(originalTempPath)) {
                fs.unlinkSync(originalTempPath);
            }
            if (hlsOutputDir && fs.existsSync(hlsOutputDir)) {
                fs.rmSync(hlsOutputDir, { recursive: true, force: true });
            }
        }
    }

    static async deleteSong(request, response) {
        try {
            const affectedRows = await SongModel.delete(request.params.id);
            if (affectedRows > 0) {
                await logService.logAction(request, 'SONG_DELETED', { songId: request.params.id });
                response.status(200).json({ message: 'Música deletada com sucesso.' });
            } else {
                response.status(404).json({ message: 'Música não encontrada.' });
            }
        } catch (error) {
            response.status(500).json({ message: 'Erro ao deletar música.' });
        }
    }

    static async manageSongCategories(request, response) {
        const { id } = request.params;
        const { categoryIds } = request.body;
        try {
            await SongModel.manageCategories(id, categoryIds);
            response.status(200).json({ message: 'Categorias da música atualizadas com sucesso.' });
        } catch (error) {
            response.status(500).json({ message: 'Erro ao gerenciar categorias da música.', error: error.message });
        }
    }

    static async manageSongWeekdays(request, response) {
        const { id } = request.params;
        const { weekdays } = request.body;
        try {
            await SongModel.manageWeekdays(id, weekdays);
            response.status(200).json({ message: 'Dias da semana da música atualizados com sucesso.' });
        } catch (error) {
            console.error("ERRO AO GERENCIAR WEEKDAYS:", error);
            response.status(500).json({ message: 'Erro ao gerenciar dias da semana da música.' });
        }
    }

    static async manageSongFeaturing(request, response) {
        const { id } = request.params;
        const { artistIds } = request.body;
        try {
            await SongModel.manageFeaturingArtists(id, artistIds);
            response.status(200).json({ message: 'Artistas participantes da música atualizados com sucesso.' });
        } catch (error) {
            response.status(500).json({ message: 'Erro ao gerenciar artistas participantes.', error: error.message });
        }
    }
}

module.exports = SongController;
