document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    const validRoles = ['master', 'adm-tabela-sp'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado. Você não tem permissão para editar esta tabela.');
        window.location.href = '/';
        return;
    }
    const locationSlug = 'sp';
    let currentData = {};
    let selectedFiles = [];
    let holidays = new Set();

    const dayOptions = document.querySelectorAll('.day-option');
    const saveBtn = document.getElementById('saveBtn');
    const currentPricesContainer = document.getElementById('currentPricesContainer');
    const logoutBtn = document.getElementById('logout-btn');
    const slideImageInput = document.getElementById('slideImageInput');
    const uploadActions = document.getElementById('uploadActions');
    const uploadSlideBtn = document.getElementById('uploadSlideBtn');
    const slidePreviewContainer = document.getElementById('slidePreviewContainer');
    
    const holidaySection = document.getElementById('holiday-management-section');
    const holidayDateInput = document.getElementById('holiday-date-input');
    const addHolidayBtn = document.getElementById('add-holiday-btn');
    const holidayListContainer = document.getElementById('holiday-list');

    const slidesCollapsedView = document.getElementById('slides-collapsed-view');
    const slidesExpandedView = document.getElementById('slides-expanded-view');
    const slideThumbnailGrid = document.getElementById('slide-thumbnail-grid');
    const currentSlidesContainer = document.getElementById('currentSlidesContainer');
    const expandSlidesBtn = document.getElementById('expand-slides-btn');
    const collapseSlidesBtn = document.getElementById('collapse-slides-btn');

    const weekDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'feriados'];
    const weekDayInitials = {
        segunda: 'S', terca: 'T', quarta: 'Q', quinta: 'Q', sexta: 'S', sabado: 'S', domingo: 'D', feriados: 'F'
    };
    
    const renderHolidays = () => {
        if (!holidayListContainer) return;
        holidayListContainer.innerHTML = '';
        const sortedHolidays = Array.from(holidays).sort();
        sortedHolidays.forEach(dateStr => {
            const [year, month, day] = dateStr.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            const item = document.createElement('div');
            item.className = 'holiday-item';
            item.innerHTML = `<span>${formattedDate}</span><button data-date="${dateStr}" class="delete-holiday-btn"><i class="fas fa-trash"></i></button>`;
            holidayListContainer.appendChild(item);
        });
    };

    const loadPriceData = async () => {
        try {
            currentData = await apiFetch(`/prices/${locationSlug}`);
            if (currentData) {
                renderCurrentPrices();
                populatePriceInputs();
                holidays = new Set(currentData.feriados.map(d => {
                    const [day, month, year] = d.split('-');
                    return `${year}-${month}-${day}`;
                }));
                renderHolidays();
            }
        } catch (error) {
            alert(`Falha ao carregar dados dos preços: ${error.message}`);
        }
    };

    function renderCurrentPrices() {
        if (!currentPricesContainer || !currentData.dias) return;

        const getTodayKey = () => {
            const now = new Date();
            const todayStr = String(now.getDate()).padStart(2, '0') + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + now.getFullYear();
            if (currentData.feriados?.includes(todayStr)) return 'feriados';
            const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            return days[now.getDay()];
        };

        const currentDayKey = getTodayKey();
        const currentDayData = currentData.dias[currentDayKey];

        if (!currentDayData || !currentDayData.prices) {
            currentPricesContainer.innerHTML = `<p>Preços para hoje (${currentDayKey}) não disponíveis.</p>`;
            return;
        }

        const displayName = currentDayKey.charAt(0).toUpperCase() + currentDayKey.slice(1);
        let html = `${Object.keys(currentDayData.prices).map(type => {
            const typeData = currentDayData.prices[type];
            const title = type === 'player' ? 'Player' : (type === 'amiga' ? 'Mão Amiga' : 'Marmita');
            return `
                <div class="price-card-display">
                    <h4>${title}</h4>
                    <ul>
                        <li>Manhã: <span class="price-value">R$ ${typeData.manha?.toFixed(2).replace('.', ',') || '--'}</span></li>
                        <li>Tarde: <span class="price-value">R$ ${typeData.tarde?.toFixed(2).replace('.', ',') || '--'}</span></li>
                        <li>Noite: <span class="price-value">R$ ${typeData.noite?.toFixed(2).replace('.', ',') || '--'}</span></li>
                    </ul>
                </div>`;
        }).join('')}`;

        currentPricesContainer.innerHTML = html;
    }

    function populatePriceInputs() {
        if (!currentData.dias) return;
        const referenceDay = currentData.dias.segunda || Object.values(currentData.dias)[0];
        if (!referenceDay) return;

        document.querySelectorAll('.price-input').forEach(input => {
            const type = input.dataset.type;
            const period = input.dataset.period;
            if (referenceDay.prices?.[type]?.[period] !== undefined) {
                input.value = referenceDay.prices[type][period].toFixed(2);
            } else {
                input.value = '';
            }
        });

        document.getElementById('playerMessage').value = referenceDay.messages?.player?.message || '';
        document.getElementById('amigaMessage').value = referenceDay.messages?.amiga?.message || '';
        document.getElementById('marmitaMessage').value = referenceDay.messages?.marmita?.message || '';
    }

    const loadSlides = async () => {
        try {
            const uniqueSlides = await apiFetch(`/slides/${locationSlug}`);
            
            slideThumbnailGrid.innerHTML = '';
            currentSlidesContainer.innerHTML = '';

            const hasSlides = uniqueSlides && uniqueSlides.length > 0;
            
            expandSlidesBtn.classList.toggle('hidden', !hasSlides);

            if (!hasSlides) {
                slideThumbnailGrid.innerHTML = '<p style="color: var(--color-text-muted);">Nenhum slide cadastrado.</p>';
                return;
            }

            const slidesGrid = document.createElement('div');
            slidesGrid.className = 'slides-display-grid';

            uniqueSlides.forEach(slide => {
                const thumbnailUrl = `/assets/uploads/${locationSlug}/${slide.image_filename}`;
                
                const thumbnail = document.createElement('img');
                thumbnail.src = thumbnailUrl;
                thumbnail.className = 'slide-thumbnail';
                slideThumbnailGrid.appendChild(thumbnail);

                const slideCard = document.createElement('div');
                slideCard.className = 'slide-card';

                const dayIndicators = weekDays.map(day => {
                    const isSelected = slide.days.includes(day);
                    return `<div class="day-indicator ${isSelected ? 'selected' : ''}">${weekDayInitials[day]}</div>`;
                }).join('');

                slideCard.innerHTML = `
                    <img src="${thumbnailUrl}" alt="Slide">
                    <button class="button danger-button delete-slide-btn" data-slide-id="${slide.representative_id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <div class="slide-day-indicators">${dayIndicators}</div>
                `;
                slidesGrid.appendChild(slideCard);
            });
            
            currentSlidesContainer.appendChild(slidesGrid);

        } catch (error) {
            currentSlidesContainer.innerHTML = '<p>Erro ao carregar os slides.</p>';
            console.error(error);
        }
    };

    const handleFileSelection = (event) => {
        selectedFiles = Array.from(event.target.files);
        slidePreviewContainer.innerHTML = '';

        if (selectedFiles.length === 0) {
            uploadActions.classList.add('hidden');
            return;
        }

        selectedFiles.forEach(file => {
            const previewCard = document.createElement('div');
            previewCard.className = 'slide-preview-card';
            
            const daySelectors = weekDays.map(day => 
                `<button type="button" class="day-selector-btn" data-day="${day}">${weekDayInitials[day]}</button>`
            ).join('');

            previewCard.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Preview de ${file.name}">
                <p class="file-info">${file.name}</p>
                <div class="day-selector-container">${daySelectors}</div>
            `;
            slidePreviewContainer.appendChild(previewCard);
        });

        uploadActions.classList.remove('hidden');
    };

    const handleUpload = async () => {
        const previewCards = document.querySelectorAll('.slide-preview-card');
        if (previewCards.length === 0) return;

        uploadSlideBtn.disabled = true;
        uploadSlideBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const formData = new FormData();
        const daysArray = [];
        let hasAtLeastOneDaySelected = false;

        previewCards.forEach((card, index) => {
            const selectedDays = Array.from(card.querySelectorAll('.day-selector-btn.selected')).map(btn => btn.dataset.day);
            daysArray.push(selectedDays);
            formData.append('slideImages', selectedFiles[index]);
            if (selectedDays.length > 0) {
                hasAtLeastOneDaySelected = true;
            }
        });

        if (!hasAtLeastOneDaySelected) {
            alert('Por favor, selecione pelo menos um dia para uma das imagens.');
            uploadSlideBtn.disabled = false;
            uploadSlideBtn.innerHTML = '<i class="fas fa-upload"></i> Enviar Slides Selecionados';
            return;
        }

        formData.append('daysOfWeek', JSON.stringify(daysArray));

        try {
            await apiFetch(`/slides/${locationSlug}`, {
                method: 'POST',
                body: formData
            });
            alert('Slides enviados com sucesso!');
            slideImageInput.value = '';
            slidePreviewContainer.innerHTML = '';
            uploadActions.classList.add('hidden');
            loadSlides();
        } catch (error) {
            alert(`Erro no upload: ${error.message}`);
        } finally {
            uploadSlideBtn.disabled = false;
            uploadSlideBtn.innerHTML = '<i class="fas fa-upload"></i> Enviar Slides Selecionados';
        }
    };

    saveBtn.addEventListener('click', async () => {
        const selectedDays = Array.from(dayOptions).filter(btn => btn.classList.contains('active')).map(btn => btn.dataset.day);
        if (selectedDays.length === 0) return alert('Selecione pelo menos um dia da semana para os preços.');

        const dataToSave = JSON.parse(JSON.stringify(currentData));
        dataToSave.feriados = Array.from(holidays).map(d => {
            const [year, month, day] = d.split('-');
            return `${day}-${month}-${year}`;
        });
        
        selectedDays.forEach(day => {
            if (!dataToSave.dias[day]) dataToSave.dias[day] = {
                prices: {},
                messages: {}
            };
            document.querySelectorAll('.price-input').forEach(input => {
                const type = input.dataset.type;
                const period = input.dataset.period;
                if (!dataToSave.dias[day].prices[type]) dataToSave.dias[day].prices[type] = {};
                dataToSave.dias[day].prices[type][period] = parseFloat(input.value) || 0;
            });
            const playerMsg = document.getElementById('playerMessage').value;
            const amigaMsg = document.getElementById('amigaMessage').value;
            const marmitaMsg = document.getElementById('marmitaMessage').value;
            if (!dataToSave.dias[day].messages.player) dataToSave.dias[day].messages.player = {};
            if (!dataToSave.dias[day].messages.amiga) dataToSave.dias[day].messages.amiga = {};
            if (!dataToSave.dias[day].messages.marmita) dataToSave.dias[day].messages.marmita = {};
            dataToSave.dias[day].messages.player.message = playerMsg;
            dataToSave.dias[day].messages.amiga.message = amigaMsg;
            dataToSave.dias[day].messages.marmita.message = marmitaMsg;
        });

        try {
            await apiFetch(`/prices/${locationSlug}`, {
                method: 'PUT',
                body: JSON.stringify(dataToSave)
            });
            alert('Tabela de preços atualizada com sucesso!');
            dayOptions.forEach(button => button.classList.remove('active'));
            if (holidaySection) holidaySection.classList.add('hidden');
            loadPriceData();
        } catch (error) {
            alert(`Erro ao salvar preços: ${error.message}`);
        }
    });

    slideImageInput.addEventListener('change', handleFileSelection);
    uploadSlideBtn.addEventListener('click', handleUpload);
    
    slidePreviewContainer.addEventListener('click', (event) => {
        const dayBtn = event.target.closest('.day-selector-btn');
        if (dayBtn) {
            dayBtn.classList.toggle('selected');
        }
    });

    currentSlidesContainer.addEventListener('click', async (event) => {
        const deleteBtn = event.target.closest('.delete-slide-btn');
        if (!deleteBtn) return;
        const slideId = deleteBtn.dataset.slideId;
        if (confirm('Tem certeza que deseja excluir este slide?')) {
            try {
                await apiFetch(`/slides/${slideId}`, {
                    method: 'DELETE'
                });
                alert('Slide excluído com sucesso.');
                loadSlides();
            } catch (error) {
                alert(`Erro ao excluir: ${error.message}`);
            }
        }
    });
    
    dayOptions.forEach(button => button.addEventListener('click', () => {
        button.classList.toggle('active');
        const isFeriadosActive = document.querySelector('.day-option[data-day="feriados"]').classList.contains('active');
        if (holidaySection) {
            holidaySection.classList.toggle('hidden', !isFeriadosActive);
        }
    }));

    if (addHolidayBtn) {
        addHolidayBtn.addEventListener('click', () => {
            const dateValue = holidayDateInput.value;
            if (dateValue) {
                holidays.add(dateValue);
                renderHolidays();
                holidayDateInput.value = '';
            }
        });
    }

    if (holidayListContainer) {
        holidayListContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-holiday-btn');
            if (deleteBtn) {
                holidays.delete(deleteBtn.dataset.date);
                renderHolidays();
            }
        });
    }

    expandSlidesBtn.addEventListener('click', () => {
        slidesCollapsedView.classList.add('hidden');
        slidesExpandedView.classList.remove('hidden');
        expandSlidesBtn.classList.add('hidden');
        collapseSlidesBtn.classList.remove('hidden');
    });

    collapseSlidesBtn.addEventListener('click', () => {
        slidesExpandedView.classList.add('hidden');
        slidesCollapsedView.classList.remove('hidden');
        collapseSlidesBtn.classList.add('hidden');
        expandSlidesBtn.classList.remove('hidden');
    });

    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    loadPriceData();
    loadSlides();
});