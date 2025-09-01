document.addEventListener('DOMContentLoaded', () => {
    const surveySubtitle = document.getElementById('survey-subtitle');
    const startView = document.getElementById('start-view');
    const step1View = document.getElementById('step1-view');
    const step2View = document.getElementById('step2-view');
    const qrCodeView = document.getElementById('qr-code-view');
    const wristbandCodeInput = document.getElementById('wristband-code');
    const startSurveyBtn = document.getElementById('start-survey-btn');
    const finalCommentInput = document.getElementById('final-comment');
    const sendCommentBtn = document.getElementById('send-comment-btn');

    let qrRedirectTimer = null;
    const isClientCodeValid = ValidationConfig.getValidationFunction();
    const unit = ValidationConfig.unit;
    const surveyData = {};

    const questions = {
        step1: [
            { id: 'satisfaction_cleanliness', text: 'De 0 a 5, qual seu nível de satisfação com a limpeza que temos aqui na Dedalos? ✨', type: 'rating' },
            { id: 'satisfaction_service', text: 'E o nosso atendimento, como foi? Conta pra gente o quanto você curtiu a galera! 😉', type: 'rating' },
            { id: 'satisfaction_labyrinth', text: 'Vamos ao que interessa... Quão quente 🔥 foi o nosso labirinto pra você? 😈', type: 'rating' }
        ],
        step2: [
            { id: 'is_organized', text: 'Você achou nosso bar organizadinho e arrumado durante o rolê? 👍', type: 'boolean' },
            { id: 'is_staff_helpful', text: 'A galera do Dedalos foi atenciosa e ajudou a resolver suas dúvidas e perrengues? 🤗', type: 'boolean' },
            { id: 'has_all_drinks', text: 'Tinha todas as bebidas e bons drinks que você tava a fim de tomar no nosso bar? 🍹', type: 'boolean' }
        ]
    };

    const resetSubmitButton = () => {
        startSurveyBtn.disabled = false;
        startSurveyBtn.classList.remove('error');
        wristbandCodeInput.classList.remove('error');
        startSurveyBtn.textContent = 'Começar!';
    };

    const showView = (viewToShow) => {
        [startView, step1View, step2View, qrCodeView].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    };

    const renderQuestions = (step, view) => {
        view.innerHTML = '';
        questions[step].forEach(q => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'survey-question';
            questionDiv.innerHTML = `<h3>${q.text}</h3>`;
            const optionsDiv = document.createElement('div');
            if (q.type === 'rating') {
                optionsDiv.className = 'rating-options';
                const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                for (let i = 0; i <= 5; i++) {
                    optionsDiv.innerHTML += `<button data-question-id="${q.id}" data-value="${i}">${emojis[i]}</button>`;
                }
            } else {
                optionsDiv.className = 'boolean-options';
                optionsDiv.innerHTML = `
                    <button data-question-id="${q.id}" data-value="true">✔️</button>
                    <button data-question-id="${q.id}" data-value="false">❌</button>
                `;
            }
            questionDiv.appendChild(optionsDiv);
            view.appendChild(questionDiv);
        });
    };

    const handleAnswerClick = (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const { questionId, value } = target.dataset;
        surveyData[questionId] = value;

        const parent = target.parentElement;
        parent.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
        target.classList.add('selected');

        const answeredStep1 = questions.step1.every(q => surveyData.hasOwnProperty(q.id));
        if (answeredStep1 && step1View.contains(parent)) {
            setTimeout(() => {
                showView(step2View);
                surveySubtitle.textContent = "Show! Agora a segunda e última parte. (2/2)";
            }, 300);
        }

        const answeredStep2 = questions.step2.every(q => surveyData.hasOwnProperty(q.id));
        if (answeredStep2 && step2View.contains(parent)) {
            setTimeout(submitSurvey, 300);
        }
    };

    const startQrCodeCountdown = () => {
        const countdownElement = document.getElementById('countdown');
        let count = 30;
        qrRedirectTimer = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            if (count <= 0) {
                clearInterval(qrRedirectTimer);
                const hubPage = unit === 'bh' ? '/hubTabBH.html' : '/hubTabSP.html';
                window.location.href = hubPage;
            }
        }, 1000);
    };

    const submitSurvey = async () => {
        showView(qrCodeView);
        surveySubtitle.textContent = "É isso! Seu cupom está quase pronto!";
        startQrCodeCountdown();

        if (ValidationConfig.isMasterCode(surveyData.wristband_code)) {
            console.log("Modo de teste (0108). Resposta não será salva no banco de dados.");
            return;
        }

        try {
            await apiFetch('/surveys', {
                method: 'POST',
                body: JSON.stringify(surveyData)
            });
            console.log("Pesquisa enviada:", surveyData);
        } catch (error) {
            console.error("Erro ao enviar pesquisa:", error);
        }
    };

    startSurveyBtn.addEventListener('click', async () => {
        const code = wristbandCodeInput.value.trim();
        if (!code) {
            alert('Por favor, digite o código da pulseira.');
            return;
        }
        
        const isMaster = ValidationConfig.isMasterCode(code);

        if (!isMaster) {
            const today = new Date().toISOString().split('T')[0];
            const lastSurveyDate = localStorage.getItem(`survey_cooldown_${code}`);
            if (lastSurveyDate === today) {
                alert('Você já respondeu à pesquisa hoje. Volte amanhã para ganhar outro cupom!');
                return;
            }
        }

        startSurveyBtn.disabled = true;
        startSurveyBtn.textContent = 'Validando...';
        const isValid = await isClientCodeValid(code);

        if (isValid) {
            surveyData.wristband_code = code;
            surveyData.unit = unit;
            if (!isMaster) {
                const today = new Date().toISOString().split('T')[0];
                localStorage.setItem(`survey_cooldown_${code}`, today);
            }
            showView(step1View);
            surveySubtitle.textContent = "Bora lá! Metade do caminho pra garantir seu desconto. (1/2)";
        } else {
            wristbandCodeInput.classList.add('error');
            startSurveyBtn.classList.add('error');
            startSurveyBtn.textContent = 'Tentar Novamente';
            startSurveyBtn.disabled = false;
        }
    });

    wristbandCodeInput.addEventListener('input', () => {
        wristbandCodeInput.value = wristbandCodeInput.value.replace(/[^0-9]/g, '');
        if (wristbandCodeInput.classList.contains('error')) {
            resetSubmitButton();
        }
    });

    finalCommentInput.addEventListener('input', () => {
        sendCommentBtn.classList.toggle('hidden', finalCommentInput.value.trim() === '');
    });

    sendCommentBtn.addEventListener('click', async () => {
        surveyData.final_comment = finalCommentInput.value.trim();
        sendCommentBtn.disabled = true;
        sendCommentBtn.textContent = 'Enviando...';
        await submitSurvey();
    });

    renderQuestions('step1', step1View);
    renderQuestions('step2', step2View);
    step1View.addEventListener('click', handleAnswerClick);
    step2View.addEventListener('click', handleAnswerClick);
    ValidationConfig.setupInactivityRedirect(30000);
});