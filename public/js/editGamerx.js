import 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const getUnitFromPath = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('editgamerxbh.html')) {
            return 'bh';
        }
        
        return 'sp';
    };

    const unit = getUnitFromPath();
    console.log(`[editGamerx.js] Configurando editor para unidade: ${unit}`);
    

    const optionsCountInput = document.getElementById('options-count');
    const optionsContainer = document.getElementById('options-container');
    const form = document.getElementById('game-config-form');
    const saveBtn = document.getElementById('save-config-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    const saveSpinner = document.getElementById('save-spinner');
    const successMessage = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const logoutBtn = document.getElementById('logout-btn');

    const showMessage = (element, textElement, message, type = 'success') => {
        textElement.textContent = message;
        element.classList.remove('success-alert', 'danger-alert', 'hidden');
        element.classList.add(type === 'success' ? 'success-alert' : 'danger-alert');
        setTimeout(() => element.classList.add('hidden'), 5000);
    };

    const createOptionCard = (index, optionData = {}) => {
        const card = document.createElement('div');
        card.className = 'option-config-card';
        card.dataset.index = index;
        const labelValue = optionData.label || '';
        const typeValue = optionData.type || 'nada';
        const emojiValue = optionData.type === 'emoji' ? optionData.value : '❓';
        const emojiHiddenValue = optionData.type === 'emoji' ? optionData.value : '';
        const imageValue = optionData.type === 'image' ? optionData.value : null;
        const imagePreviewSrc = imageValue ? `/assets/uploads/game_options/${unit}/${imageValue}` : '#';
        const imageName = imageValue || 'Nenhum arquivo';

        card.innerHTML = `
            <h3>Opção ${index + 1}</h3>
            <div class="form-group">
                <label for="option-label-${index}">Texto da Opção *</label>
                <input type="text" id="option-label-${index}" class="form-input" required value="${labelValue}">
            </div>
            <div class="option-visual-row form-group">
                <label>Visual Adicional</label>
                <div class="visual-controls-wrapper">
                    <div class="radio-group inline centered">
                        <label>
                            <input type="radio" name="option-type-${index}" value="nada" ${typeValue === 'nada' ? 'checked' : ''}> Nada
                        </label>
                        <label>
                            <input type="radio" name="option-type-${index}" value="emoji" ${typeValue === 'emoji' ? 'checked' : ''}> Emoji
                        </label>
                        <label>
                            <input type="radio" name="option-type-${index}" value="image" ${typeValue === 'image' ? 'checked' : ''}> Imagem
                        </label>
                    </div>
                </div>
            </div>
            <div class="form-group visual-input-area ${typeValue === 'nada' ? 'hidden' : ''}">
                <div class="emoji-input-group ${typeValue !== 'emoji' ? 'hidden' : ''}">
                     <label>Selecionar Emoji</label>
                     <div class="emoji-input-wrapper full-width-trigger">
                          <button type="button" id="option-emoji-trigger-${index}" class="emoji-input-trigger">
                               <span class="emoji-display">${emojiValue}</span>
                               <span>Clique para escolher</span>
                          </button>
                          <div class="emoji-picker-container hidden">
                             <emoji-picker locale="pt" class="light"></emoji-picker>
                          </div>
                     </div>
                     <input type="hidden" id="option-emoji-${index}" value="${emojiHiddenValue}">
                </div>
                <div class="image-input-group ${typeValue !== 'image' ? 'hidden' : ''}">
                     <label for="option-image-${index}">Selecionar Imagem</label>
                     <label for="option-image-${index}" class="button secondary-button full-width-button">
                         <div class="button-content-wrapper">
                             <i class="fas fa-upload"></i>
                             <span class="file-name">${imageName}</span>
                             <img class="image-preview ${!imageValue ? 'hidden' : ''}" src="${imagePreviewSrc}" alt="Preview">
                         </div>
                     </label>
                     <input type="file" id="option-image-${index}" class="file-input-hidden" accept="image/*" data-original-filename="${imageValue || ''}">
                </div>
            </div>
        `;

        const typeRadios = card.querySelectorAll(`input[name="option-type-${index}"]`);
        const visualInputArea = card.querySelector('.visual-input-area');
        const emojiGroup = card.querySelector('.emoji-input-group');
        const imageGroup = card.querySelector('.image-input-group');
        const emojiTrigger = card.querySelector(`#option-emoji-trigger-${index}`);
        const emojiPickerContainer = card.querySelector('.emoji-picker-container');
        const emojiPicker = emojiPickerContainer.querySelector('emoji-picker');
        const emojiDisplay = card.querySelector(`#option-emoji-trigger-${index} .emoji-display`);
        const emojiInputHidden = card.querySelector(`#option-emoji-${index}`);
        const imageInput = card.querySelector(`#option-image-${index}`);
        const imagePreview = card.querySelector('.image-preview');
        const fileNameSpan = card.querySelector('.full-width-button .file-name');

        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedType = e.target.value;
                const showEmoji = selectedType === 'emoji';
                const showImage = selectedType === 'image';

                emojiGroup.classList.toggle('hidden', !showEmoji);
                imageGroup.classList.toggle('hidden', !showImage);
                visualInputArea.classList.toggle('hidden', !showEmoji && !showImage);

            });
             if(radio.checked) {
                  radio.dispatchEvent(new Event('change'));
             }
        });

        emojiTrigger.addEventListener('click', () => {
             emojiPickerContainer.classList.toggle('hidden');
        });

        emojiPicker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            emojiDisplay.textContent = emoji;
            emojiInputHidden.value = emoji;
            emojiPickerContainer.classList.add('hidden');
        });

        document.addEventListener('click', (event) => {
             const emojiWrapper = card.querySelector('.emoji-input-wrapper');
            if (emojiWrapper && !emojiWrapper.contains(event.target) && !emojiPickerContainer.classList.contains('hidden')) {
                emojiPickerContainer.classList.add('hidden');
            }
        });

        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) {
                fileNameSpan.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
                 imageInput.dataset.originalFilename = '';
            } else {
                 const originalFilename = imageInput.dataset.originalFilename;
                fileNameSpan.textContent = originalFilename || 'Nenhum arquivo';
                if(originalFilename) {
                     imagePreview.src = `/assets/uploads/game_options/${unit}/${originalFilename}`;
                     imagePreview.classList.remove('hidden');
                } else {
                    imagePreview.classList.add('hidden');
                    imagePreview.src = '#';
                }
            }
        });

        return card;
    };

    const renderOptions = (count, optionsData = []) => {
        optionsContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            optionsContainer.appendChild(createOptionCard(i, optionsData[i]));
        }
    };

     const loadConfig = async () => {
        try {
            const config = await apiFetch(`/game-config/${unit}`);
            if (config && config.options) {
                optionsCountInput.value = config.options.length;
                renderOptions(config.options.length, config.options);

                const orientationRadio = document.querySelector(`input[name="placard-orientation"][value="${config.placard_orientation}"]`);
                if (orientationRadio) {
                    orientationRadio.checked = true;
                }
            } else {
                 optionsContainer.innerHTML = '';
            }
        } catch (error) {
            const notFoundMessage = 'Configuração não encontrada para esta unidade.';
            if (error.message !== notFoundMessage) {
                showMessage(errorMessage, errorText, `Erro ao carregar configuração: ${error.message}`, 'danger');
            }
             optionsContainer.innerHTML = '';
        }
    };

    optionsCountInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const count = parseInt(value, 10);

        if (value === '' || isNaN(count) || count < 1 || count > 9) {
            optionsContainer.innerHTML = '';
            if (value !== '' && (count < 1 || count > 9)) {
                 showMessage(errorMessage, errorText, 'Número de opções deve ser entre 1 e 9.', 'danger');
            } else {
                 errorMessage.classList.add('hidden');
            }
        } else {
             errorMessage.classList.add('hidden');
             const existingOptionsData = [];
             const existingCards = optionsContainer.querySelectorAll('.option-config-card');
             existingCards.forEach((card, index) => {
                 if (index < count) {
                     const label = card.querySelector(`#option-label-${index}`).value;
                     const type = card.querySelector(`input[name="option-type-${index}"]:checked`)?.value || 'nada';
                     let value = null;
                      if(type === 'emoji') {
                          value = card.querySelector(`#option-emoji-${index}`).value;
                      } else if (type === 'image') {
                          value = card.querySelector(`#option-image-${index}`).dataset.originalFilename || null;
                      }
                     existingOptionsData.push({ label, type, value });
                 }
             });
             renderOptions(count, existingOptionsData);
        }
    });

     form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const count = parseInt(optionsCountInput.value, 10);
        if (isNaN(count) || count < 1 || count > 9) {
            showMessage(errorMessage, errorText, 'Número de opções inválido. Deve ser entre 1 e 9.', 'danger');
            return;
        }

        saveBtnText.classList.add('hidden');
        saveSpinner.classList.remove('hidden');
        saveBtn.disabled = true;

        const formData = new FormData();
        const options = [];

        for (let i = 0; i < count; i++) {
            const labelInput = document.getElementById(`option-label-${i}`);
             if (!labelInput || !labelInput.value.trim()) {
                 showMessage(errorMessage, errorText, `O texto da Opção ${i + 1} é obrigatório.`, 'danger');
                 saveBtnText.classList.remove('hidden');
                 saveSpinner.classList.add('hidden');
                 saveBtn.disabled = false;
                 labelInput?.focus();
                 return;
             }
             const label = labelInput.value.trim();
            const typeRadioChecked = document.querySelector(`input[name="option-type-${i}"]:checked`);
            const type = typeRadioChecked ? typeRadioChecked.value : 'nada';
            let value = null;
            let imageFile = null;

            if (type === 'emoji') {
                 value = document.getElementById(`option-emoji-${i}`).value;
                 if(!value) {
                     showMessage(errorMessage, errorText, `Selecione um emoji para a Opção ${i + 1}.`, 'danger');
                     saveBtnText.classList.remove('hidden');
                     saveSpinner.classList.add('hidden');
                     saveBtn.disabled = false;
                     return;
                 }
            } else if (type === 'image') {
                 imageFile = document.getElementById(`option-image-${i}`).files[0];
                 const originalFilename = document.getElementById(`option-image-${i}`).dataset.originalFilename;

                 if (imageFile) {
                    formData.append(`option_image_${i}`, imageFile);
                    value = `image_${i}`;
                 } else if (originalFilename) {
                     value = originalFilename;
                 } else {
                     showMessage(errorMessage, errorText, `Selecione uma imagem para a Opção ${i + 1}.`, 'danger');
                     saveBtnText.classList.remove('hidden');
                     saveSpinner.classList.add('hidden');
                     saveBtn.disabled = false;
                     return;
                 }
            }

            options.push({ label, type, value });
        }

        formData.append('options', JSON.stringify(options));
        formData.append('placard_orientation', document.querySelector('input[name="placard-orientation"]:checked').value);

        try {
            await apiFetch(`/game-config/${unit}`, {
                method: 'PUT',
                body: formData
            });
            showMessage(successMessage, successText, 'Configuração salva com sucesso!');
            await loadConfig();
        } catch (error) {
            showMessage(errorMessage, errorText, `Erro ao salvar: ${error.message}`, 'danger');
        } finally {
            saveBtnText.classList.remove('hidden');
            saveSpinner.classList.add('hidden');
            saveBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', logout);

    loadConfig();

});