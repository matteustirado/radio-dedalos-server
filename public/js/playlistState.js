const playlistState = (() => {
    const state = {
        songs: [],
        artists: [],
        allPlaylists: [],
        allCategories: [],
        activePlaylist: {
            id: null,
            name: '',
            type: 'padrao',
            weekday: null,
            special_dates: [],
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
            ...data,
            special_dates: (data.special_dates || []).map(d => new Date(d))
        };
        state.currentPlaylistSongs = (data.items || []).map(item => {
            return state.songs.find(s => s.id === item.song_id);
        }).filter(Boolean);
    };

    const saveActivePlaylist = async (status) => {
        state.activePlaylist.status = status;
        const items = state.currentPlaylistSongs.map((song, index) => ({
            song_id: song.id,
            sequence_order: index + 1
        }));

        const isUpdating = !!state.activePlaylist.id;

        if (isUpdating) {
            await apiFetch(`/playlists/${state.activePlaylist.id}`, {
                method: 'DELETE'
            });
        }

        const playlistToCreate = { ...state.activePlaylist
        };
        delete playlistToCreate.id;
        delete playlistToCreate.items;
        delete playlistToCreate.song_count;
        delete playlistToCreate.total_duration;

        const newPlaylist = await apiFetch('/playlists', {
            method: 'POST',
            body: JSON.stringify(playlistToCreate)
        });

        if (!newPlaylist || !newPlaylist.id) {
            throw new Error('Erro: O servidor não retornou a nova playlist com um ID válido.');
        }

        if (items.length > 0) {
            await apiFetch(`/playlists/${newPlaylist.id}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    items
                })
            });
        }
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
            type: 'padrao',
            weekday: null,
            special_dates: [],
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
