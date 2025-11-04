document.addEventListener('DOMContentLoaded', () => {
    let pricingData = {};
    const locationSlug = 'sp';
    const weekDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    const colManha = document.getElementById('column-manha');
    const colTarde = document.getElementById('column-tarde');
    const colNoite = document.getElementById('column-noite');
    const allColumns = [colManha, colTarde, colNoite];

    function isHoliday(date) {
        if (!pricingData.feriados) return false;
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return pricingData.feriados.includes(`${d}-${m}-${y}`);
    }

    function getCurrentDay() {
        const now = new Date();
        return isHoliday(now) ? 'feriados' : weekDays[now.getDay()];
    }

    function getCurrentPeriod() {
        const h = new Date().getHours();
        return (h >= 6 && h < 14) ? 'manha' : (h >= 14 && h < 20) ? 'tarde' : 'noite';
    }

    function populatePriceColumn(columnElement, dayData, period) {
        if (!columnElement) return;

        const priceCards = columnElement.querySelectorAll('.price-card');
        
        priceCards.forEach(card => {
            const titleElement = card.querySelector('h3');
            const type = titleElement.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('mao amiga', 'amiga').replace(/\s+/g, '');
            let key;
            if (type === 'player') key = 'player';
            else if (type === 'amiga') key = 'amiga';
            else if (type === 'marmita') key = 'marmita';
            
            const priceValue = dayData?.prices?.[key]?.[period];

            if (key === 'player') {
                const priceSpan = card.querySelector('.price');
                if (priceSpan) priceSpan.textContent = priceValue?.toFixed(2).replace('.', ',') || '--';
            
            } else {
                const perPersonSpan = card.querySelector('.price-per-person-dynamic');
                const totalSpan = card.querySelector('.price-total-dynamic');

                if (perPersonSpan && totalSpan) {
                    if (priceValue) {
                        const divisor = (key === 'amiga') ? 2 : 3;
                        perPersonSpan.textContent = (priceValue / divisor).toFixed(2).replace('.', ',');
                        totalSpan.textContent = priceValue.toFixed(2).replace('.', ',');
                    } else {
                        perPersonSpan.textContent = '--';
                        totalSpan.textContent = '--';
                    }
                }
            }
            
            const featuresList = card.querySelector('.price-features');
            
            if (featuresList) { 
                let messageItem = featuresList.querySelector('.dynamic-message');
                if (messageItem) messageItem.remove(); 
                
                if (dayData?.messages?.[key]?.message) {
                    const newListItem = document.createElement('li');
                    newListItem.className = 'dynamic-message';
                    newListItem.textContent = dayData.messages[key].message;
                    featuresList.appendChild(newListItem);
                }
            }
        });
    }

    function updatePrices(day) {
        const dayData = pricingData.dias ? pricingData.dias[day] : null;

        if (!dayData) {
            populatePriceColumn(colManha, null, 'manha');
            populatePriceColumn(colTarde, null, 'tarde');
            populatePriceColumn(colNoite, null, 'noite');
            return;
        }

        populatePriceColumn(colManha, dayData, 'manha');
        populatePriceColumn(colTarde, dayData, 'tarde');
        populatePriceColumn(colNoite, dayData, 'noite');
    }

    function updateActivePeriod(period) {
        allColumns.forEach(col => col.classList.remove('active', 'left-col', 'right-col'));

        switch (period) {
            case 'manha':
                colNoite.classList.add('left-col');
                colManha.classList.add('active');
                colTarde.classList.add('right-col');
                break;
            case 'tarde':
                colManha.classList.add('left-col');
                colTarde.classList.add('active');
                colNoite.classList.add('right-col');
                break;
            case 'noite':
            default:
                colTarde.classList.add('left-col');
                colNoite.classList.add('active');
                colManha.classList.add('right-col');
                break;
        }
    }

    function updateInterface() {
        if (!pricingData || !pricingData.dias) return;
        
        const currentDay = getCurrentDay();
        const currentPeriod = getCurrentPeriod();
        
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === currentDay));
        updatePrices(currentDay);
        updateActivePeriod(currentPeriod);
    }

    async function fetchAndRenderSlides(day) {
        try {
            const dayToFetch = day || getCurrentDay();
            const slides = await apiFetch(`/slides/${locationSlug}/${dayToFetch}`);
            const sliderContainer = document.getElementById('slider');
            if (!sliderContainer) return;

            sliderContainer.innerHTML = '';
            if (slides && slides.length > 0) {
                slides.forEach(slide => {
                    const img = document.createElement('img');
                    img.src = `/assets/uploads/${locationSlug}/${slide.image_filename}`;
                    img.alt = slide.image_filename.split('-').slice(2).join(' ').replace(/\.[^/.]+$/, "") || 'Promoção';
                    sliderContainer.appendChild(img);
                });
            }

            document.dispatchEvent(new Event('slidesRendered'));
        } catch (error) {
            console.error(`Erro ao carregar os slides para ${day}:`, error);
        }
    }

    async function fetchAndRenderPrices() {
        try {
            pricingData = await apiFetch(`/prices/${locationSlug}`);
            updateInterface();
        } catch (error) {
            console.error("Erro ao buscar preços:", error);
            document.querySelector('.pricing-container').innerHTML = `<p style="color: white; text-align: center;">Não foi possível carregar os preços.</p>`;
        }
    }
    
    function autoRefreshPeriod() {
        const correctPeriod = getCurrentPeriod();
        const activePeriodId = `column-${correctPeriod}`;
        const activeElement = document.querySelector('.price-column.active');

        if (!activeElement || activeElement.id !== activePeriodId) {
            updateActivePeriod(correctPeriod);
        }
    }

    function autoRefreshDay() {
        const correctDay = getCurrentDay();
        const activeDayElement = document.querySelector('.tab-button.active');
        const activeDay = activeDayElement ? activeDayElement.dataset.tab : null;
        
        if (correctDay !== activeDay) {
            updateInterface(); 
            fetchAndRenderSlides(correctDay);
        }
    }

    document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', (e) => {
        const day = e.target.dataset.tab;
        
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        updatePrices(day);
        fetchAndRenderSlides(day);
    }));

    fetchAndRenderPrices();
    fetchAndRenderSlides(getCurrentDay());
    
    setInterval(autoRefreshPeriod, 60000);
    setInterval(autoRefreshDay, 60000);

    const socket = io();
    socket.on('connect', () => console.log('Conectado ao servidor de atualizações em tempo real.'));
    socket.on('prices:updated', data => {
        if (data.location === locationSlug) {
            fetchAndRenderPrices();
        }
    });
    socket.on('slides:updated', data => {
        if (data.location === locationSlug) {
            const activeDay = document.querySelector('.tab-button.active')?.dataset.tab || getCurrentDay();
            fetchAndRenderSlides(activeDay);
        }
    });
});