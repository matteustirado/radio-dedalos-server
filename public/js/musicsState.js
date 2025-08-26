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
        const uniqueLabels = [...new Set(state.songs.map(song => song.record_label_name).filter(Boolean))];
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
            const fullUrl = `${API_BASE_URL}${url}`;
            xhr.open(method, fullUrl, true);
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
                        reject(new Error(response.message || 'Erro no servidor.'));
                    }
                } catch (e) {
                     reject(new Error(xhr.responseText || 'Resposta inválida do servidor.'));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Erro de rede durante o upload.'));
            };

            xhr.send(formData);
        });
    };

    const _prepareSongData = async (songDetails) => {
        const { artistName, label } = songDetails;
        const artist = await ArtistModel.findOrCreate(artistName);
        const labelObj = label ? await RecordLabelModel.findOrCreate(label) : null;

        const formData = new FormData();
        Object.entries(songDetails).forEach(([key, value]) => {
            if (key !== 'artistName' && key !== 'label' && key !== 'tags' && key !== 'featuringArtists' && key !== 'weekdays' && value !== null) {
                 formData.append(key, value);
            }
        });
        
        formData.append('artist_id', artist.id);
        if (labelObj) {
            formData.append('label_id', labelObj.id);
        }
        formData.append('tags', JSON.stringify(songDetails.tags || []));
        formData.append('featuringArtists', JSON.stringify(songDetails.featuringArtists || []));
        formData.append('weekdays', JSON.stringify(songDetails.weekdays || []));

        return formData;
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
            const { artistName } = songDetails;
            const artist = await apiFetch('/artists', {
                method: 'POST', body: JSON.stringify({ name: artistName })
            });

            const formData = new FormData();
            Object.keys(songDetails).forEach(key => {
                 if (key !== 'artistName' && key !== 'weekdays' && key !== 'tags' && key !== 'featuringArtists') {
                    formData.append(key, songDetails[key]);
                }
            });
            formData.append('artist_id', artist.id);
            formData.append('weekdays', JSON.stringify(songDetails.weekdays || []));
            formData.append('tags', JSON.stringify(songDetails.tags || []));
            formData.append('featuringArtists', JSON.stringify(songDetails.featuringArtists || []));
            formData.append('jobId', jobId);
            
            const newSong = await _uploadWithProgress('POST', '/api/songs', formData, onProgress);
            
            await initialize();
            
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
            const { artistName } = songDetails;
            const artist = await apiFetch('/artists', {
                method: 'POST', body: JSON.stringify({ name: artistName })
            });

            const formData = new FormData();
             Object.keys(songDetails).forEach(key => {
                 if (key !== 'artistName' && key !== 'weekdays' && key !== 'tags' && key !== 'featuringArtists') {
                    formData.append(key, songDetails[key]);
                }
            });
            formData.append('artist_id', artist.id);
            formData.append('weekdays', JSON.stringify(songDetails.weekdays || []));
            formData.append('tags', JSON.stringify(songDetails.tags || []));
            formData.append('featuringArtists', JSON.stringify(songDetails.featuringArtists || []));
            if (songDetails.mediaFile) {
                 formData.append('jobId', jobId);
            }
           
            await _uploadWithProgress('PUT', `/api/songs/${id}`, formData, onProgress);

            await initialize();
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
        updateArtist
    };
})();