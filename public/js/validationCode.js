const ValidationConfig = (() => {
    const detectLocation = () => {
        const pathname = window.location.pathname.toLowerCase();
        if (pathname.includes('bh')) {
            return 'bh';
        }
        return 'sp';
    };

    const location = detectLocation();

    const validateSP = async (code) => {
        const url = `https://dedalosadm2-3dab78314381.herokuapp.com/pesquisa/api/verificar_pulseira/?id=${code}`;
        try {
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            console.error('Erro ao validar código em SP:', error);
            return false;
        }
    };

    const validateBH = async (code) => {
        const url = `https://dedalosadm2bh-09d55dca461e.herokuapp.com/pesquisa/api/verificar_pulseira/?id=${code}`;
        try {
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            console.error('Erro ao validar código em BH:', error);
            return false;
        }
    };

    const validationFunctions = {
        sp: validateSP,
        bh: validateBH
    };

    const setupInactivityRedirect = (timeoutDuration = 20000) => {
        let inactivityTimer = null;
        const hubPage = location === 'bh' ? '/hubTabBH.html' : '/hubTabSP.html';

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                window.location.href = hubPage;
            }, timeoutDuration);
        };

        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onmousedown = resetTimer;
        document.onkeypress = resetTimer;
    };

    return {
        unit: location,
        isMasterCode: (code) => code === '0108',
        getValidationFunction: () => {
            return async (code) => {
                if (code === '0108') return true;
                return validationFunctions[location](code.toUpperCase());
            };
        },
        setupInactivityRedirect
    };
})();