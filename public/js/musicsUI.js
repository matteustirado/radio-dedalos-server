document.addEventListener('DOMContentLoaded', function() {
    protectPage();
    const validRoles = ['admin', 'master', 'dj', 'musics'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado.');
        window.location.href = '/';
        return;
    }

    const allMainSections = document.querySelectorAll('.form-section');
    const dbCards = document.querySelectorAll('.db-card');
    const deleteModal = document.getElementById('delete-modal');
    const messageAlertEl = document.getElementById('success-message');
    const messageTextEl = document.getElementById('success-text');
    const musicForm = document.getElementById('music-form');
    const musicIdInput = document.getElementById('music-id');
    const formTitle = document.getElementById('form-title');
    const formButtons = document.querySelector('.form-buttons');
    const uploadStatusContainer = document.getElementById('upload-status-container');
    const uploadStatusText = document.getElementById('upload-status-text');
    const dayOptions = document.querySelectorAll('#add-music-form .day-option');
    const searchMusicInput = document.getElementById('search-music-input');
    const artistInput = document.getElementById('artist-name');
    const artistList = document.getElementById('artist-autocomplete-list');
    const albumInput = document.getElementById('album-name');
    const albumList = document.getElementById('album-autocomplete-list');
    const labelInput = document.getElementById('label-name');
    const labelList = document.getElementById('label-autocomplete-list');
    const tagInput = document.getElementById('new-tag-input');
    const tagList = document.getElementById('tag-autocomplete-list');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsContainer = document.getElementById('tags-container');
    const featuringArtistInput = document.getElementById('featuring-artist-input');
    const featuringArtistList = document.getElementById('featuring-artist-autocomplete-list');
    const addFeaturingArtistBtn = document.getElementById('add-featuring-artist-btn');
    const featuringArtistsContainer = document.getElementById('featuring-artists-container');
    const releaseYearInput = document.getElementById('release-year');
    const durationInput = document.getElementById('duration');
    const mediaFileInput = document.getElementById('media-file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const submitBtn = document.getElementById('form-submit-btn');
    const uploadStep = document.getElementById('upload-step');
    const metadataStep = document.getElementById('metadata-step');
    
    let itemToDelete = {};

    if (mediaFileInput && fileNameDisplay) {
        mediaFileInput.addEventListener('change', async () => {
            if (mediaFileInput.files.length > 0) {
                const file = mediaFileInput.files[0];
                fileNameDisplay.textContent = file.name;
                
                const formData = new FormData();
                formData.append('mediaFile', file);

                uploadStatusText.textContent = 'Analisando arquivo...';
                uploadStatusContainer.classList.remove('hidden');
                
                try {
                    const metadata = await apiFetch('/songs/extract-metadata', {
                        method: 'POST',
                        body: formData
                    });

                    document.getElementById('music-name').value = metadata.title || '';
                    artistInput.value = metadata.artist || '';
                    albumInput.value = metadata.album || '';
                    durationInput.value = metadata.duration || '00:00';
                    
                    metadataStep.classList.remove('hidden');
                } catch (error) {
                    showMessage(`Erro ao extrair metadados: ${error.message}`, 'danger');
                    fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
                    mediaFileInput.value = '';
                } finally {
                    uploadStatusContainer.classList.add('hidden');
                }
            } else {
                fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
                metadataStep.classList.add('hidden');
            }
        });
    }

    const validateYear = () => {
        const year = parseInt(releaseYearInput.value, 10);
        const currentYear = new Date().getFullYear();
        if (releaseYearInput.value && (year < 1500 || year > currentYear)) {
            releaseYearInput.classList.add('error');
            submitBtn.disabled = true;
            return false;
        } else {
            releaseYearInput.classList.remove('error');
            submitBtn.disabled = false;
            return true;
        }
    };

    if (releaseYearInput) {
        releaseYearInput.addEventListener('input', validateYear);
    }

    const showMessage = (message, type = 'success') => {
        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        messageAlertEl.classList.remove('hidden');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };

    const openSection = (sectionId) => {
        allMainSections.forEach(sec => sec.classList.add('hidden'));
        const section = document.getElementById(sectionId);
        if (section) section.classList.remove('hidden');
    };

    const setupPillInput = (inputEl, buttonEl, containerEl, listEl, sourceCallback) => {
        const addPill = (value) => {
            const trimmedValue = value.trim();
            if (trimmedValue) {
                const pill = document.createElement('div');
                pill.className = 'tag-pill';
                pill.innerHTML = `<span>${trimmedValue}</span><button type="button" class="delete-tag-btn"><i class="fas fa-times"></i></button>`;
                containerEl.appendChild(pill);
                inputEl.value = '';
                pill.querySelector('.delete-tag-btn').addEventListener('click', () => pill.remove());
            }
        };
        buttonEl.addEventListener('click', () => addPill(inputEl.value));
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPill(inputEl.value);
            }
        });

        const onSelect = (item) => {
            addPill(typeof item === 'string' ? item : item.name);
        };
        
        setupAutocomplete(inputEl, listEl, sourceCallback, onSelect);
    };

    const resetMusicForm = () => {
        musicForm.reset();
        musicIdInput.value = '';
        tagsContainer.innerHTML = '';
        featuringArtistsContainer.innerHTML = '';
        dayOptions.forEach(opt => opt.classList.remove('selected'));
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        }
        document.querySelector('.day-option[data-all="true"]').classList.add('selected');
        formTitle.innerHTML = '<i class="fas fa-compact-disc icon"></i> Adicionar Nova Música';
        submitBtn.textContent = 'Salvar Música';
        releaseYearInput.classList.remove('error');
        submitBtn.disabled = false;
        metadataStep.classList.add('hidden');
    };

    const formatSecondsToDuration = (totalSeconds) => {
        if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds === 0) return '';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const populateMusicForm = (song) => {
        const { artists } = musicsState.getState();
        resetMusicForm();
        musicIdInput.value = song.id;
        document.getElementById('music-name').value = song.title;
        artistInput.value = artists.find(a => a.id === song.artist_id)?.name || '';
        albumInput.value = song.album || '';
        releaseYearInput.value = song.release_year === '0000' ? '' : song.release_year;
        durationInput.value = formatSecondsToDuration(song.duration_seconds);
        labelInput.value = song.record_label_name || '';
        document.getElementById('video-director').value = song.director || '';
        tagsContainer.innerHTML = '';
        (song.categories || []).forEach(cat => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            pill.innerHTML = `<span>${cat.name}</span><button type="button" class="delete-tag-btn"><i class="fas fa-times"></i></button>`;
            tagsContainer.appendChild(pill);
            pill.querySelector('.delete-tag-btn').addEventListener('click', () => pill.remove());
        });
        featuringArtistsContainer.innerHTML = '';
        (song.featuring_artists || []).forEach(artist => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            pill.innerHTML = `<span>${artist.name}</span><button type="button" class="delete-tag-btn"><i class="fas fa-times"></i></button>`;
            featuringArtistsContainer.appendChild(pill);
            pill.querySelector('.delete-tag-btn').addEventListener('click', () => pill.remove());
        });
        if (song.weekdays && song.weekdays.length > 0) {
            dayOptions.forEach(opt => opt.classList.remove('selected'));
            const weekdayMap = { 'Seg': 'monday', 'Ter': 'tuesday', 'Qua': 'wednesday', 'Qui': 'thursday', 'Sex': 'friday', 'Sáb': 'saturday', 'Dom': 'sunday' };
            dayOptions.forEach(opt => {
                if (opt.dataset.all) return;
                const dayKey = weekdayMap[opt.textContent];
                if (song.weekdays.includes(dayKey)) {
                    opt.classList.add('selected');
                }
            });
        }
        formTitle.innerHTML = '<i class="fas fa-compact-disc icon"></i> Editar Música';
        submitBtn.textContent = 'Atualizar Música';
        openSection('add-music-form');
        metadataStep.classList.remove('hidden');
    };

    const setupAutocomplete = (inputEl, listEl, sourceCallback, onSelect) => {
        const defaultOnSelect = (item) => {
            inputEl.value = typeof item === 'string' ? item : item.name;
        };
        const selectHandler = onSelect || defaultOnSelect;

        inputEl.addEventListener('input', () => {
            const value = inputEl.value.toLowerCase();
            const items = sourceCallback();
            listEl.innerHTML = '';
            if (!value) {
                listEl.classList.remove('show');
                return;
            }
            const filteredItems = items.filter(item => {
                const itemName = (typeof item === 'string' ? item : item.name).toLowerCase();
                return itemName.includes(value);
            });
            filteredItems.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'autocomplete-item';
                itemEl.textContent = typeof item === 'string' ? item : item.name;
                itemEl.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectHandler(item);
                    listEl.classList.remove('show');
                });
                listEl.appendChild(itemEl);
            });
            listEl.classList.toggle('show', filteredItems.length > 0);
        });
        inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                listEl.classList.remove('show');
            }, 150);
        });
    };

    const renderSongsTable = (songsToRender) => {
        const { artists } = musicsState.getState();
        const artistMap = new Map(artists.map(a => [a.id, a.name]));
        const tbody = document.getElementById('search-results');
        tbody.innerHTML = '';
        songsToRender.forEach(song => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${song.title}</td>
                <td>${artistMap.get(song.artist_id) || 'Desconhecido'}</td>
                <td>${song.album || '-'}</td>
                <td>${song.release_year === '0000' ? '' : song.release_year}</td>
                <td>
                    <div class="action-buttons">
                        <button class="button primary-button small icon-only edit-song-btn" data-id="${song.id}" title="Editar"><i class="fas fa-pen-to-square"></i></button>
                        <button class="button danger-button small icon-only delete-item-btn" data-id="${song.id}" data-name="${song.title}" data-type="song" title="Excluir"><i class="fas fa-trash-can"></i></button>
                    </div>
                </td>`;
            tbody.appendChild(row);
        });
    };

    const renderDbList = (type) => {
        const { artists, categories, commercials } = musicsState.getState();
        const container = document.querySelector(`#${type}s-content .db-list`);
        let items = [];
        let renderType = type;
        if (type === 'artist') items = artists;
        if (type === 'commercial') items = commercials;
        if (type === 'tag') {
            items = categories;
            renderType = 'category';
        }
        if (type === 'album') {
            items = musicsState.getUniqueAlbums();
        }
        container.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.dataset.id = item.id;
            if (type === 'tag') {
                itemEl.className = 'tag-pill';
                itemEl.innerHTML = `<span>${item.name}</span><button class="delete-item-btn" data-id="${item.id}" data-name="${item.name}" data-type="category"><i class="fas fa-times"></i></button>`;
            } else if (type === 'album') {
                itemEl.className = 'list-item';
                itemEl.innerHTML = `<div><div>${item.title}</div><div class="album-artist">${item.artist_name}</div></div>`;
            } else if (type === 'commercial') {
                itemEl.className = 'list-item';
                itemEl.innerHTML = `<span class="item-name">${item.title}</span><div class="action-buttons"><button class="button primary-button small icon-only edit-song-btn" data-id="${item.id}" title="Editar"><i class="fas fa-pen-to-square"></i></button><button class="button danger-button small icon-only delete-item-btn" data-id="${item.id}" data-name="${item.title}" data-type="song" title="Excluir"><i class="fas fa-trash-can"></i></button></div>`;
            } else {
                itemEl.className = 'list-item';
                itemEl.innerHTML = `<span class="item-name">${item.name}</span><div class="action-buttons"><button class="button primary-button small icon-only edit-item-btn" data-id="${item.id}" data-type="${renderType}" title="Editar"><i class="fas fa-pen-to-square"></i></button><button class="button danger-button small icon-only delete-item-btn" data-id="${item.id}" data-name="${item.name}" data-type="${renderType}" title="Excluir"><i class="fas fa-trash-can"></i></button></div>`;
            }
            container.appendChild(itemEl);
        });
    };
    
    musicForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!validateYear()) {
            showMessage('O ano de lançamento é inválido.', 'danger');
            return;
        }
        const songId = musicIdInput.value;
        const artistName = artistInput.value.trim();
        const title = document.getElementById('music-name').value.trim();
        const mediaFile = mediaFileInput.files[0];
        if (!artistName || !title) {
            return showMessage('Nome da música e do artista são obrigatórios.', 'danger');
        }
        if (!songId && !mediaFile) {
            return showMessage('Um arquivo de mídia é obrigatório ao adicionar uma nova música.', 'danger');
        }
        const songDetails = {
            title, artistName, mediaFile,
            album: albumInput.value.trim(),
            releaseYear: releaseYearInput.value,
            director: document.getElementById('video-director').value.trim(),
            label: labelInput.value.trim(),
            duration: durationInput.value.trim(),
            tags: Array.from(tagsContainer.querySelectorAll('.tag-pill span')).map(span => span.textContent),
            featuringArtists: Array.from(featuringArtistsContainer.querySelectorAll('.tag-pill span')).map(span => span.textContent),
            weekdays: Array.from(dayOptions).filter(opt => opt.classList.contains('selected') && !opt.dataset.all).map(opt => {
                const weekdayMap = { 'Seg': 'monday', 'Ter': 'tuesday', 'Qua': 'wednesday', 'Qui': 'thursday', 'Sex': 'friday', 'Sáb': 'saturday', 'Dom': 'sunday' };
                return weekdayMap[opt.textContent];
            })
        };
        const onProgress = (progress) => {
            if (progress.stage === 'upload') {
                uploadStatusText.textContent = `Enviando ${progress.percent}%...`;
                if (progress.percent === 100) {
                    uploadStatusText.textContent = 'Processando no servidor...';
                }
            } else if (progress.stage === 'backend') {
                uploadStatusText.textContent = progress.status;
            }
        };
        formButtons.classList.add('hidden');
        uploadStatusContainer.classList.remove('hidden');
        uploadStatusText.textContent = 'Iniciando...';
        try {
            if (songId) {
                await musicsState.updateSong(songId, songDetails, onProgress);
                showMessage('Música atualizada com sucesso!');
            } else {
                const newSong = await musicsState.addSong(songDetails, onProgress);
                showMessage(`Música "${newSong.title}" adicionada com sucesso!`);
            }
            resetMusicForm();
            openSection('search-music-section');
            renderSongsTable(musicsState.getState().songs);
        } catch (error) {
            showMessage(`Erro ao salvar música: ${error.message}`, 'danger');
        } finally {
            formButtons.classList.remove('hidden');
            uploadStatusContainer.classList.add('hidden');
        }
    });

    document.getElementById('add-music-btn').addEventListener('click', () => {
        resetMusicForm();
        openSection('add-music-form');
    });
    document.getElementById('search-music-btn').addEventListener('click', () => {
        openSection('search-music-section');
        renderSongsTable(musicsState.getState().songs);
    });
    document.querySelectorAll('.close-section-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wasEditing = musicIdInput.value !== '';
            e.target.closest('.form-section').classList.add('hidden');
            resetMusicForm();
            if (wasEditing) {
                openSection('search-music-section');
            }
        });
    });
    document.getElementById('logout-btn').addEventListener('click', logout);
    releaseYearInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    durationInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 2) {
            value = value.slice(0, 2) + ':' + value.slice(2, 4);
        }
        e.target.value = value;
    });
    dayOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (this.dataset.all) {
                const isBecomingActive = !this.classList.contains('selected');
                dayOptions.forEach(opt => opt.classList.toggle('selected', isBecomingActive));
            } else {
                this.classList.toggle('selected');
                const individualDays = Array.from(dayOptions).filter(d => !d.dataset.all);
                const allSelected = individualDays.every(d => d.classList.contains('selected'));
                document.querySelector('.day-option[data-all]').classList.toggle('selected', allSelected);
            }
        });
    });
    searchMusicInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const { songs, artists } = musicsState.getState();
        const artistMap = new Map(artists.map(a => [a.id, a.name]));
        const filteredSongs = songs.filter(song => {
            const artistName = artistMap.get(song.artist_id) || '';
            return song.title.toLowerCase().includes(searchTerm) ||
                artistName.toLowerCase().includes(searchTerm) ||
                (song.album && song.album.toLowerCase().includes(searchTerm));
        });
        renderSongsTable(filteredSongs);
    });
    dbCards.forEach(card => {
        card.querySelector('.db-card-header').addEventListener('click', (e) => {
            const clickedCard = e.currentTarget.closest('.db-card');
            const isExpanding = !clickedCard.classList.contains('expanded');
            dbCards.forEach(otherCard => {
                otherCard.classList.remove('expanded', 'hidden');
                otherCard.querySelector('.db-card-content').classList.add('hidden');
                otherCard.querySelector('.expand-btn').classList.remove('open');
            });
            if (isExpanding) {
                clickedCard.classList.add('expanded');
                clickedCard.querySelector('.db-card-content').classList.remove('hidden');
                clickedCard.querySelector('.expand-btn').classList.add('open');
                dbCards.forEach(otherCard => {
                    if (otherCard !== clickedCard) otherCard.classList.add('hidden');
                });
                const type = e.currentTarget.dataset.target.replace('-content', '');
                renderDbList(type.slice(0, -1));
            }
        });
    });
    document.querySelectorAll('.add-db-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = e.currentTarget.dataset.type;
            const input = e.currentTarget.previousElementSibling;
            const name = input.value.trim();
            if (!name) return;
            try {
                await musicsState.addDbItem(type, name);
                input.value = '';
                showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} adicionado(a) com sucesso!`);
                renderDbList(type);
            } catch (error) {
                showMessage(`Erro ao adicionar: ${error.message}`, 'danger');
            }
        });
    });
    document.body.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-item-btn');
        const editArtistBtn = e.target.closest('.edit-item-btn');
        const confirmEditArtistBtn = e.target.closest('.confirm-edit-btn');
        const cancelEditArtistBtn = e.target.closest('.cancel-edit-btn');
        const editSongBtn = e.target.closest('.edit-song-btn');
        if (deleteBtn) {
            itemToDelete = { id: deleteBtn.dataset.id, name: deleteBtn.dataset.name, type: deleteBtn.dataset.type };
            document.getElementById('delete-modal-title').textContent = `Excluir ${itemToDelete.type}`;
            document.getElementById('delete-modal-text').textContent = `Tem certeza que deseja excluir "${itemToDelete.name}"?`;
            deleteModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        }
        if (editArtistBtn) {
            const listItem = editArtistBtn.closest('.list-item');
            const nameSpan = listItem.querySelector('.item-name');
            const actionButtonsDiv = listItem.querySelector('.action-buttons');
            const currentName = nameSpan.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-input small item-edit-input';
            input.value = currentName;
            nameSpan.replaceWith(input);
            input.focus();
            input.select();
            actionButtonsDiv.innerHTML = `<button class="button primary-button small icon-only confirm-edit-btn" title="Confirmar"><i class="fas fa-check"></i></button><button class="button secondary-button small icon-only cancel-edit-btn" title="Cancelar"><i class="fas fa-times"></i></button>`;
        }
        if (cancelEditArtistBtn) {
            renderDbList('artist');
        }
        if (confirmEditArtistBtn) {
            const listItem = confirmEditArtistBtn.closest('.list-item');
            const input = listItem.querySelector('.item-edit-input');
            const id = listItem.dataset.id;
            const newName = input.value.trim();
            const type = 'artist';
            if (newName) {
                try {
                    await musicsState.updateArtist(id, newName);
                    showMessage('Artista atualizado com sucesso!');
                    renderDbList(type);
                    renderSongsTable(musicsState.getState().songs);
                } catch (error) {
                    showMessage(error.message, 'danger');
                }
            } else {
                renderDbList(type);
            }
        }
        if (editSongBtn) {
            const songId = editSongBtn.dataset.id;
            try {
                const songDetails = await musicsState.getSongDetails(songId);
                if (songDetails) {
                    populateMusicForm(songDetails);
                } else {
                    showMessage('Não foi possível encontrar os detalhes da música.', 'danger');
                }
            } catch (error) {
                showMessage(error.message, 'danger');
            }
        }
    });
    document.getElementById('cancel-delete').addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    });
    document.getElementById('confirm-delete').addEventListener('click', async () => {
        try {
            await musicsState.deleteDbItem(itemToDelete.type, itemToDelete.id);
            showMessage(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} excluído(a) com sucesso!`);
            if (itemToDelete.type === 'song') {
                renderSongsTable(musicsState.getState().songs);
            } else {
                renderDbList(itemToDelete.type === 'category' ? 'tag' : itemToDelete.type);
            }
        } catch (error) {
            const errorMessage = error.message.toLowerCase();
            if (itemToDelete.type === 'artist' && (errorMessage.includes('foreign key') || errorMessage.includes('constraint'))) {
                showMessage("Esse artista ainda possui musicas associadas a ele, nao é possivel deleta-lo no momento", 'danger');
            } else {
                showMessage(error.message, 'danger');
            }
        } finally {
            deleteModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
    });

    const initializePage = async () => {
        try {
            await musicsState.initialize();
            setupAutocomplete(artistInput, artistList, () => musicsState.getState().artists);
            setupAutocomplete(labelInput, labelList, () => musicsState.getState().labels);
            setupAutocomplete(albumInput, albumList, () => {
                const artistName = artistInput.value.trim();
                return artistName ? musicsState.getAlbumsByArtist(artistName) : [];
            });
            setupPillInput(tagInput, addTagBtn, tagsContainer, tagList, () => musicsState.getState().categories);
            setupPillInput(featuringArtistInput, addFeaturingArtistBtn, featuringArtistsContainer, featuringArtistList, () => musicsState.getState().artists);
            
        } catch (error) {
            console.error("Erro fatal na inicialização da UI:", error);
            alert("Ocorreu um erro crítico ao carregar a página de Admin. Verifique o console.");
        }
    };
    
    initializePage();
});