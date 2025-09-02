document.addEventListener('DOMContentLoaded', () => {
    const contentDisplay = document.getElementById('content-display');
    const googleReviewTemplate = document.getElementById('google-review-template');
    const twitterRepostTemplate = document.getElementById('twitter-repost-template');

    let currentItemIndex = 0;
    let combinedData = [];
    let displayInterval = null;

    const detectLocation = () => {
        const pathname = window.location.pathname.toLowerCase();
        return pathname.includes('bh') ? 'bh' : 'sp';
    };

    const locationSlug = detectLocation();

    const fetchContent = async () => {
        try {
            console.log('Buscando novo conteúdo...');
            const [reviews, tweets] = await Promise.all([
                apiFetch(`/webrating/reviews/${locationSlug}`),
                apiFetch(`/webrating/tweets/${locationSlug}`)
            ]);

            const reviewData = (reviews || []).map(item => ({ type: 'review', ...item }));
            const tweetData = (tweets || []).map(item => ({ type: 'tweet', ...item }));

            combinedData = [...reviewData, ...tweetData].sort(() => Math.random() - 0.5);
            
            console.log(`Conteúdo atualizado: ${combinedData.length} itens.`);

            if (combinedData.length > 0) {
                currentItemIndex = 0;
                renderContent();

                if(displayInterval) clearInterval(displayInterval);
                displayInterval = setInterval(renderContent, 15000); 
            } else {
                if(displayInterval) clearInterval(displayInterval);
                contentDisplay.innerHTML = '<p>Nenhum conteúdo para exibir no momento.</p>';
            }
        } catch (error) {
            console.error("Erro ao buscar conteúdo:", error);
            contentDisplay.innerHTML = '<p>Não foi possível carregar o conteúdo.</p>';
        }
    };

    const renderContent = () => {
        if (combinedData.length === 0) return;

        const item = combinedData[currentItemIndex];
        contentDisplay.style.opacity = 0;

        setTimeout(() => {
            if (item.type === 'review') {
                renderGoogleReview(item);
            } else if (item.type === 'tweet') {
                renderTwitterRepost(item);
            }
            contentDisplay.style.opacity = 1;
            currentItemIndex = (currentItemIndex + 1) % combinedData.length;
        }, 500);
    };

    const renderGoogleReview = (data) => {
        const clone = googleReviewTemplate.content.cloneNode(true);
        
        const firstName = data.author ? data.author.split(' ')[0] : 'Anônimo';
        clone.querySelector('.user-name').textContent = firstName;

        clone.querySelector('.review-date').textContent = data.date;
        clone.querySelector('.review-text').textContent = `"${data.text}"`;
        clone.querySelector('.user-photo').src = data.profile_photo_url || 'assets/img/default-avatar.png';
        
        const starsContainer = clone.querySelector('.stars');
        starsContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('i');
            star.className = 'fas fa-star';
            starsContainer.appendChild(star);
        }

        contentDisplay.innerHTML = '';
        contentDisplay.appendChild(clone);
    };

    const renderTwitterRepost = (data) => {
        const clone = twitterRepostTemplate.content.cloneNode(true);
        clone.querySelector('.user-name').textContent = `@${data.author}`;
        clone.querySelector('.tweet-date').textContent = data.date;
        clone.querySelector('.tweet-text').textContent = data.text;
        clone.querySelector('.user-photo').src = data.profile_photo_url || 'assets/img/default-avatar.png';

        const mediaContainer = clone.querySelector('.tweet-media-container');
        mediaContainer.innerHTML = '';

        try {
            const mediaUrls = JSON.parse(data.image_url || '[]');
            if (mediaUrls.length > 0) {
                mediaContainer.classList.toggle('multiple', mediaUrls.length > 1);
                mediaUrls.forEach(url => {
                    let mediaElement;
                    if (url.endsWith('.mp4')) {
                        mediaElement = document.createElement('video');
                        mediaElement.autoplay = true;
                        mediaElement.muted = true;
                        mediaElement.loop = true;
                        mediaElement.playsInline = true;
                    } else {
                        mediaElement = document.createElement('img');
                    }
                    mediaElement.src = url;
                    mediaContainer.appendChild(mediaElement);
                });
            }
        } catch (e) {
            console.error("Erro ao processar mídias do tweet:", e);
        }

        contentDisplay.innerHTML = '';
        contentDisplay.appendChild(clone);
    };

    fetchContent();

    const socket = io();
    socket.on('reviews:updated', (data) => {
        console.log("Evento 'reviews:updated' recebido!", data);
        if (data.location === locationSlug) {
            fetchContent();
        }
    });
});