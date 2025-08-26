document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    const validRoles = ['master', 'adm-tabela-bh'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado. Você não tem permissão para editar esta tabela.');
        window.location.href = '/';
        return;
    }

    const locationSlug = 'bh';
    let currentData = {};
    let holidays = new Set();

    const dayOptions = document.querySelectorAll('.day-option');
    const saveBtn = document.getElementById('saveBtn');
    const currentPricesContainer = document.getElementById('currentPricesContainer');
    const logoutBtn = document.getElementById('logout-btn');
    const holidaySection = document.getElementById('holiday-management-section');
    const holidayDateInput = document.getElementById('holiday-date-input');
    const addHolidayBtn = document.getElementById('add-holiday-btn');
    const holidayListContainer = document.getElementById('holiday-list');

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

        let html = `${Object.keys(currentDayData.prices).map(type => {
            const typeData = currentDayData.prices[type];
            const title = type === 'player' ? 'Player' : (type === 'amiga' ? 'Mão Amiga' : 'Marmita');
            return `<div class="price-card-display"><h4>${title}</h4><ul>
                        <li>Manhã: <span class="price-value">R$ ${typeData.manha?.toFixed(2).replace('.', ',') || '--'}</span></li>
                        <li>Tarde: <span class="price-value">R$ ${typeData.tarde?.toFixed(2).replace('.', ',') || '--'}</span></li>
                        <li>Noite: <span class="price-value">R$ ${typeData.noite?.toFixed(2).replace('.', ',') || '--'}</span></li>
                    </ul></div>`;
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

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const selectedDays = Array.from(dayOptions).filter(btn => btn.classList.contains('active')).map(btn => btn.dataset.day);
            if (selectedDays.length === 0) return alert('Selecione pelo menos um dia da semana para os preços.');

            const dataToSave = JSON.parse(JSON.stringify(currentData));
            dataToSave.feriados = Array.from(holidays).map(d => {
                const [year, month, day] = d.split('-');
                return `${day}-${month}-${year}`;
            });
            
            selectedDays.forEach(day => {
                if (!dataToSave.dias[day]) dataToSave.dias[day] = { prices: {}, messages: {} };
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
                await apiFetch(`/prices/${locationSlug}`, { method: 'PUT', body: JSON.stringify(dataToSave) });
                alert('Tabela de preços atualizada com sucesso!');
                dayOptions.forEach(button => button.classList.remove('active'));
                if (holidaySection) holidaySection.classList.add('hidden');
                loadPriceData();
            } catch (error) {
                alert(`Erro ao salvar preços: ${error.message}`);
            }
        });
    }

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

    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    loadPriceData();
});