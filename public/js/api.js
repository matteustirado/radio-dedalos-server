
const API_BASE_URL = 'http://159.65.161.7:3000';

async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
            ...options,
            headers: headers,
        });

        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const message = (typeof data === 'object' && data.message) ? data.message : (data || 'Ocorreu um erro na API');
            throw new Error(message);
        }

        return data;

    } catch (error) {
        console.error(`Erro na chamada API para ${endpoint}:`, error);
        throw error;
    }
}