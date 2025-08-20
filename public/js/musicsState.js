const musicsState = (() => {
    const state = {
        songs: [],
        artists: [],
        categories: [],
        labels: [],
        suggestions: [],
        bans: [],
        commercials: []
    };

    const findOrCreateArtist = async (name) => {
        let artist = state.artists.find(a => a.name.toLowerCase() === name.toLowerCase());
        if (!artist) {
            artist = await apiFetch('/artists', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            await fetchArtists();
        }
        return artist;
    };

    const fetchArtists = async () => {
        const artistsData = await apiFetch('/artists');
        if (Array.isArray(artistsData)) {
            artistsData.sort((a, b) => a.name.localeCompare(b.name));
            state.artists = artistsData;
        } else {
            state.artists = [];
        }
    };

    const fetchCategories = async () => {
        const categoriesData = await apiFetch('/categories');
        if (Array.isArray(categoriesData)) {
            categoriesData.sort((a, b) => a.name.localeCompare(b.name));
            state.categories = categoriesData;
        } else {
            state.categories = [];
        }
    };

    const fetchSongs = async () => {
        const songsData = await apiFetch('/songs');
        if (Array.isArray(songsData)) {
            songsData.sort((a, b) => a.title.localeCompare(b.title));
            state.songs = songsData;
        } else {
            state.songs = [];
        }
        const uniqueLabels = [...new Set(state.songs.map(song => song.label).filter(Boolean))];
        state.labels = uniqueLabels.map(name => ({
            name
        }));
    };

    const fetchCommercials = async () => {
        const commercialsData = await apiFetch('/commercials');
        if (Array.isArray(commercialsData)) {
            commercialsData.sort((a, b) => a.title.localeCompare(b.title));
            state.commercials = commercialsData;
        } else {
            state.commercials = [];
        }
    };

    const initialize = async () => {
        await Promise.all([
            fetchArtists(),
            fetchCategories(),
            fetchSongs(),
            fetchCommercials()
        ]);
    };

    const getAlbumsByArtist = (artistName) => {
        const artist = state.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
        if (!artist) return [];
        const artistAlbums = state.songs
            .filter(song => song.artist_id === artist.id && song.album)
            .map(song => song.album);
        return [...new Set(artistAlbums)];
    };

    const getUniqueAlbums = () => {
        const artistMap = new Map(state.artists.map(a => [a.id, a.name]));
        const albums = {};
        state.songs.forEach(song => {
            if (song.album) {
                if (!albums[song.album]) {
                    albums[song.album] = {
                        title: song.album,
                        artist_name: artistMap.get(song.artist_id) || 'Vários Artistas'
                    };
                }
            }
        });
        const albumList = Object.values(albums);
        albumList.sort((a, b) => a.title.localeCompare(b.title));
        return albumList;
    };

    const _uploadWithProgress = (method, url, formData, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress({
                        stage: 'upload',
                        percent: percentComplete
                    });
                }
            };

            xhr.onload = () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                } catch (e) {
                    reject({ message: 'Resposta inválida do servidor.' });
                }
            };

            xhr.onerror = () => {
                reject({
                    message: 'Erro de rede durante o upload.'
                });
            };

            xhr.send(formData);
        });
    };

    const addSong = async (songDetails, onProgress) => {
        const jobId = 'upload-' + Date.now();
        const socket = io();

        const socketListener = (data) => {
            if (data.status) {
                onProgress({ stage: 'backend', status: data.status });
            }
        };
        socket.on(jobId, socketListener);

        try {
            const { title, artistName, featuringArtists, album, releaseYear, director, label, tags, weekdays, duration, mediaFile } = songDetails;
            
            const artist = await findOrCreateArtist(artistName);

            const formData = new FormData();
            formData.append('jobId', jobId);
            formData.append('title', title);
            formData.append('artist_id', artist.id);
            if (mediaFile) formData.append('mediaFile', mediaFile);
            formData.append('album', album || '');
            formData.append('releaseYear', releaseYear || '');
            formData.append('director', director || '');
            formData.append('label', label || '');
            formData.append('duration', duration || '');
            
            const newSong = await _uploadWithProgress('POST', '/api/songs', formData, onProgress);
            
            if (weekdays && weekdays.length > 0) {
                await apiFetch(`/songs/${newSong.id}/weekdays`, {
                    method: 'POST',
                    body: JSON.stringify({ weekdays })
                });
            }

            await fetchSongs();
            if (artistName.toLowerCase() === 'comercial') {
                await fetchCommercials();
            }
            socket.off(jobId, socketListener);
            return newSong;
        } catch (error) {
            socket.off(jobId, socketListener);
            throw error;
        }
    };

    const updateSong = async (id, songDetails, onProgress) => {
        const jobId = 'upload-' + Date.now();
        const socket = io();

        const socketListener = (data) => {
            if (data.status) {
                onProgress({ stage: 'backend', status: data.status });
            }
        };
        socket.on(jobId, socketListener);

        try {
            const { title, artistName, featuringArtists, album, releaseYear, director, label, tags, weekdays, duration, mediaFile } = songDetails;

            const artist = await findOrCreateArtist(artistName);

            const formData = new FormData();
            if (mediaFile) {
                formData.append('jobId', jobId);
                formData.append('mediaFile', mediaFile);
            }
            formData.append('title', title);
            formData.append('artist_id', artist.id);
            formData.append('album', album || '');
            formData.append('releaseYear', releaseYear || '');
            formData.append('director', director || '');
            formData.append('label', label || '');
            formData.append('duration', duration || '');
            
            await _uploadWithProgress('PUT', `/api/songs/${id}`, formData, onProgress);
            
            await apiFetch(`/songs/${id}/weekdays`, {
                method: 'POST',
                body: JSON.stringify({ weekdays })
            });

            await fetchSongs();
            await fetchCommercials();
            socket.off(jobId, socketListener);
            return { id };
        } catch (error) {
            socket.off(jobId, socketListener);
            throw error;
        }
    };

    const getSongDetails = async (songId) => {
        return await apiFetch(`/songs/${songId}`);
    };

    const deleteDbItem = async (type, id) => {
        const endpointMap = { artist: '/artists', category: '/categories', song: '/songs', suggestion: '/suggestions' };
        if (!endpointMap[type]) throw new Error('Tipo de item inválido para exclusão.');
        await apiFetch(`${endpointMap[type]}/${id}`, { method: 'DELETE' });
        
        if (type === 'artist') await fetchArtists();
        if (type === 'category') await fetchCategories();
        if (type === 'song') {
            await fetchSongs();
            await fetchCommercials();
        }
    };

    const addDbItem = async (type, name) => {
        const endpointMap = { artist: '/artists', tag: '/categories' };
        if (!endpointMap[type]) throw new Error('Tipo de item inválido para adição.');
        await apiFetch(endpointMap[type], { method: 'POST', body: JSON.stringify({ name }) });
        if (type === 'artist') await fetchArtists();
        if (type === 'tag') await fetchCategories();
    };

    const updateArtist = async (id, newName) => {
        await apiFetch(`/artists/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
        await fetchArtists();
        await fetchSongs();
    };

    return {
        initialize,
        getState: () => state,
        getAlbumsByArtist,
        getUniqueAlbums,
        getSongDetails,
        addSong,
        updateSong,
        deleteDbItem,
        addDbItem,
        updateArtist,
        findOrCreateArtist
    };
})();
