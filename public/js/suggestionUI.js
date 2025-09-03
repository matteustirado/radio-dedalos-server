document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('consult-suggestions-btn')) {
        return;
    }

    const consultSuggestionsBtn = document.getElementById('consult-suggestions-btn');
    const suggestionTabButtons = document.querySelectorAll('#consult-suggestions-section .tab-btn');
    const allMainSections = document.querySelectorAll('.form-section');
    
    let activeSuggestionTab = 'pendente';

    const openSection = (sectionId) => {
        allMainSections.forEach(sec => sec.classList.add('hidden'));
        const section = document.getElementById(sectionId);
        if (section) section.classList.remove('hidden');
    };

    const showMessage = (message, type = 'success') => {
        const messageAlertEl = document.getElementById('success-message');
        const messageTextEl = document.getElementById('success-text');
        if (!messageAlertEl || !messageTextEl) return;

        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        messageAlertEl.classList.remove('hidden');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };


    const renderSuggestions = (suggestions, container) => {
        const listContent = container.querySelector('.list-content') || container;
        listContent.innerHTML = '';
        if (suggestions.length === 0) {
            listContent.innerHTML = `<div class="placeholder-text">Nenhuma sugestão encontrada.</div>`;
            return;
        }
        const header = document.createElement('div');
        header.className = 'suggestion-header';
        let columnsClass = 'with-actions';
        if (activeSuggestionTab === 'pendente') {
            header.innerHTML = `<div>Data</div><div>Sugestão</div><div>Cliente</div><div>Unidade</div><div>Ações</div>`;
            header.className += ' with-actions';
        } else {
            header.innerHTML = `<div>Data</div><div>Sugestão</div><div>Cliente</div><div>Unidade</div>`;
            header.className += ' no-actions';
            columnsClass = 'no-actions';
        }
        listContent.appendChild(header);
        suggestions.forEach(sug => {
            const item = document.createElement('div');
            item.className = `suggestion-item ${columnsClass}`;
            item.dataset.id = sug.id;
            const date = new Date(sug.created_at).toLocaleString('pt-BR');
            const suggestionText = `${sug.song_title} - ${sug.artist_name}`;
            if (activeSuggestionTab === 'pendente') {
                item.innerHTML = `
                    <div>${date}</div>
                    <div>${suggestionText}</div>
                    <div>${sug.requester_info || '-'}</div>
                    <div>${sug.unit ? sug.unit.toUpperCase() : '-'}</div>
                    <div><div class="action-buttons"><button class="button success-button small icon-only accept-suggestion-btn" title="Aceitar"><i class="fas fa-check"></i></button><button class="button danger-button small icon-only reject-suggestion-btn" title="Recusar"><i class="fas fa-times"></i></button></div></div>`;
            } else {
                item.innerHTML = `
                    <div>${date}</div>
                    <div>${suggestionText}</div>
                    <div>${sug.requester_info || '-'}</div>
                    <div>${sug.unit ? sug.unit.toUpperCase() : '-'}</div>`;
            }
            listContent.appendChild(item);
        });
    };

    const fetchAndRenderSuggestions = async () => {
        const listContainer = document.getElementById(`${activeSuggestionTab}-list`);
        if (!listContainer) return;

        let url = `/suggestions?status=${activeSuggestionTab}`;
        const filterPopup = document.getElementById(`${activeSuggestionTab}-filter-popup`);

        if (activeSuggestionTab !== 'pendente' && filterPopup) {
            const month = filterPopup.querySelector('select[id$="-month-filter"]').value;
            const year = filterPopup.querySelector('select[id$="-year-filter"]').value;
            url += `&month=${month}&year=${year}`;
        }
        
        const listContent = listContainer.querySelector('.list-content') || listContainer;
        listContent.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
        
        try {
            const suggestions = await apiFetch(url);
            renderSuggestions(suggestions, listContainer);
        } catch (error) {
            listContent.innerHTML = `<div class="placeholder-text error">Erro ao carregar sugestões.</div>`;
            showMessage(error.message, 'danger');
        }
    };

    const handleUpdateSuggestionStatus = async (id, newStatus) => {
        try {
            await apiFetch(`/suggestions/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            showMessage(`Sugestão marcada como '${newStatus}' com sucesso!`);
            fetchAndRenderSuggestions();
        } catch (error) {
            showMessage(error.message, 'danger');
        }
    };

    const initializeSuggestions = () => {
        const setupFilter = (type) => {
            const btn = document.getElementById(`${type}-filter-btn`);
            const popup = document.getElementById(`${type}-filter-popup`);
            if (!btn || !popup) return;
            const monthFilter = document.getElementById(`${type}-month-filter`);
            const yearFilter = document.getElementById(`${type}-year-filter`);
            const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            monthFilter.innerHTML = months.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
            const currentYear = new Date().getFullYear();
            yearFilter.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const year = currentYear - i;
                yearFilter.add(new Option(year, year));
            }
            monthFilter.value = new Date().getMonth() + 1;
            yearFilter.value = currentYear;
            btn.addEventListener('click', () => popup.classList.toggle('hidden'));
            monthFilter.addEventListener('change', fetchAndRenderSuggestions);
            yearFilter.addEventListener('change', fetchAndRenderSuggestions);
        };
        
        setupFilter('aceita');
        setupFilter('recusada');

        consultSuggestionsBtn.addEventListener('click', () => {
            openSection('consult-suggestions-section');
            activeSuggestionTab = 'pendente';
            suggestionTabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === 'pendente'));
            document.querySelectorAll('.suggestions-list').forEach(list => list.classList.add('hidden'));
            document.getElementById('pendente-list').classList.remove('hidden');
            fetchAndRenderSuggestions();
        });

        suggestionTabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                suggestionTabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeSuggestionTab = btn.dataset.tab;
                document.querySelectorAll('.suggestions-list').forEach(list => list.classList.add('hidden'));
                document.getElementById(`${activeSuggestionTab}-list`).classList.remove('hidden');
                fetchAndRenderSuggestions();
            });
        });

        const suggestionsSection = document.getElementById('consult-suggestions-section');
        if (suggestionsSection) {
            suggestionsSection.addEventListener('click', (e) => {
                const acceptBtn = e.target.closest('.accept-suggestion-btn');
                const rejectBtn = e.target.closest('.reject-suggestion-btn');
                if (acceptBtn) {
                    const id = acceptBtn.closest('.suggestion-item').dataset.id;
                    handleUpdateSuggestionStatus(id, 'aceita');
                }
                if (rejectBtn) {
                    const id = rejectBtn.closest('.suggestion-item').dataset.id;
                    handleUpdateSuggestionStatus(id, 'recusada');
                }
            });
        }
    };

    initializeSuggestions();
});