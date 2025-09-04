document.addEventListener('DOMContentLoaded', () => {
    const triggerButton = document.getElementById('trigger-button');
    const simulateButton = document.getElementById('simulate-button');
    const statusMessage = document.getElementById('status-message');

    if (triggerButton) {
        triggerButton.addEventListener('click', async () => {
            statusMessage.textContent = 'Enviando gatilho de votação...';
            statusMessage.className = 'status';
            triggerButton.disabled = true;
            try {
                const response = await apiFetch('/game/trigger-vote', { method: 'POST' });
                statusMessage.textContent = response.message || 'Gatilho enviado com sucesso!';
                statusMessage.classList.add('success');
            } catch (error) {
                statusMessage.textContent = `Erro: ${error.message}`;
                statusMessage.classList.add('error');
            } finally {
                setTimeout(() => {
                    triggerButton.disabled = false;
                    statusMessage.textContent = '';
                    statusMessage.className = 'status';
                }, 3000);
            }
        });
    }

    if (simulateButton) {
        simulateButton.addEventListener('click', async () => {
            statusMessage.textContent = 'Enviando dados simulados...';
            statusMessage.className = 'status';
            simulateButton.disabled = true;
            const payload = {
                votes: {
                    versatil: parseInt(document.getElementById('sim-versatil').value, 10) || 0,
                    passivo: parseInt(document.getElementById('sim-passivo').value, 10) || 0,
                    ativo: parseInt(document.getElementById('sim-ativo').value, 10) || 0,
                    curioso: parseInt(document.getElementById('sim-curioso').value, 10) || 0,
                    beber_curtir: parseInt(document.getElementById('sim-beber_curtir').value, 10) || 0,
                    so_amizade: parseInt(document.getElementById('sim-so_amizade').value, 10) || 0,
                },
                capacity: parseInt(document.getElementById('sim-capacity').value, 10) || 0,
            };
            try {
                const response = await apiFetch('/game/simulate-placard', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                statusMessage.textContent = response.message || 'Simulação enviada com sucesso!';
                statusMessage.classList.add('success');
            } catch (error) {
                statusMessage.textContent = `Erro: ${error.message}`;
                statusMessage.classList.add('error');
            } finally {
                setTimeout(() => {
                    simulateButton.disabled = false;
                    statusMessage.textContent = '';
                    statusMessage.className = 'status';
                }, 3000);
            }
        });
    }
});