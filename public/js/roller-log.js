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
            historyItem.id = `draw-${item.id}`;

            const drawDate = new Date(item.draw_date).toLocaleString('pt-BR');
            const drawnLockers = item.drawn_lockers;
            
            let lockersHtml = '';
            let printTableRows = '';

            if (drawnLockers && drawnLockers.length > 0) {
                lockersHtml = drawnLockers.map(locker => `
                    <div class="locker-card ${locker.redeemed ? 'redeemed' : ''}">
                        <div class="locker-number">${String(locker.locker_number).padStart(3, '0')}</div>
                        <div class="locker-size">${locker.locker_size}</div>
                    </div>
                `).join('');

                printTableRows = drawnLockers.map(locker => `
                    <tr>
                        <td>${String(locker.locker_number).padStart(3, '0')} (${locker.locker_size})</td>
                        <td>${locker.observation || ''}</td>
                        <td></td>
                    </tr>
                `).join('');
            }

            historyItem.innerHTML = `
                <div class="history-header">
                    <div class="history-header-info">
                        <i class="fas fa-chevron-down expand-icon"></i>
                        <span class="history-date">${drawDate}</span>
                    </div>
                    <button class="button primary-button small icon-only print-btn" title="Imprimir este sorteio">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
                <div class="history-body">
                    <div class="drawn-lockers-grid">
                        ${lockersHtml || '<p>Nenhum armário neste sorteio.</p>'}
                    </div>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Armário</th>
                                <th>Observação</th>
                                <th>Anotações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printTableRows}
                        </tbody>
                    </table>
                </div>
            `;
            historySection.appendChild(historyItem);
        });
    };

    const setupEventListeners = () => {
        historySection.addEventListener('click', (e) => {
            const header = e.target.closest('.history-header');
            const printButton = e.target.closest('.print-btn');

            if (printButton) {
                e.stopPropagation();
                const itemToPrint = e.target.closest('.history-item');
                if (itemToPrint) {
                    document.body.classList.add('printing-section');
                    itemToPrint.classList.add('printing-section');
                    window.print();
                    document.body.classList.remove('printing-section');
                    itemToPrint.classList.remove('printing-section');
                }
                return;
            }

            if (header) {
                const item = header.closest('.history-item');
                item.classList.toggle('expanded');
            }
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
    setupEventListeners();
});