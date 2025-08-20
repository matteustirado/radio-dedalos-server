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

    const dayOptions = document.querySelectorAll('.day-option');
    const saveBtn = document.getElementById('saveBtn');
    const currentPricesContainer = document.getElementById('currentPricesContainer');
    const logoutBtn = document.getElementById('logout-btn');
    const slideImageInput = document.getElementById('slideImageInput');
    const uploadActions = document.getElementById('uploadActions');
    const uploadSlideBtn = document.getElementById('uploadSlideBtn');
    const slidePreviewContainer = document.getElementById('slidePreviewContainer');
    const currentSlidesContainer = document.getElementById('currentSlidesContainer');
    const weekDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'feriados'];

    const loadPriceData = async () => {
        try {
            currentData = await apiFetch(`/prices/${locationSlug}`);
            if (currentData) {
                renderCurrentPrices();
                populatePriceInputs();
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
            const groupedSlides = await apiFetch(`/slides/${locationSlug}`);
            currentSlidesContainer.innerHTML = '';

            if (Object.keys(groupedSlides).length === 0) {
                currentSlidesContainer.innerHTML = '<p style="color: var(--color-text-muted);">Nenhum slide cadastrado.</p>';
                return;
            }

            weekDays.forEach(day => {
                if (groupedSlides[day] && groupedSlides[day].length > 0) {
                    const dayGroup = document.createElement('div');
                    dayGroup.className = 'day-group';
                    const displayName = day.charAt(0).toUpperCase() + day.slice(1);
                    dayGroup.innerHTML = `<h4 class="day-group-title">${displayName}</h4>`;
                    const grid = document.createElement('div');
                    grid.className = 'slides-display-grid';

                    groupedSlides[day].forEach(slide => {
                        const slideCard = document.createElement('div');
                        slideCard.className = 'slide-card';
                        slideCard.innerHTML = `
                            <img src="/assets/uploads/${locationSlug}/${slide.image_filename}" alt="Slide para ${day}">
                            <button class="button danger-button delete-slide-btn" data-slide-id="${slide.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        `;
                        grid.appendChild(slideCard);
                    });

                    dayGroup.appendChild(grid);
                    currentSlidesContainer.appendChild(dayGroup);
                }
            });

        } catch (error) {
            currentSlidesContainer.innerHTML = '<p>Erro ao carregar os slides.</p>';
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
            const options = weekDays.map(day => `<option value="${day}">${day.charAt(0).toUpperCase() + day.slice(1)}</option>`).join('');
            previewCard.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Preview de ${file.name}">
                <p class="file-info">${file.name}</p>
                <select class="day-selector form-input">${options}</select>
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

        previewCards.forEach((card, index) => {
            const selectedDay = card.querySelector('.day-selector').value;
            daysArray.push(selectedDay);
            formData.append('slideImages', selectedFiles[index]);
        });
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
        } catch (error) {
            alert(`Erro ao salvar preços: ${error.message}`);
        }
    });

    slideImageInput.addEventListener('change', handleFileSelection);
    uploadSlideBtn.addEventListener('click', handleUpload);
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

    dayOptions.forEach(button => button.addEventListener('click', () => button.classList.toggle('active')));
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    loadPriceData();
    loadSlides();
});