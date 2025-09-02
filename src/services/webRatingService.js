const axios = require('axios');
const WebRatingModel = require('../api/models/webRatingModel');
const socketService = require('./socketService');

const locationDataIds = {
    sp: '0x94ce59b5e99f1d33:0x54f1f62982032e85',
    bh: '0xa699d94276985b:0x417aab966c6e3bf2'
};

const fetchAndStoreReviews = async (locationSlug) => {
    const dataId = locationDataIds[locationSlug];
    
    if (!dataId) {
        console.error(`[WebRatingService] data_id para a localização '${locationSlug}' não configurado.`);
        return;
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        console.error("[WebRatingService] A chave da API (SERPAPI_API_KEY) não está configurada no ambiente do servidor.");
        throw new Error("Configuração do servidor incompleta: a chave da API de busca não foi encontrada.");
    }

    let allReviews = [];
    let nextPageToken = null;
    let continueFetching = true;
    let pagesFetched = 0;
    const MAX_PAGES_TO_FETCH = 3;

    while(continueFetching && pagesFetched < MAX_PAGES_TO_FETCH) {
        const params = {
            api_key: apiKey,
            engine: 'google_maps_reviews',
            data_id: dataId,
            sort_by: 'ratingHigh',
            hl: 'pt',
        };

        if (nextPageToken) {
            params.next_page_token = nextPageToken;
        }

        try {
            console.log(`[WebRatingService] Buscando página ${pagesFetched + 1} de reviews para ${locationSlug}...`);
            const apiResponse = await axios.get('https://serpapi.com/search.json', { params });
            pagesFetched++;

            if (apiResponse.data && apiResponse.data.reviews) {
                allReviews.push(...apiResponse.data.reviews);
                console.log(`[WebRatingService] Recebidas ${apiResponse.data.reviews.length} avaliações. Total agora: ${allReviews.length}.`);
            }

            if (apiResponse.data.serpapi_pagination && apiResponse.data.serpapi_pagination.next_page_token) {
                nextPageToken = apiResponse.data.serpapi_pagination.next_page_token;
            } else {
                console.log(`[WebRatingService] Fim dos resultados para ${locationSlug}.`);
                continueFetching = false;
            }

        } catch (error) {
            console.error(`[WebRatingService] Erro ao buscar uma página de reviews para ${locationSlug}:`, error.message);
            continueFetching = false;
        }
    }

    if (pagesFetched >= MAX_PAGES_TO_FETCH) {
        console.log(`[WebRatingService] Atingido o limite máximo de ${MAX_PAGES_TO_FETCH} páginas para ${locationSlug}.`);
    }
    
    console.log(`[WebRatingService] Busca de reviews concluída para ${locationSlug}. Total de ${allReviews.length} avaliações encontradas.`);

    const fiveStarReviews = allReviews.filter(r => r.rating === 5).slice(0, 20);
    const fourStarReviews = allReviews.filter(r => r.rating === 4).slice(0, 5);
    const reviewsToStore = [...fiveStarReviews, ...fourStarReviews];
    
    console.log(`[WebRatingService] Filtradas ${fiveStarReviews.length} avaliações de 5 estrelas e ${fourStarReviews.length} de 4 estrelas.`);

    if (reviewsToStore.length > 0) {
        await WebRatingModel.clearReviewsByLocation(locationSlug);
        console.log(`[WebRatingService] Salvando ${reviewsToStore.length} novas avaliações para ${locationSlug}.`);

        for (const review of reviewsToStore) {
            await WebRatingModel.saveReview({
                location_slug: locationSlug,
                author: review.user.name,
                date: review.date,
                text: `"${review.snippet}"`,
                profile_photo_url: review.user.thumbnail || 'assets/img/default-avatar.png',
                rating: review.rating
            });
        }
        console.log(`[WebRatingService] ${reviewsToStore.length} avaliações salvas com sucesso para ${locationSlug}.`);
        
        const io = socketService.getIo();
        if(io) {
            console.log(`[WebRatingService] Emitindo evento 'reviews:updated' para a localização: ${locationSlug}.`);
            io.emit('reviews:updated', { location: locationSlug });
        }
    } else {
        console.log(`[WebRatingService] Nenhuma avaliação de 4 ou 5 estrelas encontrada para ${locationSlug}.`);
    }
};

const updateAllReviews = async () => {
    console.log("[WebRatingService] Iniciando atualização de avaliações do Google.");
    await fetchAndStoreReviews('sp');
    await fetchAndStoreReviews('bh');
    console.log("[WebRatingService] Atualização de avaliações concluída.");
};

module.exports = {
    updateAllReviews,
    fetchAndStoreReviews 
};