document.addEventListener('DOMContentLoaded', () => {
    const startDrawBtn = document.getElementById('start-draw-btn');
    const printBtn = document.getElementById('print-btn');
    const clearDrawBtn = document.getElementById('clear-draw-btn');
    const drawnLockersContainer = document.getElementById('drawn-lockers-container');
    const observationModal = document.getElementById('observation-modal');
    const modalTitle = document.getElementById('modal-title');
    const observationText = document.getElementById('observation-text');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const confirmModalBtn = document.getElementById('confirm-modal-btn');

    let currentDraw = [];
    let selectedLockerId = null;

    const renderDraw = (lockers) => {
        drawnLockersContainer.innerHTML = '';
        if (!lockers || lockers.length === 0) {
            startDrawBtn.classList.remove('hidden');
            printBtn.classList.add('hidden');
            clearDrawBtn.classList.add('hidden');
            return;
        }

        startDrawBtn.classList.add('hidden');
        printBtn.classList.remove('hidden');
        clearDrawBtn.classList.remove('hidden');

        lockers.forEach(locker => {
            const card = document.createElement('div');
            card.className = 'locker-card';
            card.classList.toggle('redeemed', locker.redeemed);
            card.dataset.id = locker.id;
            card.innerHTML = `
                <div class="locker-number">${String(locker.locker_number).padStart(3, '0')}</div>
                <div class="locker-size">${locker.locker_size}</div>
                <div class="print-observation">${locker.observation || ''}</div>
            `;
            drawnLockersContainer.appendChild(card);
        });
    };

    const loadCurrentDraw = async () => {
        try {
            currentDraw = await apiFetch('/roller');
            renderDraw(currentDraw);
        } catch (error) {
            console.error('Erro ao carregar sorteio:', error);
        }
    };

    startDrawBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja iniciar um novo sorteio? O sorteio anterior será limpo.')) {
            try {
                await apiFetch('/roller/clear', { method: 'DELETE' });
                currentDraw = await apiFetch('/roller/start', { method: 'POST' });
                renderDraw(currentDraw);
            } catch (error) {
                alert(`Erro ao iniciar sorteio: ${error.message}`);
            }
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });

    clearDrawBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja limpar o sorteio? Ele será salvo no histórico.')) {
            try {
                await apiFetch('/roller/clear', { method: 'DELETE' });
                currentDraw = [];
                renderDraw(currentDraw);
            } catch (error) {
                alert(`Erro ao limpar sorteio: ${error.message}`);
            }
        }
    });

    drawnLockersContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.locker-card');
        if (card) {
            selectedLockerId = parseInt(card.dataset.id, 10);
            const locker = currentDraw.find(l => l.id === selectedLockerId);
            if (locker) {
                modalTitle.textContent = `Observações do Armário #${String(locker.locker_number).padStart(3, '0')}`;
                observationText.value = locker.observation || '';
                observationModal.classList.remove('hidden');
            }
        }
    });

    cancelModalBtn.addEventListener('click', () => {
        observationModal.classList.add('hidden');
        selectedLockerId = null;
    });

    confirmModalBtn.addEventListener('click', async () => {
        if (selectedLockerId) {
            try {
                const observation = observationText.value;
                await apiFetch(`/roller/locker/${selectedLockerId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ observation, redeemed: true })
                });
                observationModal.classList.add('hidden');
                await loadCurrentDraw();
            } catch (error) {
                alert(`Erro ao salvar observação: ${error.message}`);
            }
        }
    });

    loadCurrentDraw();
});