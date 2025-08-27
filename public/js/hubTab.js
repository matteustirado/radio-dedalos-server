document.addEventListener('DOMContentLoaded', function() {
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackLabel = document.getElementById('feedback-label');
    const feedbackText = document.getElementById('feedback-text');
    const wristbandCodeInput = document.getElementById('wristband-code');
    const cancelFeedbackBtn = document.getElementById('cancel-feedback-btn');
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const successMessage = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    const emojiInfoText = document.getElementById('emoji-info-text');
    const accessSection = document.getElementById('access-section');
    const radioCardDescription = document.querySelector('a[href*="jukebox"] .card-description');

    let selectedRating = 0;
    let inactivityTimer = null;
    const isClientCodeValid = ValidationConfig.getValidationFunction();
    const unit = ValidationConfig.unit;

    const emojiInfo = {
        1: { meaning: "Clima Frio: Noite parada, sozinho(a) na pista...", label: "Poxa, o que te deixou na seca?", message: "Anotado! Vamos tentar esquentar as coisas por aqui." },
        2: { meaning: "Péssimo! A noite foi um desastre.", label: "Que bad! Conta pra gente o que deu errado:", message: "Lamentamos por isso. Vamos usar seu feedback para melhorar." },
        3: { meaning: "Ruim... Esperava bem mais da noite.", label: "Hmm, o que podemos fazer pra melhorar?", message: "Agradecemos o feedback, sua opinião é importante." },
        4: { meaning: "Na média. Uma noite normal, sem grandes emoções.", label: "Beleza! O que faltou pra noite ser nota 10?", message: "Valeu pelo toque! Sua opinião ajuda a gente." },
        5: { meaning: "Bom! A noite foi legal, valeu a pena.", label: "Que bom que curtiu! O que foi o ponto alto?", message: "Ficamos felizes que você gostou!" },
        6: { meaning: "Incrível! Uma noite pra guardar na memória.", label: "Uau! Conta mais, o que fez a noite ser épica?", message: "Uau! Obrigado pelo carinho!" },
        7: { meaning: "Clima Quente! A noite pegou fogo, muita pegação!", label: "Eita! Conta tudo, qual foi o segredo do sucesso?", message: "Que ótimo! Continue aproveitando o clima!" }
    };
    const defaultInfoText = "Qual a vibe da sua noite? Clica na reação que mais combina com o rolê!";

    const resetUI = () => {
        feedbackForm.classList.add('hidden');
        accessSection.classList.remove('hidden');
        resetEmojisToStatic();
        selectedRating = 0;
        feedbackText.value = '';
        wristbandCodeInput.value = '';
        emojiInfoText.textContent = defaultInfoText;
        clearTimeout(inactivityTimer);
        resetSubmitButton();
    };

    const resetEmojisToStatic = () => {
        emojiBtns.forEach(btn => {
            btn.classList.remove('selected');
            const img = btn.querySelector('img');
            if (img.src !== img.dataset.staticSrc) {
                img.src = img.dataset.staticSrc;
            }
        });
    };

    const resetSubmitButton = () => {
        submitFeedbackBtn.disabled = false;
        submitFeedbackBtn.classList.remove('error');
        wristbandCodeInput.classList.remove('error');
        submitBtnText.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Avaliação';
        submitBtnText.classList.remove('hidden');
        submitSpinner.classList.add('hidden');
    };

    const updateRadioStatus = () => {
        const statusDot = document.querySelector('.status-dot');
        if (!statusDot || !radioCardDescription) return;

        const now = new Date();
        const currentHour = now.getHours();
        const isRadioTime = currentHour >= 16 || currentHour < 6;
        const isRadioPlaying = radioPlayer.getState().playerState.isPlaying;

        if (isRadioTime && isRadioPlaying) {
            statusDot.classList.add('online');
            statusDot.classList.remove('offline');
            radioCardDescription.textContent = "Vire o DJ! Peça sua música favorita e agite a pista.";
        } else {
            statusDot.classList.add('offline');
            statusDot.classList.remove('online');
            radioCardDescription.textContent = "A rádio está fora do ar no momento. Voltamos às 16h!";
        }
    };
    
    emojiBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            clearTimeout(inactivityTimer);
            selectedRating = parseInt(this.dataset.rating);
            resetEmojisToStatic();
            this.classList.add('selected');
            const clickedImg = this.querySelector('img');
            clickedImg.src = clickedImg.dataset.animatedSrc;
            
            const info = emojiInfo[selectedRating];
            emojiInfoText.textContent = info.meaning;
            feedbackLabel.textContent = info.label;

            successMessage.classList.add('hidden'); 
            feedbackForm.classList.remove('hidden');
            accessSection.classList.add('hidden');

            inactivityTimer = setTimeout(resetUI, 10000);
        });
    });

    cancelFeedbackBtn.addEventListener('click', resetUI);

    submitFeedbackBtn.addEventListener('click', async function() {
        clearTimeout(inactivityTimer);
        const wristbandCode = wristbandCodeInput.value.trim();
        if (!wristbandCode) {
            wristbandCodeInput.classList.add('error');
            return;
        }

        const lastVoteTimestamp = localStorage.getItem(`vote_cooldown_${wristbandCode}`);
        const oneHour = 60 * 60 * 1000;
        if (lastVoteTimestamp && (Date.now() - lastVoteTimestamp < oneHour)) {
            alert('Você já avaliou nesta última hora. Por favor, aguarde um pouco.');
            return;
        }

        submitFeedbackBtn.disabled = true;
        submitBtnText.classList.add('hidden');
        submitSpinner.classList.remove('hidden');

        const isValid = await isClientCodeValid(wristbandCode);
        if (!isValid) {
            wristbandCodeInput.classList.add('error');
            submitFeedbackBtn.classList.add('error');
            submitBtnText.textContent = 'Tentar Novamente';
            submitFeedbackBtn.disabled = false;
            submitBtnText.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
            inactivityTimer = setTimeout(resetUI, 10000);
            return;
        }
        
        console.log('Avaliação:', selectedRating);
        console.log('Feedback:', feedbackText.value.trim());
        console.log('Pulseira:', wristbandCode);
        
        localStorage.setItem(`vote_cooldown_${wristbandCode}`, Date.now());
        
        const info = emojiInfo[selectedRating];
        successText.textContent = info.message || "Obrigado pelo seu feedback!";
        successMessage.classList.remove('hidden');

        setTimeout(() => {
            resetUI();
            successMessage.classList.add('hidden');
        }, 5000);
    });

    wristbandCodeInput.addEventListener('input', () => {
        wristbandCodeInput.value = wristbandCodeInput.value.replace(/[^0-9]/g, '');
        if (wristbandCodeInput.classList.contains('error')) {
            resetSubmitButton();
        }
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(resetUI, 10000);
    });

    feedbackText.addEventListener('input', () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(resetUI, 10000);
    });
    
    radioPlayer.subscribe(updateRadioStatus);
    radioPlayer.initialize();
});