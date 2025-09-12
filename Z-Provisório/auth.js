function saveToken(token) {
    localStorage.setItem('admin_token', token);
}

function getToken() {
    return localStorage.getItem('admin_token');
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/';
}

function protectPage() {
    if (!getToken()) {
        alert('Acesso negado. Por favor, faça o login.');
        window.location.href = '/';
    }
}

function getUserRole() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
    } catch (e) {
        console.error('Erro ao decodificar o token:', e);
        return null;
    }
}