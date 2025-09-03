const SongModel = require('../models/songModel');
const ArtistModel = require('../models/artistModel');
const CategoryModel = require('../models/categoryModel');
const RecordLabelModel = require('../models/recordLabelModel');
const logService = require('../../services/logService');
const storageService = require('../../services/storageService');
const socketService = require('../../services/socketService');
const path = require('path');
const fs = require('fs');
const { convertToHls, ensureDir } = require('../../services/mediaPipeline');
const ffmpeg = require('fluent-ffmpeg');

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
        return 0;
    }
    const parts = durationStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) {
        return 0;
    }
    return (minutes * 60) + seconds;
};


class SongController {
    static async extractMetadata(request, response) {
        let tempFilePath = '';
        try {
            if (!request.file) {
                return response.status(400).json({ message: 'Nenhum arquivo de mídia foi enviado.' });
            }

            const file = request.file;
            const uploadsRoot = path.join(__dirname, '../../..', 'uploads');
            const tempDir = path.join(uploadsRoot, 'temp');
            ensureDir(tempDir);

            const tempFileName = `${Date.now()}_${file.originalname}`;
            tempFilePath = path.join(tempDir, tempFileName);
            fs.writeFileSync(tempFilePath, file.buffer);

            ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }

                if (err) {
                    console.error("Erro ao extrair metadados com ffprobe:", err);
                    return response.status(500).json({ message: 'Erro ao analisar o arquivo de mídia.' });
                }

                const format = metadata.format;
                const tags = format.tags || {};
                const durationInSeconds = Math.round(format.duration || 0);
                const minutes = Math.floor(durationInSeconds / 60);
                const seconds = durationInSeconds % 60;

                const extractedData = {
                    title: tags.title || '',
                    artist: tags.artist || '',
                    album: tags.album || '',
                    duration: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                };

                response.status(200).json(extractedData);
            });

        } catch (error) {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            console.error("ERRO AO EXTRAIR METADADOS:", error);
            response.status(500).json({ message: 'Erro interno ao processar o arquivo.', error: error.message });
        }
    }
    
    static async getAllSongs(request, response) {
        try {
            const { include_commercials, excludeBanned } = request.query;
            const options = {
                includeCommercials: include_commercials === 'true',
                excludeBanned: excludeBanned === 'true'
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
            
            let record_label_id = null;
            if (songData.label) {
                const label = await RecordLabelModel.findOrCreate(songData.label);
                record_label_id = label.id;
            }

            emitStatus('Salvando informações...');
            
            const dataToSave = {
                title: songData.title,
                artist_id: songData.artist_id,
                album: songData.album,
                release_year: songData.releaseYear,
                director: songData.director,
                record_label_id: record_label_id,
                duration_seconds: parseDurationToSeconds(songData.duration),
                filename: filename
            };
            
            const newSong = await SongModel.create(dataToSave);
            
            if (songData.tags && songData.tags.length > 0) {
                const categoryIds = await Promise.all(songData.tags.map(tagName => CategoryModel.findOrCreate(tagName).then(cat => cat.id)));
                await SongModel.manageCategories(newSong.id, categoryIds);
            }
            if (songData.featuringArtists && songData.featuringArtists.length > 0) {
                const artistIds = await Promise.all(songData.featuringArtists.map(artistName => ArtistModel.findOrCreate(artistName).then(art => art.id)));
                await SongModel.manageFeaturingArtists(newSong.id, artistIds);
            }
            
            if (songData.weekdays) await SongModel.manageWeekdays(newSong.id, songData.weekdays);

            await logService.logAction(request, 'SONG_CREATED', { songId: newSong.id, title: newSong.title });
            
            socketService.getIo().emit('songs:updated');

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

            let record_label_id = null;
            if (songData.label) {
                const label = await RecordLabelModel.findOrCreate(songData.label);
                record_label_id = label.id;
            }

            const dataToUpdate = {
                title: songData.title,
                artist_id: songData.artist_id,
                record_label_id: record_label_id,
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

            if (songData.tags) {
                const categoryIds = await Promise.all(songData.tags.map(tagName => CategoryModel.findOrCreate(tagName).then(cat => cat.id)));
                await SongModel.manageCategories(songId, categoryIds);
            }
            if (songData.featuringArtists) {
                const artistIds = await Promise.all(songData.featuringArtists.map(artistName => ArtistModel.findOrCreate(artistName).then(art => art.id)));
                await SongModel.manageFeaturingArtists(songId, artistIds);
            }
            if (songData.weekdays) await SongModel.manageWeekdays(songId, songData.weekdays);


            if (affectedRows > 0) {
                await logService.logAction(request, 'SONG_UPDATED', { songId: songId });
                socketService.getIo().emit('songs:updated');
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
            const songId = request.params.id;
            const song = await SongModel.findById(songId);

            if (!song) {
                return response.status(404).json({ message: 'Música não encontrada.' });
            }

            if (song.filename) {
                const directoryPrefix = path.dirname(song.filename);
                await storageService.deleteDirectory(directoryPrefix);
            }

            const affectedRows = await SongModel.delete(songId);
            if (affectedRows > 0) {
                await logService.logAction(request, 'SONG_DELETED', { songId: songId });
                socketService.getIo().emit('songs:updated');
                response.status(200).json({ message: 'Música e arquivos associados deletados com sucesso.' });
            } else {
                response.status(404).json({ message: 'Música não encontrada no banco de dados, mas a tentativa de limpeza de arquivos foi feita.' });
            }
        } catch (error) {
            console.error("ERRO AO DELETAR MÚSICA:", error);
            response.status(500).json({ message: 'Erro ao deletar música.', error: error.message });
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