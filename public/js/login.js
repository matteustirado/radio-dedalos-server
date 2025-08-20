document.addEventListener('DOMContentLoaded', () => {
    const loginView = document.getElementById('login-view');
    const reportView = document.getElementById('report-view');
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const showReportViewBtn = document.getElementById('showReportViewBtn');
    const reportProblemForm = document.getElementById('reportProblemForm');
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    const reportFormWrapper = document.getElementById('report-form-wrapper');
    const reportConfirmationView = document.getElementById('report-confirmation-view');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const problemCategory = document.getElementById('problemCategory');
    const problemDescription = document.getElementById('problemDescription');

    const showLoginView = () => {
        reportView.classList.add('hidden');
        loginView.classList.remove('hidden');
    };

    const showReportView = () => {
        loginView.classList.add('hidden');
        reportView.classList.remove('hidden');
        reportFormWrapper.classList.remove('hidden');
        reportConfirmationView.classList.add('hidden');
    };

    const resetLoginState = () => {
        buttonText.textContent = 'Conectar';
        loadingSpinner.classList.add('hidden');
        loginButton.disabled = false;
        loginButton.classList.remove('error');
        usernameInput.classList.remove('error');
        passwordInput.classList.remove('error');
    };

    const showLoginError = () => {
        buttonText.textContent = 'Tente Novamente';
        loadingSpinner.classList.add('hidden');
        loginButton.disabled = false;
        loginButton.classList.add('error');
        usernameInput.classList.add('error');
        passwordInput.classList.add('error');
    };

    if (showReportViewBtn) showReportViewBtn.addEventListener('click', showReportView);
    if (cancelReportBtn) cancelReportBtn.addEventListener('click', showLoginView);
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            reportProblemForm.reset();
            showLoginView();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetLoginState();
            buttonText.textContent = 'Conectando...';
            loadingSpinner.classList.remove('hidden');
            loginButton.disabled = true;
            try {
                const data = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: usernameInput.value,
                        password: passwordInput.value
                    })
                });
                saveToken(data.token);
                const role = getUserRole();

                const [baseRole, filial] = role.split('_');
                
                const roleRedirects = {
                    'master': '/master.html',
                    'admin': '/musics.html',
                    'playlist_creator': '/playlists.html',
                    'dj': '/dj.html',
                    'adm_tabela': filial === 'sp' ? '/priceSP.html' : '/priceBH.html',
                    'jukebox_user': filial === 'sp' ? '/jukebox.html' : '/jukeboxBH.html',
                    'view_tabela': filial === 'sp' ? '/tableSP.html' : '/tableBH.html'
                };

                const redirectUrl = roleRedirects[baseRole] || roleRedirects[role];

                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    const legacyRedirects = {
                        'adm-tabela-sp': '/priceSP.html',
                        'adm-tabela-bh': '/priceBH.html',
                        'tabela-sp': '/tableSP.html',
                        'tabela-bh': '/tableBH.html'
                    };
                    if (legacyRedirects[role]) {
                        window.location.href = legacyRedirects[role];
                    } else {
                        throw new Error('Função de usuário não reconhecida ou sem página de destino.');
                    }
                }
            } catch (error) {
                alert(`Falha no login: ${error.message}`);
                showLoginError();
            }
        });
    }

    [usernameInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                if (loginButton.classList.contains('error')) {
                    resetLoginState();
                }
            });
        }
    });

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('i');
            icon.classList.toggle('fa-eye', !isPassword);
            icon.classList.toggle('fa-eye-slash', isPassword);
        });
    }

    if (reportProblemForm) {
        reportProblemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const category = problemCategory.value;
            const description = problemDescription.value.trim();
            if (!category || !description) {
                alert('Por favor, preencha todos os campos do relatório.');
                return;
            }
            try {
                await apiFetch('/reports', {
                    method: 'POST',
                    body: JSON.stringify({
                        category,
                        description
                    })
                });
                reportFormWrapper.classList.add('hidden');
                reportConfirmationView.classList.remove('hidden');
            } catch (error) {
                alert(`Erro ao enviar relatório: ${error.message}`);
            }
        });
    }
});