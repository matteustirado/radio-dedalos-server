document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    const validRoles = ['admin', 'master', 'playlist_creator', 'musics'];
    if (!validRoles.includes(getUserRole())) {
        alert('Acesso negado.');
        window.location.href = '/';
        return;
    }

    const addTweetForm = document.getElementById('add-tweet-form');
    const tweetsListBody = document.getElementById('tweets-list-body');
    const logoutBtn = document.getElementById('logout-btn');
    const messageAlertEl = document.getElementById('success-message');
    const messageTextEl = document.getElementById('success-text');
    const submitBtn = document.getElementById('submit-tweet-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    const submitSpinner = document.getElementById('submit-spinner');

    const showMessage = (message, type = 'success') => {
        messageTextEl.textContent = message;
        messageAlertEl.classList.remove('success-alert', 'danger-alert', 'hidden');
        messageAlertEl.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        setTimeout(() => messageAlertEl.classList.add('hidden'), 4000);
    };

    const renderTweets = (tweets) => {
        tweetsListBody.innerHTML = '';
        if (!tweets || tweets.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="text-center" style="padding: 2rem;">Nenhum repost cadastrado.</td>`;
            tweetsListBody.appendChild(row);
            return;
        }
        tweets.forEach(tweet => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tweet.author}</td>
                <td>${tweet.text ? tweet.text.substring(0, 50) + '...' : '<i>Texto não disponível</i>'}</td>
                <td>${tweet.location_slug.toUpperCase()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="button danger-button small icon-only delete-tweet-btn" data-id="${tweet.id}" title="Excluir">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            tweetsListBody.appendChild(row);
        });
    };

    const loadTweets = async () => {
        try {
            const [spTweets, bhTweets] = await Promise.all([
                apiFetch('/tweets/sp'),
                apiFetch('/tweets/bh')
            ]);
            const allTweets = [...spTweets, ...bhTweets].sort((a, b) => b.id - a.id);
            renderTweets(allTweets);
        } catch (error) {
            showMessage('Erro ao carregar os reposts.', 'danger');
        }
    };

    addTweetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtnText.classList.add('hidden');
        submitSpinner.classList.remove('hidden');
        submitBtn.disabled = true;

        const payload = {
            tweetUrl: document.getElementById('tweet-url').value,
            location_slug: document.getElementById('tweet-location').value
        };

        try {
            await apiFetch('/tweets/scrape', { method: 'POST', body: JSON.stringify(payload) });
            showMessage('Repost adicionado com sucesso!');
            addTweetForm.reset();
            loadTweets();
        } catch (error) {
            showMessage(`Erro ao adicionar: ${error.message}`, 'danger');
        } finally {
            submitBtnText.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    tweetsListBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-tweet-btn');
        if (deleteBtn) {
            const tweetId = deleteBtn.dataset.id;
            if (confirm('Tem certeza que deseja excluir este repost?')) {
                try {
                    await apiFetch(`/tweets/${tweetId}`, { method: 'DELETE' });
                    showMessage('Repost excluído com sucesso.');
                    loadTweets();
                } catch (error) {
                    showMessage(`Erro ao excluir: ${error.message}`, 'danger');
                }
            }
        }
    });

    logoutBtn.addEventListener('click', logout);
    loadTweets();
});