document.addEventListener('DOMContentLoaded', () => {
    const historySection = document.getElementById('history-section');

    const renderHistory = (historyData) => {
        historySection.innerHTML = '';
        if (!historyData || historyData.length === 0) {
            historySection.innerHTML = '<p>Nenhum sorteio no histórico.</p>';
            return;
        }

        historyData.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const drawDate = new Date(item.draw_date).toLocaleString('pt-BR');
            const drawnLockers = JSON.parse(item.drawn_lockers);
            
            let lockersHtml = '';
            if (drawnLockers && drawnLockers.length > 0) {
                lockersHtml = drawnLockers.map(locker => `
                    <div class="locker-card ${locker.redeemed ? 'redeemed' : ''}">
                        <div class="locker-number">${String(locker.locker_number).padStart(3, '0')}</div>
                        <div class="locker-size">${locker.locker_size}</div>
                        <div class="print-observation">${locker.observation || ''}</div>
                    </div>
                `).join('');
            }

            historyItem.innerHTML = `
                <div class="history-header">
                    <span class="history-date">${drawDate}</span>
                </div>
                <div class="history-body">
                    ${lockersHtml || '<p>Nenhum armário neste sorteio.</p>'}
                </div>
            `;
            historySection.appendChild(historyItem);
        });
    };

    const loadHistory = async () => {
        try {
            const historyData = await apiFetch('/roller/history');
            renderHistory(historyData);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            historySection.innerHTML = '<p>Erro ao carregar o histórico.</p>';
        }
    };

    loadHistory();
});