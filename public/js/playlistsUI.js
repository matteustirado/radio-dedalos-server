document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    const validRoles = ['admin', 'master', 'playlist_creator'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado. Você não tem permissão para gerenciar playlists.');
        window.location.href = '/';
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    const playlistNameInput = document.getElementById('playlist-name');
    const playlistTypeButtons = document.querySelectorAll('#playlist-type-group .button');
    const songSearchInput = document.getElementById('song-search-input');
    const songSearchDropdown = document.getElementById('song-search-dropdown');
    const currentPlaylistElement = document.getElementById('current-playlist');
    const playlistDurationElement = document.getElementById('playlist-duration');
    const submitPlaylistBtn = document.getElementById('submit-playlist-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const successMessage = document.getElementById('success-message');
    const dayOptionsContainer = document.getElementById('day-options-container');
    const dayOptions = dayOptionsContainer.querySelectorAll('.day-option');
    const dateSelectionContainer = document.getElementById('date-selection-container');
    const specificDateBtn = document.getElementById('specific-date-btn');
    const calendarPopup = document.getElementById('calendar-popup');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const selectedDatesContainer = document.getElementById('selected-dates-container');
    const dateLimitWarning = document.getElementById('date-limit-warning');
    const standardPlaylistsContainer = document.querySelector('#standard-playlists .card-grid');
    const dailyPlaylistsContainer = document.querySelector('#daily-playlists .card-grid');
    const specialPlaylistsContainer = document.querySelector('#special-playlists .card-grid');
    const mainLayoutGrid = document.querySelector('.main-layout-grid');
    const draftsPreviewView = document.getElementById('drafts-preview-view');
    const draftsExpandedView = document.getElementById('drafts-expanded-view');
    const draftsPreviewList = document.getElementById('drafts-preview-list');
    const draftsFullList = document.getElementById('drafts-full-list');
    const viewMoreDraftsBtn = document.getElementById('view-more-drafts-btn');
    const closeDraftsBtn = document.getElementById('close-drafts-btn');
    const viewLessDraftsBtn = document.getElementById('view-less-drafts-btn');
    const draftSearchInput = document.getElementById('draft-search-input');
    const deleteModal = document.getElementById('delete-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    const toggleFilterBtn = document.getElementById('toggle-filter-btn');
    const filterSection = document.getElementById('filter-section');
    const closeFilterBtn = document.getElementById('close-filter-btn');
    const filterYearStart = document.getElementById('filter-year-start');
    const filterYearEnd = document.getElementById('filter-year-end');
    const filterTagsContainer = document.getElementById('filter-tags-container');
    const filterTagsTrigger = document.getElementById('filter-tags-trigger');
    const filterTagsText = document.getElementById('filter-tags-text');
    const filterTagsDropdown = document.getElementById('filter-tags-dropdown');
    const filterWeekday = document.getElementById('filter-weekday');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    let currentDate = new Date();
    let itemToDelete = null;

    const weekdayMap = {
        monday: 'Segunda-feira',
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira',
        saturday: 'Sábado',
        sunday: 'Domingo'
    };

    const formatDuration = (seconds) => {
        if (isNaN(seconds) || seconds === null) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.round(seconds % 60);
        let timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (h > 0) timeString = `${h}:${timeString}`;
        return timeString;
    };

    const checkFormCompletion = () => {
        const { activePlaylist, currentPlaylistSongs } = playlistState.getState();
        const isNameFilled = activePlaylist.name && activePlaylist.name.trim() !== '';
        const isScheduled = (activePlaylist.type === 'padrao' && activePlaylist.weekday) || (activePlaylist.type !== 'padrao' && activePlaylist.special_dates.length > 0);
        const isMetadataComplete = isNameFilled && isScheduled;

        songSearchInput.disabled = !isMetadataComplete;
        songSearchInput.placeholder = isMetadataComplete ? `Buscar por música ou artista...` : "Preencha os dados da playlist";
        
        const canSave = isMetadataComplete && currentPlaylistSongs.length > 0;
        submitPlaylistBtn.disabled = !canSave;
        saveDraftBtn.disabled = !canSave;
    };

    const updatePlaylistSummary = () => {
        const { currentPlaylistSongs } = playlistState.getState();
        const totalSeconds = currentPlaylistSongs.reduce((acc, song) => acc + (song.duration_seconds || 0), 0);
        playlistDurationElement.textContent = `${currentPlaylistSongs.length} músicas • ${formatDuration(totalSeconds)}`;
    };

    const renderCurrentPlaylist = () => {
        const { currentPlaylistSongs } = playlistState.getState();
        const playlistBody = document.createElement('div');
        playlistBody.className = 'playlist-body';

        if (currentPlaylistSongs.length === 0) {
            currentPlaylistElement.innerHTML = `<div class="playlist-empty-message"><i class="fa-solid fa-music"></i><p>Sua playlist está vazia</p><span class="text-sm">Preencha os dados da playlist para adicionar músicas</span></div>`;
        } else {
            currentPlaylistSongs.forEach((song, index) => {
                const row = document.createElement('div');
                row.className = 'playlist-row';
                row.dataset.id = song.id;
                row.innerHTML = `
                    <div><i class="fa-solid fa-grip-vertical drag-handle"></i></div>
                    <div>${song.title}</div>
                    <div>${song.artist_name || 'Desconhecido'}</div>
                    <div>${formatDuration(song.duration_seconds)}</div>
                    <div><button class="button danger-button small icon-only remove-song-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></div>
                `;
                playlistBody.appendChild(row);
            });
            const header = document.createElement('div');
            header.className = 'playlist-header';
            header.innerHTML = `<div></div><div>Música</div><div>Artista</div><div>Duração</div><div>Ações</div>`;
            currentPlaylistElement.innerHTML = '';
            currentPlaylistElement.appendChild(header);
            currentPlaylistElement.appendChild(playlistBody);

            new Sortable(playlistBody, {
                animation: 150,
                handle: '.drag-handle',
                onEnd: (evt) => {
                    playlistState.reorderCurrentPlaylist(evt.oldIndex, evt.newIndex);
                    renderCurrentPlaylist();
                }
            });
        }
        updatePlaylistSummary();
        checkFormCompletion();
    };

    const updateScheduleVisibility = () => {
        const { activePlaylist } = playlistState.getState();
        const isPadrao = activePlaylist.type === 'padrao';
        dayOptionsContainer.classList.toggle('hidden', !isPadrao);
        dateSelectionContainer.classList.toggle('hidden', isPadrao);
        renderSelectedDates();
        checkFormCompletion();
    };

    const renderSelectedDates = () => {
        const { activePlaylist } = playlistState.getState();
        selectedDatesContainer.innerHTML = '';
        (activePlaylist.special_dates || []).forEach((date, index) => {
            const datePill = document.createElement('div');
            datePill.className = 'tag-pill';
            datePill.innerHTML = `<span>${new Date(date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span><button class="delete-tag-btn" data-index="${index}"><i class="fa-solid fa-times"></i></button>`;
            selectedDatesContainer.appendChild(datePill);
        });

        const dateLimit = activePlaylist.type === 'diaria' ? 1 : 5;
        const limitReached = (activePlaylist.special_dates || []).length >= dateLimit;
        dateLimitWarning.classList.toggle('hidden', !limitReached);
        specificDateBtn.classList.toggle('hidden', limitReached);
    };

    const renderCalendar = (date) => {
        const { activePlaylist } = playlistState.getState();
        const month = date.getMonth();
        const year = date.getFullYear();
        currentMonthEl.textContent = `${date.toLocaleString('pt-BR', { month: 'long' })} ${year}`;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        calendarGrid.innerHTML = '';
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day-name';
            dayEl.textContent = day;
            calendarGrid.appendChild(dayEl);
        });
        for (let i = 0; i < firstDay; i++) calendarGrid.appendChild(document.createElement('div'));
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = i;
            const thisDate = new Date(Date.UTC(year, month, i));
            const thisDateString = thisDate.toDateString();
            const isSelected = (activePlaylist.special_dates || []).some(d => new Date(d).toDateString() === thisDateString);

            if (isSelected) dayEl.classList.add('selected');

            dayEl.onclick = () => {
                const { activePlaylist } = playlistState.getState();
                const newDates = [...(activePlaylist.special_dates || [])];
                const dateLimit = activePlaylist.type === 'diaria' ? 1 : 5;
                const dateIndex = newDates.findIndex(d => new Date(d).toDateString() === thisDateString);

                if (dateIndex > -1) {
                    newDates.splice(dateIndex, 1);
                } else {
                    if (newDates.length >= dateLimit) {
                        alert(`Você pode selecionar no máximo ${dateLimit} data(s).`);
                        return;
                    }
                    if (activePlaylist.type === 'diaria') newDates.length = 0;
                    newDates.push(thisDate);
                }

                newDates.sort((a, b) => a - b);
                playlistState.updateActivePlaylistField('special_dates', newDates);

                renderSelectedDates();
                checkFormCompletion();
                renderCalendar(currentDate);
                if (activePlaylist.type === 'diaria' && newDates.length > 0) {
                    calendarPopup.classList.remove('show');
                }
            };
            calendarGrid.appendChild(dayEl);
        }
    };

    const renderAllPlaylists = () => {
        const { allPlaylists } = playlistState.getState();
        const published = allPlaylists.filter(p => p.status !== 'rascunho');
        renderPlaylistCards(published.filter(p => p.type === 'padrao'), standardPlaylistsContainer);
        renderPlaylistCards(published.filter(p => p.type === 'diaria'), dailyPlaylistsContainer);
        renderPlaylistCards(published.filter(p => p.type === 'especial'), specialPlaylistsContainer);
        renderDrafts();
    };

    const renderPlaylistCards = (playlists, container) => {
        const parentContainer = container.closest('.playlists-container');
        if (!playlists || playlists.length === 0) {
            container.innerHTML = `<div class="placeholder-text">Você ainda não criou nenhuma playlist nesse estilo. Ao trabalho!</div>`;
            parentContainer.classList.add('empty');
            return;
        }
        parentContainer.classList.remove('empty');
        container.innerHTML = '';
        playlists.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            let scheduleInfo = '';
            if (p.type === 'padrao') {
                scheduleInfo = weekdayMap[p.weekday] || p.weekday;
            } else if (p.special_dates && p.special_dates.length > 0) {
                scheduleInfo = new Date(p.special_dates[0]).toLocaleDateString('pt-BR', {
                    timeZone: 'UTC'
                });
            } else {
                scheduleInfo = 'N/A';
            }
            const songCount = p.song_count || 0;
            const totalDuration = formatDuration(p.total_duration);
            const playlistStats = `${songCount} músicas • ${totalDuration}`;
            card.innerHTML = `
                <div class="card-header">
                    <h3>${p.name}</h3>
                    <span class="status-tag active">Publicada</span>
                </div>
                <div class="card-info">
                    <p>${scheduleInfo}</p>
                </div>
                <div class="card-footer">
                    <p class="playlist-stats">${playlistStats}</p>
                    <div class="action-buttons">
                        <button data-id="${p.id}" class="button danger-button small icon-only delete-playlist-btn" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        <button data-id="${p.id}" class="button primary-button small icon-only edit-playlist-btn" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    };

    const renderDrafts = () => {
        const searchTerm = draftSearchInput.value.toLowerCase();
        const allDrafts = playlistState.getDrafts();
        const filteredDrafts = searchTerm ?
            allDrafts.filter(d => d.name.toLowerCase().includes(searchTerm)) :
            allDrafts;

        draftsPreviewList.innerHTML = '';
        if (allDrafts.length === 0) {
            draftsPreviewList.innerHTML = '<div class="placeholder-text">Você ainda nao salvou nenhum rascunho. Mãos a obra!</div>';
        } else {
            filteredDrafts.slice(0, 2).forEach(draft => {
                const item = document.createElement('div');
                item.className = 'draft-item';
                const songCount = draft.song_count || 0;
                const totalDuration = formatDuration(draft.total_duration);
                const simplifiedInfo = `${draft.type} • ${songCount} • ${totalDuration}`;
                item.innerHTML = `
                    <div>
                        <div class="draft-title">${draft.name}</div>
                        <div class="draft-info">${simplifiedInfo}</div>
                    </div>
                    <div class="action-buttons">
                        <button data-id="${draft.id}" class="button danger-button small icon-only delete-playlist-btn" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        <button data-id="${draft.id}" class="button primary-button small icon-only edit-playlist-btn" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>
                `;
                draftsPreviewList.appendChild(item);
            });
        }

        draftsFullList.innerHTML = '';
        if (allDrafts.length === 0) {
            draftsFullList.innerHTML = '<div class="placeholder-text">Você ainda nao salvou nenhum rascunho. Mãos a obra!</div>';
        } else if (filteredDrafts.length === 0) {
            draftsFullList.innerHTML = '<p class="empty-list-message">Nenhum rascunho encontrado para sua busca.</p>';
        } else {
            filteredDrafts.forEach(draft => {
                const item = document.createElement('div');
                item.className = 'draft-full-item';
                const songCount = draft.song_count || 0;
                const totalDuration = formatDuration(draft.total_duration);
                const fullInfo = `${songCount} músicas • ${totalDuration}`;
                item.innerHTML = `
                    <div>
                        <div class="draft-title">${draft.name}</div>
                        <div class="draft-info">${draft.type} • ${fullInfo}</div>
                    </div>
                    <div class="action-buttons">
                        <button data-id="${draft.id}" class="button danger-button small icon-only delete-playlist-btn" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                        <button data-id="${draft.id}" class="button primary-button small icon-only edit-playlist-btn" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>
                `;
                draftsFullList.appendChild(item);
            });
        }
        viewMoreDraftsBtn.classList.toggle('hidden', allDrafts.length <= 2);
    };

    const handleSave = async (status) => {
        submitPlaylistBtn.disabled = true;
        saveDraftBtn.disabled = true;
        try {
            await playlistState.saveActivePlaylist(status);
            successMessage.classList.remove('hidden');
            setTimeout(() => successMessage.classList.add('hidden'), 3000);

            await playlistState.fetchAllPlaylists();

            playlistState.resetActivePlaylist();
            renderAllPlaylists();
            playlistNameInput.value = '';
            renderCurrentPlaylist();
            updateScheduleVisibility();
            checkFormCompletion();

        } catch (error) {
            alert(`Erro ao salvar playlist: ${error.message}`);
        }
    };

    const setupScrollButtons = () => {
        document.querySelectorAll('.playlists-container').forEach(container => {
            const cardGrid = container.querySelector('.card-grid');
            const prevBtn = container.querySelector('.scroll-btn.prev');
            const nextBtn = container.querySelector('.scroll-btn.next');
            if (!cardGrid || !prevBtn || !nextBtn) return;
            const updateButtons = () => {
                const maxScrollLeft = cardGrid.scrollWidth - cardGrid.clientWidth;
                prevBtn.classList.toggle('hidden', cardGrid.scrollLeft < 1);
                nextBtn.classList.toggle('hidden', cardGrid.scrollLeft >= maxScrollLeft - 1);
            };
            prevBtn.addEventListener('click', () => {
                const scrollAmount = cardGrid.offsetWidth * 0.8;
                cardGrid.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
            });
            nextBtn.addEventListener('click', () => {
                const scrollAmount = cardGrid.offsetWidth * 0.8;
                cardGrid.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            });
            cardGrid.addEventListener('scroll', updateButtons);
            setTimeout(updateButtons, 100);
        });
    };
    
    const populateFilterTags = () => {
        const { allCategories } = playlistState.getState();
        filterTagsDropdown.innerHTML = '';
        allCategories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'custom-select-option';
            label.innerHTML = `
                <input type="checkbox" value="${category.id}">
                <span>${category.name}</span>
            `;
            filterTagsDropdown.appendChild(label);
        });
    };

    const updateSongSearchResults = () => {
        const term = songSearchInput.value;
        songSearchDropdown.innerHTML = '';
        if (songSearchInput.disabled) {
            songSearchDropdown.classList.remove('show');
            return;
        }
        
        const results = playlistState.getFilteredSongs(term);
        
        results.forEach(song => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = `${song.title} - ${song.artist_name}`;
            item.onclick = () => {
                playlistState.addSongToCurrentPlaylist(song);
                renderCurrentPlaylist();
                songSearchInput.value = '';
                songSearchDropdown.classList.remove('show');
            };
            songSearchDropdown.appendChild(item);
        });
        songSearchDropdown.classList.toggle('show', results.length > 0 && term.length > 0);
    };

    logoutBtn.addEventListener('click', logout);
    playlistNameInput.addEventListener('input', (e) => {
        playlistState.updateActivePlaylistField('name', e.target.value);
        checkFormCompletion();
    });
    playlistTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newType = btn.dataset.type;
            playlistState.updateActivePlaylistField('type', newType);
            playlistTypeButtons.forEach(b => {
                b.classList.toggle('active', b.dataset.type === newType);
                b.classList.toggle('secondary', b.dataset.type !== newType);
            });
            playlistState.updateActivePlaylistField('weekday', null);
            playlistState.updateActivePlaylistField('special_dates', []);
            dayOptions.forEach(opt => opt.classList.remove('selected'));
            updateScheduleVisibility();
        });
    });
    dayOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            const day = btn.dataset.day;
            playlistState.updateActivePlaylistField('weekday', day);
            dayOptions.forEach(opt => opt.classList.toggle('selected', opt.dataset.day === day));
            checkFormCompletion();
        });
    });
    specificDateBtn.addEventListener('click', () => {
        renderCalendar(currentDate);
        calendarPopup.classList.toggle('show');
    });
    prevMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    };
    nextMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    };
    selectedDatesContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-tag-btn');
        if (deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index, 10);
            const { activePlaylist } = playlistState.getState();
            const newDates = [...(activePlaylist.special_dates || [])];
            newDates.splice(index, 1);
            playlistState.updateActivePlaylistField('special_dates', newDates);
            renderSelectedDates();
            checkFormCompletion();
        }
    });
    songSearchInput.addEventListener('input', () => updateSongSearchResults());
    currentPlaylistElement.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-song-btn');
        if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index, 10);
            playlistState.removeSongFromCurrentPlaylist(index);
            renderCurrentPlaylist();
        }
    });
    saveDraftBtn.addEventListener('click', () => handleSave('rascunho'));
    submitPlaylistBtn.addEventListener('click', () => handleSave('publicada'));
    const showExpandedDrafts = () => {
        mainLayoutGrid.classList.add('drafts-expanded');
        draftsPreviewView.classList.add('hidden');
        draftsExpandedView.classList.remove('hidden');
    };
    const hideExpandedDrafts = () => {
        mainLayoutGrid.classList.remove('drafts-expanded');
        draftsPreviewView.classList.remove('hidden');
        draftsExpandedView.classList.add('hidden');
    };
    viewMoreDraftsBtn.addEventListener('click', showExpandedDrafts);
    closeDraftsBtn.addEventListener('click', hideExpandedDrafts);
    viewLessDraftsBtn.addEventListener('click', hideExpandedDrafts);
    draftSearchInput.addEventListener('input', renderDrafts);

    toggleFilterBtn.addEventListener('click', () => {
        filterSection.classList.remove('hidden');
        toggleFilterBtn.classList.add('hidden');
        closeFilterBtn.classList.remove('hidden');
    });

    closeFilterBtn.addEventListener('click', () => {
        filterSection.classList.add('hidden');
        toggleFilterBtn.classList.remove('hidden');
        closeFilterBtn.classList.add('hidden');
    });

    applyFiltersBtn.addEventListener('click', () => {
        const selectedTags = Array.from(filterTagsDropdown.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        const filters = {
            yearStart: filterYearStart.value ? parseInt(filterYearStart.value, 10) : null,
            yearEnd: filterYearEnd.value ? parseInt(filterYearEnd.value, 10) : null,
            tags: selectedTags,
            weekday: filterWeekday.value
        };
        playlistState.setActiveFilters(filters);
        updateSongSearchResults();
    });
    
    clearFiltersBtn.addEventListener('click', () => {
        filterYearStart.value = '';
        filterYearEnd.value = '';
        filterWeekday.value = '';
        filterTagsDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        filterTagsText.textContent = 'Selecione as tags...';
        playlistState.clearFilters();
        updateSongSearchResults();
    });
    
    filterTagsTrigger.addEventListener('click', () => {
        filterTagsDropdown.classList.toggle('hidden');
    });

    filterTagsDropdown.addEventListener('change', () => {
        const selectedCount = filterTagsDropdown.querySelectorAll('input[type="checkbox"]:checked').length;
        if (selectedCount === 0) {
            filterTagsText.textContent = 'Selecione as tags...';
        } else if (selectedCount === 1) {
            filterTagsText.textContent = '1 tag selecionada';
        } else {
            filterTagsText.textContent = `${selectedCount} tags selecionadas`;
        }
    });

    document.body.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-playlist-btn');
        if (editBtn) {
            const playlistId = editBtn.dataset.id;
            await playlistState.loadPlaylistForEditing(playlistId);
            const { activePlaylist } = playlistState.getState();
            playlistNameInput.value = activePlaylist.name;
            playlistTypeButtons.forEach(b => {
                const isCurrentType = b.dataset.type === activePlaylist.type;
                b.classList.toggle('active', isCurrentType);
                b.classList.toggle('secondary', !isCurrentType);
            });
            dayOptions.forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.day === activePlaylist.weekday);
            });
            renderCurrentPlaylist();
            updateScheduleVisibility();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            hideExpandedDrafts();
        }

        const deleteBtn = e.target.closest('.delete-playlist-btn');
        if (deleteBtn) {
            const playlistId = deleteBtn.dataset.id;
            const card = deleteBtn.closest('.card, .draft-item, .draft-full-item');
            const playlistName = card ? (card.querySelector('h3, .draft-title').textContent) : 'esta playlist';
            itemToDelete = {
                id: playlistId,
                name: playlistName
            };
            deleteModalTitle.textContent = 'Confirmar Exclusão';
            deleteModalText.textContent = `Tem certeza que deseja excluir a playlist "${itemToDelete.name}"?`;
            deleteModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        if (calendarPopup && !calendarPopup.contains(e.target) && !specificDateBtn.contains(e.target)) {
            calendarPopup.classList.remove('show');
        }
        if (songSearchDropdown && !e.target.closest('.dropdown')) {
            songSearchDropdown.classList.remove('show');
        }
        if (filterTagsDropdown && !filterTagsContainer.contains(e.target)) {
            filterTagsDropdown.classList.add('hidden');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        itemToDelete = null;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (itemToDelete) {
            await playlistState.deletePlaylistById(itemToDelete.id);
            await playlistState.fetchAllPlaylists();
            renderAllPlaylists();
            deleteModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            itemToDelete = null;
        }
    });

    const initializePage = async () => {
        try {
            await playlistState.initialize();
            populateFilterTags();
            renderAllPlaylists();
            renderCurrentPlaylist();
            updateScheduleVisibility();
            checkFormCompletion();
            setupScrollButtons();
            closeFilterBtn.classList.add('hidden');
        } catch (error) {
            console.error('Erro ao inicializar a página:', error);
            alert('Erro fatal ao carregar dados. Tente recarregar a página.');
        }
    };

    initializePage();
});

document.addEventListener('DOMContentLoaded', function() {
    const reportButton = document.querySelector('.report-button');
    if (reportButton) {
        reportButton.addEventListener('click', function() {
            const category = prompt('Categoria do problema:\n1 - Erro de funcionalidade\n2 - Problema visual\n3 - Erro de dados\n4 - Outro\n\nDigite o número da categoria:');
            if (!category || !['1', '2', '3', '4'].includes(category)) {
                alert('Categoria inválida.');
                return;
            }

            const categoryMap = {
                '1': 'functional_error',
                '2': 'visual_bug',
                '3': 'data_error',
                '4': 'other'
            };

            const description = prompt('Descreva o problema:');
            if (!description || description.trim() === '') {
                alert('Descrição é obrigatória.');
                return;
            }

            apiFetch('/reports', {
                method: 'POST',
                body: JSON.stringify({
                    category: categoryMap[category],
                    description: description.trim(),
                    instance: 'playlists'
                })
            }).then(() => {
                alert('Relatório enviado com sucesso!');
            }).catch(error => {
                alert('Erro ao enviar relatório: ' + error.message);
            });
        });
    }
});
