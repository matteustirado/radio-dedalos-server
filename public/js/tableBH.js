document.addEventListener('DOMContentLoaded', () => {
    let pricingData = {};
    const locationSlug = 'bh';
    const weekDays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    async function fetchAndRenderPrices() {
        try {
            pricingData = await apiFetch(`/prices/${locationSlug}`);
            updateInterface();
        } catch (error) {
            console.error("Erro ao buscar preços:", error);
            document.querySelector('.pricing-container').innerHTML = `<p style="color: white; text-align: center;">Não foi possível carregar os preços.</p>`;
        }
    }

    function updateInterface() {
        if (!pricingData || !pricingData.dias) return;
        const currentDay = getCurrentDay();
        const currentPeriod = getCurrentPeriod(currentDay);
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === currentDay));
        document.querySelectorAll('.period-option').forEach(o => o.classList.toggle('active', o.dataset.period === currentPeriod));
        updatePrices(currentDay, currentPeriod);
    }

    function updatePrices(day, period) {
        if (!pricingData.dias || !pricingData.dias[day] || !pricingData.dias[day].prices) {
            document.querySelectorAll('.price-card .price').forEach(span => span.textContent = '--');
            document.querySelectorAll('.dynamic-message').forEach(el => el.remove());
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

            const priceValue = dayData.prices?.[key]?.[period];
            const priceValueDiv = card.querySelector('.price-value');

            if (day === 'segunda' && (period === 'manha' || period === 'tarde') && priceValue === 0) {
                priceValueDiv.textContent = 'FREE';
                priceValueDiv.style.fontSize = '2rem';
            }
            else if (priceValue !== undefined && priceValue !== null) {
                priceValueDiv.innerHTML = `R$ <span class="price">${priceValue.toFixed(2).replace('.', ',')}</span>`;
                priceValueDiv.style.fontSize = '2.2rem';
            }
            else {
                priceValueDiv.innerHTML = `R$ <span class="price">--</span>`;
                priceValueDiv.style.fontSize = '2.2rem';
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

    function isHoliday(date) {
        if (!pricingData.feriados) return false;
        const d = String(date.getDate()).padStart(2, '0'),
            m = String(date.getMonth() + 1).padStart(2, '0'),
            y = date.getFullYear();
        return pricingData.feriados.includes(`${d}-${m}-${y}`);
    }

    function getCurrentPeriod(day) {
        const h = new Date().getHours();
        
        if (day === 'segunda') {
            if (h >= 0 && h < 14) return 'manha';
            if (h >= 14 && h < 20) return 'tarde';
            return 'noite';
        }
        
        return (h >= 6 && h < 14) ? 'manha' : (h >= 14 && h < 20) ? 'tarde' : 'noite';
    }

    function getCurrentDay() {
        const now = new Date();
        return isHoliday(now) ? 'feriados' : weekDays[now.getDay()];
    }

    document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', (e) => {
        const day = e.target.dataset.tab;
        const period = document.querySelector('.period-option.active')?.dataset.period || getCurrentPeriod(day);
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        updatePrices(day, period);
    }));

    document.querySelectorAll('.period-option').forEach(option => option.addEventListener('click', (e) => {
        const period = e.currentTarget.dataset.period;
        const day = document.querySelector('.tab-button.active')?.dataset.tab || getCurrentDay();
        document.querySelectorAll('.period-option').forEach(opt => opt.classList.remove('active'));
        e.currentTarget.classList.add('active');
        updatePrices(day, period);
    }));

    fetchAndRenderPrices();

    const socket = io(window.location.origin);
    socket.on('connect', () => console.log('Conectado ao servidor de atualizações em tempo real.'));
    socket.on('prices:updated', data => {
        if (data.location === locationSlug) {
            fetchAndRenderPrices();
        }
    });
});