const playlistState = (() => {
    const state = {
        songs: [],
        artists: [],
        allPlaylists: [],
        allCategories: [],
        activePlaylist: {
            id: null,
            name: '',
            type: null,
            special_type: 'fixa',
            weekday: null,
            special_dates: [],
            scheduled_date: null,
            scheduled_time: null,
            status: 'rascunho'
        },
        currentPlaylistSongs: [],
        activeFilters: {
            yearStart: '',
            yearEnd: '',
            tags: [],
            weekday: ''
        }
    };

    const initialize = async () => {
        try {
            const [songsData, artistsData, playlistsData, categoriesData] = await Promise.all([
                apiFetch('/songs?include_commercials=true'),
                apiFetch('/artists'),
                apiFetch('/playlists'),
                apiFetch('/categories')
            ]);

            state.songs = Array.isArray(songsData) ? songsData : [];
            state.artists = Array.isArray(artistsData) ? artistsData : [];
            state.allPlaylists = Array.isArray(playlistsData) ? playlistsData : [];
            state.allCategories = Array.isArray(categoriesData) ? categoriesData : [];

            const artistMap = new Map(state.artists.map(artist => [artist.id, artist.name]));
            state.songs.forEach(song => {
                song.artist_name = artistMap.get(song.artist_id);
            });

        } catch (error) {
            console.error(error);
            alert('Erro fatal ao inicializar os dados da página. Verifique a conexão com a API.');
        }
    };

    const fetchAllPlaylists = async () => {
        const playlistsData = await apiFetch('/playlists');
        state.allPlaylists = Array.isArray(playlistsData) ? playlistsData : [];
    };

    const getDrafts = () => {
        return state.allPlaylists
            .filter(p => p.status === 'rascunho')
            .sort((a, b) => b.id - a.id);
    };

    const loadPlaylistForEditing = async (playlistId) => {
        const data = await apiFetch(`/playlists/${playlistId}`);
        state.activePlaylist = {
            ...state.activePlaylist,
            ...data,
            special_dates: (data.special_dates || []).map(d => new Date(d))
        };
        state.currentPlaylistSongs = (data.items || []).map(item => {
            return state.songs.find(s => s.id === item.song_id);
        }).filter(Boolean);
    };

    const saveActivePlaylist = async (status) => {
        state.activePlaylist.status = status;
        
        const payload = { ...state.activePlaylist };

        if (payload.type === 'padrao') {
            payload.scheduled_date = null;
            payload.scheduled_time = null;
            payload.special_type = null;
            payload.special_dates = [];
        } else if (payload.type === 'diaria') {
            payload.weekday = null;
            payload.special_type = null;
            payload.special_dates = [];
        } else if (payload.type === 'especial') {
            payload.scheduled_date = null;
            payload.special_dates = [];
            if (payload.special_type === 'fixa') {
                payload.weekday = null;
                payload.scheduled_time = null;
            }
        }
        
        delete payload.items;
        delete payload.song_count;
        delete payload.total_duration;
        
        const isUpdating = !!payload.id;
        let savedPlaylist;

        if (isUpdating) {
            savedPlaylist = await apiFetch(`/playlists/${payload.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            savedPlaylist = await apiFetch('/playlists', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        if (!savedPlaylist || !savedPlaylist.id) {
            throw new Error('Erro: O servidor não retornou a playlist salva com um ID válido.');
        }

        const items = state.currentPlaylistSongs.map((song, index) => ({
            song_id: song.id,
            sequence_order: index + 1
        }));
        
        await apiFetch(`/playlists/${savedPlaylist.id}/items`, {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    };

    const deletePlaylistById = async (playlistId) => {
        await apiFetch(`/playlists/${playlistId}`, {
            method: 'DELETE'
        });
    };

    const resetActivePlaylist = () => {
        state.activePlaylist = {
            id: null,
            name: '',
            type: null,
            special_type: 'fixa',
            weekday: null,
            special_dates: [],
            scheduled_date: null,
            scheduled_time: null,
            status: 'rascunho'
        };
        state.currentPlaylistSongs = [];
    };

    const getFilteredSongs = (searchTerm = '') => {
        const { yearStart, yearEnd, tags, weekday } = state.activeFilters;
        const lowerCaseTerm = searchTerm.toLowerCase();

        let filteredSongs = state.songs.filter(song => {
            const songYear = parseInt(song.release_year, 10);
            if (yearStart && (!songYear || songYear < yearStart)) return false;
            if (yearEnd && (!songYear || songYear > yearEnd)) return false;
            
            if (weekday && (!song.weekdays || !song.weekdays.includes(weekday))) return false;

            if (tags.length > 0) {
                if (!song.categories || song.categories.length === 0) return false;
                const songTagIds = song.categories.map(c => c.id.toString());
                const hasAllSelectedTags = tags.every(tagId => songTagIds.includes(tagId));
                if (!hasAllSelectedTags) return false;
            }
            
            return true;
        });
        
        if (lowerCaseTerm) {
            filteredSongs = filteredSongs.filter(s =>
                (s.title && s.title.toLowerCase().includes(lowerCaseTerm)) ||
                (s.artist_name && s.artist_name.toLowerCase().includes(lowerCaseTerm))
            );
        }

        return filteredSongs;
    };
    
    const setActiveFilters = (filters) => {
        state.activeFilters = { ...state.activeFilters, ...filters };
    };

    const clearFilters = () => {
        state.activeFilters = {
            yearStart: '',
            yearEnd: '',
            tags: [],
            weekday: ''
        };
    };

    return {
        initialize,
        getState: () => state,
        getDrafts,
        addSongToCurrentPlaylist: (song) => {
            state.currentPlaylistSongs.push(song);
        },
        removeSongFromCurrentPlaylist: (index) => {
            state.currentPlaylistSongs.splice(index, 1);
        },
        reorderCurrentPlaylist: (oldIndex, newIndex) => {
            const [movedItem] = state.currentPlaylistSongs.splice(oldIndex, 1);
            state.currentPlaylistSongs.splice(newIndex, 0, movedItem);
        },
        updateActivePlaylistField: (field, value) => {
            state.activePlaylist[field] = value;
        },
        fetchAllPlaylists,
        loadPlaylistForEditing,
        saveActivePlaylist,
        deletePlaylistById,
        resetActivePlaylist,
        getFilteredSongs,
        setActiveFilters,
        clearFilters
    };
})();