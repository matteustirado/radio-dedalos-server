document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    if (getUserRole() !== 'master') {
        alert('Acesso negado. Esta área é restrita para o usuário Master.');
        window.location.href = '/';
        return;
    }

    let users = [];
    let allReports = [];
    let allLogs = [];
    let currentUserId = null; 
    let itemToDelete = null;

    const listUsersView = document.getElementById('list-users-view');
    const addUserView = document.getElementById('add-user-view');
    const editUserView = document.getElementById('edit-user-view');
    const usersList = document.getElementById('users-list');
    const reportsList = document.getElementById('reports-list');
    const accessLogsTable = document.getElementById('access-logs');
    const showAddViewBtn = document.getElementById('show-add-view-btn');
    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const logoutBtn = document.getElementById('logout-btn');
    const deleteModal = document.getElementById('delete-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const reportsFilterBtn = document.getElementById('reports-filter-btn');
    const reportsFilterPopup = document.getElementById('reports-filter-popup');
    const filterStatus = document.getElementById('filter-status');
    const filterCategory = document.getElementById('filter-category');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const logsFilterBtn = document.getElementById('logs-filter-btn');
    const logsFilterPopup = document.getElementById('logs-filter-popup');
    const filterMonth = document.getElementById('filter-month');
    const filterYear = document.getElementById('filter-year');
    const resetLogsFilterBtn = document.getElementById('reset-logs-filter-btn');
    const messageAlertEl = document.getElementById('success-message');
    const messageTextEl = document.getElementById('success-text');
    const allViews = [addUserView, editUserView];
    const newRoleSelect = document.getElementById('new-role');
    const newFilialGroup = document.getElementById('new-filial-group');
    const newFilialSelect = document.getElementById('new-filial');
    const editRoleSelect = document.getElementById('edit-role');
    const editFilialGroup = document.getElementById('edit-filial-group');
    const editFilialSelect = document.getElementById('edit-filial');

    const roleDescriptionMap = {
        master: 'Controle total do sistema e gerenciamento de usuários.',
        admin: 'Gerencia todo o acervo de músicas e artistas da rádio.',
        playlist_creator: 'Cria e gerencia as playlists padrão, diárias e especiais.',
        dj: 'Controla a Rádio Dedalos em tempo real.',
        adm_tabela_sp: 'Gerencia e atualiza a tabela de preços e promoções de São Paulo.',
        adm_tabela_bh: 'Gerencia e atualiza a tabela de preços e promoções de Belo Horizonte.',
        jukebox_user_sp: 'Permite a solicitação de músicas através do painel Jukebox de São Paulo.',
        jukebox_user_bh: 'Permite a solicitação de músicas através do painel Jukebox de Belo Horizonte.',
        view_tabela_sp: 'Login para visualização direta da tabela de preços de São Paulo.',
        view_tabela_bh: 'Login para visualização direta da tabela de preços de Belo Horizonte.'
    };

    const rolesThatNeedFilial = ['adm_tabela', 'jukebox_user', 'view_tabela'];

    const showMessage = (message, type = 'success') => {
        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert', 'hidden');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };

    const showListView = () => {
        allViews.forEach(view => view.classList.add('hidden'));
        if (listUsersView) listUsersView.classList.remove('hidden');
    };

    const showView = (viewToShow) => {
        if (listUsersView) listUsersView.classList.add('hidden');
        if (viewToShow) viewToShow.classList.remove('hidden');
    };

    const renderUsers = (usersData) => {
        if (!usersList) return;
        usersList.innerHTML = '';
        usersData.forEach(user => {
            const row = document.createElement('tr');
            const description = roleDescriptionMap[user.role] || user.role;
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td class="description-cell description-minimized" title="Clique para expandir">${description}</td>
                <td>
                    <div class="action-buttons">
                        <button class="button primary-button small icon-only edit-user-btn" data-id="${user.id}" title="Editar"><i class="fas fa-user-edit"></i></button>
                        <button class="button danger-button small icon-only delete-user-btn" data-id="${user.id}" data-name="${user.username}" title="Excluir"><i class="fas fa-trash-can"></i></button>
                    </div>
                </td>`;
            usersList.appendChild(row);
        });
    };

    const loadUsers = async () => {
        try {
            users = await apiFetch('/users');
            renderUsers(users);
        } catch (error) {
            showMessage(`Erro ao carregar usuários: ${error.message}`, 'danger');
        }
    };

    const renderReports = (reports) => {
        if (!reportsList) return;
        reportsList.innerHTML = '';
        reports.forEach(report => {
            const row = document.createElement('tr');
            const statusClass = { 'pendente': 'status-warning', 'em_analise': 'status-info', 'resolvido': 'status-success' }[report.status] || '';
            const statusOptions = ['pendente', 'em_analise', 'resolvido'];
            const selectOptions = statusOptions.map(opt => `<option value="${opt.replace(' ', '_')}" ${report.status === opt ? 'selected' : ''}>${opt.replace('_', ' ')}</option>`).join('');
            row.innerHTML = `<td>${new Date(report.reported_at).toLocaleString('pt-BR')}</td><td>${report.category}</td><td><div class="description-cell description-minimized" title="Clique para expandir">${report.description}</div></td><td><select class="status-select ${statusClass}" data-id="${report.id}">${selectOptions}</select></td>`;
            reportsList.appendChild(row);
        });
    };

    const populateCategoryFilter = () => {
        const categories = [...new Set(allReports.map(report => report.category))];
        filterCategory.innerHTML = '<option value="">Todas</option>';
        categories.sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategory.appendChild(option);
        });
    };

    const applyAndRenderReports = () => {
        const status = filterStatus.value;
        const category = filterCategory.value;
        let filteredReports = [...allReports];
        if (status) {
            filteredReports = filteredReports.filter(r => r.status === status);
        }
        if (category) {
            filteredReports = filteredReports.filter(r => r.category === category);
        }
        renderReports(filteredReports);
    };

    const loadReports = async () => {
        try {
            allReports = await apiFetch('/reports');
            populateCategoryFilter();
            applyAndRenderReports();
        } catch (error) {
            showMessage(`Erro ao carregar relatórios: ${error.message}`, 'danger');
        }
    };

    const renderAccessLogs = (logs) => {
        if (!accessLogsTable) return;
        accessLogsTable.innerHTML = '';
        logs.forEach(log => {
            const row = document.createElement('tr');
            let details = {};
            if (log.details) {
                try {
                    const parsed = JSON.parse(log.details);
                    if (parsed && typeof parsed === 'object') {
                        details = parsed;
                    }
                } catch (e) {}
            }
            let detailsString = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(', ');
            row.innerHTML = `<td>${new Date(log.created_at).toLocaleString('pt-BR')}</td><td>${log.username}</td><td>${log.ip_address || 'N/A'}</td><td>${log.action} ${detailsString ? `(${detailsString})` : ''}</td>`;
            accessLogsTable.appendChild(row);
        });
    };

    const populateLogFilters = () => {
        const years = [...new Set(allLogs.map(log => new Date(log.created_at).getFullYear()))];
        filterYear.innerHTML = '';
        years.sort((a, b) => b - a).forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYear.appendChild(option);
        });
        const now = new Date();
        filterMonth.value = now.getMonth();
        filterYear.value = now.getFullYear();
    };

    const applyAndRenderLogs = () => {
        const month = parseInt(filterMonth.value, 10);
        const year = parseInt(filterYear.value, 10);
        const filteredLogs = allLogs.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate.getMonth() === month && logDate.getFullYear() === year;
        });
        renderAccessLogs(filteredLogs);
    };

    const loadLogs = async () => {
        try {
            allLogs = await apiFetch('/logs');
            populateLogFilters();
            applyAndRenderLogs();
        } catch (error) {
            showMessage(`Erro ao carregar logs: ${error.message}`, 'danger');
        }
    };

    const handleRoleChange = (roleSelect, filialGroup) => {
        const selectedRole = roleSelect.value;
        filialGroup.classList.toggle('hidden', !rolesThatNeedFilial.includes(selectedRole));
    };

    newRoleSelect.addEventListener('change', () => handleRoleChange(newRoleSelect, newFilialGroup));
    editRoleSelect.addEventListener('change', () => handleRoleChange(editRoleSelect, editFilialGroup));

    if (showAddViewBtn) {
        showAddViewBtn.addEventListener('click', () => {
            if (addUserForm) addUserForm.reset();
            handleRoleChange(newRoleSelect, newFilialGroup);
            showView(addUserView);
        });
    }

    document.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', showListView));

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('new-username').value;
            const baseRole = newRoleSelect.value;
            const password = document.getElementById('new-password').value;
            let finalRole = baseRole;
            let filial = null;

            if (rolesThatNeedFilial.includes(baseRole)) {
                filial = newFilialSelect.value;
                finalRole = `${baseRole}_${filial}`;
            }
            
            const description = roleDescriptionMap[finalRole];
            const payload = { username, password, role: finalRole, description, filial };

            try {
                await apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) });
                showMessage('Usuário adicionado com sucesso!');
                await loadUsers();
                showListView();
            } catch (error) {
                showMessage(`Erro ao adicionar usuário: ${error.message}`, 'danger');
            }
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('edit-username').value;
            const baseRole = editRoleSelect.value;
            const password = document.getElementById('edit-password').value;
            let finalRole = baseRole;
            let filial = null;

            if (rolesThatNeedFilial.includes(baseRole)) {
                filial = editFilialSelect.value;
                finalRole = `${baseRole}_${filial}`;
            }
            
            const description = roleDescriptionMap[finalRole];
            const payload = { username, role: finalRole, description, filial };
            if (password) payload.password = password;

            try {
                await apiFetch(`/users/${currentUserId}`, { method: 'PUT', body: JSON.stringify(payload) });
                showMessage('Usuário atualizado com sucesso!');
                await loadUsers();
                showListView();
            } catch (error) {
                showMessage(`Erro ao atualizar usuário: ${error.message}`, 'danger');
            }
        });
    }

    if (usersList) {
        usersList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-user-btn');
            if (editBtn) {
                currentUserId = parseInt(editBtn.dataset.id);
                const user = users.find(u => u.id === currentUserId);
                if (user) {
                    const roleParts = user.role.split('_');
                    const baseRole = rolesThatNeedFilial.includes(roleParts[0]) ? roleParts[0] : user.role;
                    const filial = user.filial || (roleParts.length > 1 && rolesThatNeedFilial.includes(baseRole) ? roleParts.slice(1).join('_') : null);

                    document.getElementById('edit-username').value = user.username;
                    editRoleSelect.value = baseRole;
                    
                    handleRoleChange(editRoleSelect, editFilialGroup);
                    
                    if (filial) {
                        editFilialSelect.value = filial;
                    }
                    
                    document.getElementById('edit-password').value = '';
                    showView(editUserView);
                }
            }

            const deleteBtn = e.target.closest('.delete-user-btn');
            if (deleteBtn) {
                const userId = parseInt(deleteBtn.dataset.id);
                const userName = deleteBtn.dataset.name;
                itemToDelete = { id: userId, name: userName };
                deleteModalTitle.textContent = 'Confirmar Exclusão de Usuário';
                deleteModalText.textContent = `Tem certeza que deseja excluir o usuário "${userName}"?`;
                deleteModal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            }
        });
    }
    
    if (reportsList) {
        reportsList.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-select')) {
                const reportId = e.target.dataset.id;
                const newStatus = e.target.value;
                try {
                    await apiFetch(`/reports/${reportId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
                    await loadReports();
                } catch (error) {
                    showMessage(`Erro ao atualizar status: ${error.message}`, 'danger');
                }
            }
        });

        reportsList.addEventListener('click', (e) => {
            const descriptionCell = e.target.closest('.description-cell');
            if (descriptionCell) {
                descriptionCell.classList.toggle('description-minimized');
                const isMinimized = descriptionCell.classList.contains('description-minimized');
                descriptionCell.title = isMinimized ? 'Clique para expandir' : 'Clique para minimizar';
            }
        });
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            itemToDelete = null;
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!itemToDelete) return;
            try {
                await apiFetch(`/users/${itemToDelete.id}`, { method: 'DELETE' });
                showMessage('Usuário excluído com sucesso!');
                await loadUsers();
            } catch (error) {
                showMessage(`Erro ao excluir usuário: ${error.message}`, 'danger');
            } finally {
                deleteModal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                itemToDelete = null;
            }
        });
    }

    if (reportsFilterBtn) reportsFilterBtn.addEventListener('click', () => reportsFilterPopup.classList.toggle('hidden'));
    if (filterStatus) filterStatus.addEventListener('change', applyAndRenderReports);
    if (filterCategory) filterCategory.addEventListener('change', applyAndRenderReports);
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            filterStatus.value = '';
            filterCategory.value = '';
            applyAndRenderReports();
        });
    }
    
    if (logsFilterBtn) logsFilterBtn.addEventListener('click', () => logsFilterPopup.classList.toggle('hidden'));
    if (filterMonth) filterMonth.addEventListener('change', applyAndRenderLogs);
    if (filterYear) filterYear.addEventListener('change', applyAndRenderLogs);
    if (resetLogsFilterBtn) {
        resetLogsFilterBtn.addEventListener('click', () => {
            const now = new Date();
            filterMonth.value = now.getMonth();
            filterYear.value = now.getFullYear();
            applyAndRenderLogs();
        });
    }

    document.addEventListener('click', (e) => {
        if (reportsFilterPopup && !reportsFilterBtn.contains(e.target) && !reportsFilterPopup.contains(e.target)) {
            reportsFilterPopup.classList.add('hidden');
        }
        if (logsFilterPopup && !logsFilterBtn.contains(e.target) && !logsFilterPopup.contains(e.target)) {
            logsFilterPopup.classList.add('hidden');
        }
    });

    const initialize = async () => {
        await loadUsers();
        await loadLogs(); 
        await loadReports();
        showListView();
    };

    initialize();
});