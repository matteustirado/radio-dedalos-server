document.addEventListener('DOMContentLoaded', () => {
    let pricingData = {};
    const locationSlug = 'sp';
    const serverUrl = 'http://159.65.161.7:3000/';
    const weekDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

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

    function updatePrices(day, period) {
        if (!pricingData.dias || !pricingData.dias[day] || !pricingData.dias[day].prices) {
            document.querySelectorAll('.price-card .price').forEach(span => span.textContent = '--');
            document.querySelectorAll('.dynamic-message').forEach(el => el.remove());
            document.querySelectorAll('.price-per-person').forEach(el => el.textContent = '');
            return;
        }
        const dayData = pricingData.dias[day];
        const priceCards = document.querySelectorAll('.price-card');
        priceCards.forEach(card => {
            const titleElement = card.querySelector('h3');
            const type = titleElement.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('mao amiga', 'amiga').replace(/\s+/g, '');
            let key;
            if (type === 'player') key = 'player';
            else if (type === 'amiga') key = 'amiga';
            else if (type === 'marmita') key = 'marmita';
            
            const priceSpan = card.querySelector('.price');
            const pricePerPersonDiv = card.querySelector('.price-per-person');
            const priceValue = dayData.prices?.[key]?.[period];

            priceSpan.textContent = priceValue?.toFixed(2).replace('.', ',') || '--';

            if (pricePerPersonDiv) {
                if (priceValue) {
                    let perPersonPrice;
                    if (key === 'amiga') {
                        perPersonPrice = (priceValue / 2).toFixed(2).replace('.', ',');
                        pricePerPersonDiv.textContent = `(R$ ${perPersonPrice} por pessoa)`;
                    } else if (key === 'marmita') {
                        perPersonPrice = (priceValue / 3).toFixed(2).replace('.', ',');
                        pricePerPersonDiv.textContent = `(R$ ${perPersonPrice} por pessoa)`;
                    } else {
                        pricePerPersonDiv.textContent = '';
                    }
                } else {
                    pricePerPersonDiv.textContent = '';
                }
            }
            
            const featuresList = card.querySelector('.price-features');
            let messageItem = featuresList.querySelector('.dynamic-message');
            if (messageItem) messageItem.remove();
            if (dayData.messages?.[key]?.message) {
                const newListItem = document.createElement('li');
                newListItem.className = 'dynamic-message';
                newListItem.textContent = dayData.messages[key].message;
                featuresList.appendChild(newListItem);
            }
        });
    }

    function updateInterface() {
        if (!pricingData || !pricingData.dias) return;
        const currentDay = getCurrentDay();
        const currentPeriod = getCurrentPeriod();
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === currentDay));
        document.querySelectorAll('.period-option').forEach(o => o.classList.toggle('active', o.dataset.period === currentPeriod));
        updatePrices(currentDay, currentPeriod);
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
        const activePeriodElement = document.querySelector('.period-option.active');
        const activePeriod = activePeriodElement ? activePeriodElement.dataset.period : null;

        if (correctPeriod !== activePeriod) {
            const day = document.querySelector('.tab-button.active')?.dataset.tab || getCurrentDay();
            
            if(activePeriodElement) {
                activePeriodElement.classList.remove('active');
            }

            const newActivePeriodElement = document.querySelector(`.period-option[data-period="${correctPeriod}"]`);
            if (newActivePeriodElement) {
                newActivePeriodElement.classList.add('active');
            }
            
            updatePrices(day, correctPeriod);
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
        const period = document.querySelector('.period-option.active')?.dataset.period || 'manha';
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        updatePrices(day, period);
        fetchAndRenderSlides(day);
    }));

    document.querySelectorAll('.period-option').forEach(option => option.addEventListener('click', (e) => {
        const period = e.currentTarget.dataset.period;
        const day = document.querySelector('.tab-button.active')?.dataset.tab || 'segunda';
        document.querySelectorAll('.period-option').forEach(opt => opt.classList.remove('active'));
        e.currentTarget.classList.add('active');
        updatePrices(day, period);
    }));

    fetchAndRenderPrices();
    fetchAndRenderSlides(getCurrentDay());
    
    setInterval(autoRefreshPeriod, 60000);
    setInterval(autoRefreshDay, 60000);

    const socket = io(serverUrl);
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