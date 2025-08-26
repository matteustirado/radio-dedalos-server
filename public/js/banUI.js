document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('consult-bans-btn')) {
        return;
    }

    const consultBansBtn = document.getElementById('consult-bans-btn');
    const closeBansBtn = document.querySelector('#consult-bans-section .close-section-btn');
    const bansSection = document.getElementById('consult-bans-section');
    const banTabButtons = document.querySelectorAll('#consult-bans-section .tab-btn');
    
    let activeBanTab = 'pendente';

    const renderBanRequests = (banRequests, container) => {
        const listContent = container.querySelector('.list-content') || container;
        listContent.innerHTML = '';

        if (!banRequests || banRequests.length === 0) {
            listContent.innerHTML = `<div class="placeholder-text">Nenhuma solicitação de banimento encontrada para esta categoria.</div>`;
            return;
        }

        const header = document.createElement('div');
        header.className = 'suggestion-header';
        let columnsClass = 'with-actions';

        if (activeBanTab === 'pendente') {
            header.innerHTML = `<div>Data</div><div>Música</div><div>Solicitante</div><div>Período</div><div>Status</div><div>Ações</div>`;
            header.style.gridTemplateColumns = '1.5fr 3fr 1.5fr 1fr 1fr 1fr';
        } else {
            header.innerHTML = `<div>Data</div><div>Música</div><div>Solicitante</div><div>Período</div><div>Status</div>`;
            header.style.gridTemplateColumns = '1.5fr 3fr 1.5fr 1fr 1fr';
            columnsClass = 'no-actions';
        }
        listContent.appendChild(header);

        banRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = `suggestion-item ${columnsClass}`;
            item.dataset.id = req.id;
            item.style.gridTemplateColumns = header.style.gridTemplateColumns;


            const date = new Date(req.banned_at).toLocaleString('pt-BR');
            const musicText = `${req.song_title} - ${req.artist_name}`;
            const statusTag = req.is_active ? 
                '<span class="status-tag active">Ativo</span>' : 
                '<span class="status-tag draft">Inativo</span>';

            let itemHTML = `
                <div>${date}</div>
                <div>${musicText}</div>
                <div>${req.user_name || '-'}</div>
                <div>${req.ban_period || '-'}</div>
                <div>${statusTag}</div>`;

            if (activeBanTab === 'pendente') {
                itemHTML += `
                    <div>
                        <div class="action-buttons">
                            <button class="button success-button small icon-only accept-ban-btn" title="Aceitar"><i class="fas fa-check"></i></button>
                            <button class="button danger-button small icon-only reject-ban-btn" title="Recusar"><i class="fas fa-times"></i></button>
                        </div>
                    </div>`;
            }
            item.innerHTML = itemHTML;
            listContent.appendChild(item);
        });
    };

    const fetchAndRenderBanRequests = async () => {
        const listContainer = document.getElementById(`${activeBanTab}-bans-list`);
        if (!listContainer) return;

        let url = `/bans?status=${activeBanTab}`;
        
        const filterPopup = document.getElementById(`${activeBanTab}-bans-filter-popup`);
        if (filterPopup) {
            const month = filterPopup.querySelector('select[id$="-month-filter"]').value;
            const year = filterPopup.querySelector('select[id$="-year-filter"]').value;
            if (month && year) {
                url += `&month=${month}&year=${year}`;
            }
        }
        
        const listContent = listContainer.querySelector('.list-content') || listContainer;
        listContent.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
        
        try {
            const banRequests = await apiFetch(url);
            renderBanRequests(banRequests, listContainer);
        } catch (error) {
            listContent.innerHTML = `<div class="placeholder-text error">Erro ao carregar solicitações.</div>`;
            console.error("Erro ao buscar solicitações de banimento:", error);
        }
    };

    const handleUpdateBanStatus = async (id, newStatus) => {
        try {
            await apiFetch(`/bans/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            fetchAndRenderBanRequests();
        } catch (error) {
            console.error(`Erro ao marcar banimento como '${newStatus}':`, error);
        }
    };

    const setupFilter = (type) => {
        const btn = document.getElementById(`${type}-bans-filter-btn`);
        const popup = document.getElementById(`${type}-bans-filter-popup`);
        if (!btn || !popup) return;

        const monthFilter = document.getElementById(`${type}-bans-month-filter`);
        const yearFilter = document.getElementById(`${type}-bans-year-filter`);
        
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
        
        btn.addEventListener('click', () => popup.classList.toggle('hidden'));
        monthFilter.addEventListener('change', fetchAndRenderBanRequests);
        yearFilter.addEventListener('change', fetchAndRenderBanRequests);
    };

    consultBansBtn.addEventListener('click', () => {
        document.getElementById('consult-history-section').classList.add('hidden'); 
        bansSection.classList.remove('hidden');
        activeBanTab = 'pendente';
        banTabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === 'pendente'));
        document.querySelectorAll('#consult-bans-section .suggestions-list').forEach(list => list.classList.add('hidden'));
        document.getElementById('pendente-bans-list').classList.remove('hidden');
        fetchAndRenderBanRequests();
    });

    closeBansBtn.addEventListener('click', () => {
        bansSection.classList.add('hidden');
    });

    banTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            banTabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeBanTab = btn.dataset.tab;
            document.querySelectorAll('#consult-bans-section .suggestions-list').forEach(list => list.classList.add('hidden'));
            document.getElementById(`${activeBanTab}-bans-list`).classList.remove('hidden');
            fetchAndRenderBanRequests();
        });
    });

    bansSection.addEventListener('click', (e) => {
        const acceptBtn = e.target.closest('.accept-ban-btn');
        const rejectBtn = e.target.closest('.reject-ban-btn');
        if (acceptBtn) {
            const id = acceptBtn.closest('.suggestion-item').dataset.id;
            handleUpdateBanStatus(id, 'aceita');
        }
        if (rejectBtn) {
            const id = rejectBtn.closest('.suggestion-item').dataset.id;
            handleUpdateBanStatus(id, 'recusada');
        }
    });

    setupFilter('aceita');
    setupFilter('recusada');
});