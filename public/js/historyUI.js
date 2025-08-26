document.addEventListener('DOMContentLoaded', function() {
    
    // Encontra os elementos essenciais primeiro
    const historyBtn = document.getElementById('history-btn');
    const historySection = document.getElementById('consult-history-section');
    const consultBansSection = document.getElementById('consult-bans-section');

    // Se os elementos principais não existirem, o script não continua.
    if (!historyBtn || !historySection || !consultBansSection) {
        console.error('Um ou mais elementos essenciais para o Histórico de Pedidos não foram encontrados no HTML.');
        return;
    }

    // Elementos secundários
    const closeHistoryBtn = historySection.querySelector('.close-section-btn');
    const historyListContainer = document.getElementById('history-list');
    const filterBtn = document.getElementById('history-filter-btn');
    const filterPopup = document.getElementById('history-filter-popup');
    const monthFilter = document.getElementById('history-month-filter');
    const yearFilter = document.getElementById('history-year-filter');
    
    // Verifica se todos os elementos foram encontrados
    if (!closeHistoryBtn || !historyListContainer || !filterBtn || !filterPopup || !monthFilter || !yearFilter) {
        console.error('Um ou mais componentes da interface de histórico (filtros, lista, etc.) não foram encontrados.');
        return;
    }

    const renderHistory = (historyEntries) => {
        historyListContainer.innerHTML = '';

        if (!historyEntries || historyEntries.length === 0) {
            historyListContainer.innerHTML = `<div class="placeholder-text">Nenhum pedido no histórico para este período.</div>`;
            return;
        }

        const header = document.createElement('div');
        header.className = 'suggestion-header no-actions';
        header.innerHTML = `
            <div>Data</div>
            <div>Música</div>
            <div>Solicitante</div>
            <div>Identificador</div>
        `;
        historyListContainer.appendChild(header);

        historyEntries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'suggestion-item no-actions';
            const date = new Date(entry.created_at).toLocaleString('pt-BR');
            const musicText = `${entry.song_title} - ${entry.artist_name}`;
            const requesterType = entry.requester_type ? entry.requester_type.toUpperCase() : 'N/A';
            
            item.innerHTML = `
                <div>${date}</div>
                <div>${musicText}</div>
                <div>${requesterType}</div>
                <div>${entry.requester_identifier || '-'}</div>
            `;
            historyListContainer.appendChild(item);
        });
    };

    const fetchAndRenderHistory = async () => {
        historyListContainer.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
        
        const month = monthFilter.value;
        const year = yearFilter.value;
        const url = `/request-history?month=${month}&year=${year}`;

        try {
            const historyData = await apiFetch(url);
            renderHistory(historyData);
        } catch (error) {
            historyListContainer.innerHTML = `<div class="placeholder-text error">Erro ao carregar o histórico.</div>`;
            console.error("Erro ao buscar histórico de pedidos:", error);
        }
    };

    const setupHistoryFilter = () => {
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        monthFilter.innerHTML = months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
        
        const currentYear = new Date().getFullYear();
        yearFilter.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            yearFilter.add(new Option(year, year));
        }
        
        monthFilter.value = new Date().getMonth() + 1;
        yearFilter.value = currentYear;
        
        filterBtn.addEventListener('click', () => filterPopup.classList.toggle('hidden'));
        monthFilter.addEventListener('change', fetchAndRenderHistory);
        yearFilter.addEventListener('change', fetchAndRenderHistory);
    };

    historyBtn.addEventListener('click', () => {
        consultBansSection.classList.add('hidden');
        historySection.classList.remove('hidden');
        fetchAndRenderHistory();
    });

    closeHistoryBtn.addEventListener('click', () => {
        historySection.classList.add('hidden');
    });

    
    setupHistoryFilter();
});