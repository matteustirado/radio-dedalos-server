const axios = require('axios');

class TweetScraperService {
    static async scrapeTweet(tweetUrl) {
        if (!tweetUrl) {
            throw new Error("A URL do tweet é obrigatória.");
        }

        try {
            const apiUrl = tweetUrl.replace("x.com", "api.fxtwitter.com");
            console.log(`[TweetScraperService] Buscando dados da API FxTwitter: ${apiUrl}`);

            const response = await axios.get(apiUrl);
            const tweetData = response.data.tweet;

            if (!tweetData) {
                throw new Error('Não foi possível encontrar os dados do tweet. Verifique se a URL está correta e se o tweet é público.');
            }
            
            const author = tweetData.author.screen_name || 'Desconhecido';
            const text = tweetData.text || "Não foi possível extrair o texto.";
            const date = new Date(tweetData.created_timestamp * 1000).toLocaleDateString('pt-BR');
            const profile_photo_url = tweetData.author.avatar_url || null;
            
            let media_urls = [];
            if (tweetData.media && tweetData.media.all && tweetData.media.all.length > 0) {
                media_urls = tweetData.media.all.slice(0, 2).map(media => media.url);
            }

            return {
                author,
                text: `"${text}"`,
                date,
                profile_photo_url,
                image_url: JSON.stringify(media_urls) // Salva como uma string JSON
            };

        } catch (error) {
            console.error('[TweetScraperService] Erro ao buscar dados do tweet:', error.response ? error.response.data : error.message);
            throw new Error('Falha ao obter os dados do tweet. O serviço pode estar temporariamente indisponível ou a URL é inválida.');
        }
    }
}

module.exports = TweetScraperService;