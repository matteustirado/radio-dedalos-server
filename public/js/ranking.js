document.addEventListener('DOMContentLoaded', () => {
    const podiumContainer = document.getElementById('podium-container');
    const artistNameInput = document.getElementById('artist-name');
    const autocompleteList = document.getElementById('artist-autocomplete-list');
    const wristbandCodeInput = document.getElementById('wristband-code');
    const cancelVoteBtn = document.getElementById('cancel-vote-btn');
    const submitVoteBtn = document.getElementById('submit-vote-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const voteSection = document.getElementById('vote-section');
    const rankingView = document.getElementById('ranking-view');
    const rankingList = document.getElementById('ranking-list');
    const voteFormWrapper = document.getElementById('vote-form-wrapper');
    const thankYouMessage = document.getElementById('thank-you-message');
    const voteConfirmationText = document.getElementById('vote-confirmation-text');

    let allArtists = [];
    const isClientCodeValid = ValidationConfig.getValidationFunction();
    const unit = ValidationConfig.unit;

    const resetSubmitButton = () => {
        submitVoteBtn.disabled = false;
        submitVoteBtn.classList.remove('error');
        wristbandCodeInput.classList.remove('error');
        submitBtnText.textContent = 'Enviar Voto';
        submitBtnText.classList.remove('hidden');
        submitSpinner.classList.add('hidden');
    };

    const renderPodium = (podiumData) => {
        podiumContainer.innerHTML = '';
        
        if (!podiumData || podiumData.length === 0) {
            podiumContainer.innerHTML = '<p class="placeholder-text">O ranking da semana anterior ainda não foi fechado. Vote no seu artista favorito para o ranking desta semana!</p>';
            return;
        }

        const places = [
            { artist: podiumData[1]?.artist_name || '-', medal: '🥈', order: 'podium-2' },
            { artist: podiumData[0]?.artist_name || '-', medal: '👑', order: 'podium-1' },
            { artist: podiumData[2]?.artist_name || '-', medal: '🥉', order: 'podium-3' }
        ];

        places.forEach((place, index) => {
            const step = document.createElement('div');
            step.className = 'podium-step';
            step.innerHTML = `
                <div class="podium-artist">${place.artist}</div>
                <div class="podium-base ${place.order}">
                    <span class="medal">${place.medal}</span>
                    ${index === 1 ? '1' : index === 0 ? '2' : '3'}
                </div>
            `;
            podiumContainer.appendChild(step);
        });
    };

    const renderRanking = (rankingData) => {
        rankingList.innerHTML = '';
        if (rankingData.length === 0) {
            rankingList.innerHTML = '<li class="placeholder-text">Ainda não há votos esta semana. Seja o primeiro!</li>';
            return;
        }

        rankingData.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'ranking-item';
            listItem.innerHTML = `
                <div class="ranking-position">${index + 1}º</div>
                <div class="ranking-artist">${item.artist_name}</div>
                <div class="ranking-votes">${item.vote_count} votos</div>
            `;
            rankingList.appendChild(listItem);
        });
    };
    
    const setupAutocomplete = () => {
        const container = artistNameInput.closest('.autocomplete-container');

        artistNameInput.addEventListener('input', () => {
            const term = artistNameInput.value.toLowerCase();
            autocompleteList.innerHTML = '';
            if (term.length < 1) {
                autocompleteList.classList.remove('show');
                return;
            }
            const filtered = allArtists.filter(a => a.name.toLowerCase().includes(term));
            filtered.slice(0, 5).forEach(artist => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = artist.name;
                item.addEventListener('mousedown', () => {
                    artistNameInput.value = artist.name;
                    autocompleteList.classList.remove('show');
                });
                autocompleteList.appendChild(item);
            });
            autocompleteList.classList.toggle('show', filtered.length > 0);
        });

        container.addEventListener('focusout', (e) => {
            if (!container.contains(e.relatedTarget)) {
                autocompleteList.classList.remove('show');
            }
        });
    };

    submitVoteBtn.addEventListener('click', async () => {
        const artistName = artistNameInput.value.trim();
        const wristbandCode = wristbandCodeInput.value.trim();

        if (!artistName || !wristbandCode) {
            alert('Preencha o nome do artista e o código da pulseira!');
            return;
        }

        const lastVoteTimestamp = localStorage.getItem(`ranking_cooldown_${wristbandCode}`);
        const oneHour = 60 * 60 * 1000;
        if (lastVoteTimestamp && (Date.now() - lastVoteTimestamp < oneHour)) {
            alert('Você já votou nesta última hora. Tente novamente mais tarde.');
            return;
        }

        submitBtnText.classList.add('hidden');
        submitSpinner.classList.remove('hidden');
        submitVoteBtn.disabled = true;

        const isValid = await isClientCodeValid(wristbandCode);
        if (!isValid) {
            wristbandCodeInput.classList.add('error');
            submitVoteBtn.classList.add('error');
            submitBtnText.textContent = 'Tentar Novamente';
            submitVoteBtn.disabled = false;
            submitBtnText.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
            return;
        }

        try {
            await apiFetch('/ranking/vote', {
                method: 'POST',
                body: JSON.stringify({
                    artist_name: artistName,
                    wristband_code: wristbandCode,
                    unit
                })
            });

            if (!ValidationConfig.isMasterCode(wristbandCode)) {
                localStorage.setItem(`ranking_cooldown_${wristbandCode}`, Date.now());
            }
            
            voteFormWrapper.classList.add('hidden');
            voteConfirmationText.textContent = `Seu voto para ${artistName} foi computado com sucesso!`;
            thankYouMessage.classList.remove('hidden');

            const currentRanking = await apiFetch(`/ranking?period=current_week&unit=${unit}`);
            renderRanking(currentRanking);
            rankingView.classList.remove('hidden');

        } catch (error) {
            alert('Erro ao registrar o voto. Tente novamente.');
            resetSubmitButton();
        }
    });

    wristbandCodeInput.addEventListener('input', () => {
        wristbandCodeInput.value = wristbandCodeInput.value.replace(/[^0-9]/g, '');
        if (wristbandCodeInput.classList.contains('error')) {
            resetSubmitButton();
        }
    });

    cancelVoteBtn.addEventListener('click', () => {
        const hubPage = unit === 'bh' ? '/hubTabBH.html' : '/hubTabSP.html';
        window.location.href = hubPage;
    });

    const initialize = async () => {
        try {
            const [podium, artists] = await Promise.all([
                apiFetch(`/ranking?period=previous_week&unit=${unit}`),
                apiFetch('/artists')
            ]);
            allArtists = artists;
            renderPodium(podium);
            setupAutocomplete();
            ValidationConfig.setupInactivityRedirect();
        } catch (error) {
            console.error(error);
            podiumContainer.innerHTML = '<p class="placeholder-text">Não foi possível carregar o ranking.</p>';
        }
    };

    initialize();
});