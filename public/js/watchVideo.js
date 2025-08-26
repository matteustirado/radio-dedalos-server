document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('live-video');
    const videoOverlay = document.getElementById('video-overlay');
    let hls = null;
    let currentFichaData = null;
    let songChangeTimeout = null;

    const videoContainer = document.getElementById('video-container');
    const unmuteOverlay = document.getElementById('unmute-overlay');
    const bottomControls = document.getElementById('bottom-controls');
    const muteToggleButton = document.getElementById('mute-toggle-button');
    const fullscreenButton = document.getElementById('fullscreen-button');
    let hideControlsTimer = null;

    const fichaTecnicaEl = document.getElementById('ficha-tecnica');
    const fichaMusica = document.getElementById('ficha-musica');
    const fichaAlbum = document.getElementById('ficha-album');
    const fichaArtista = document.getElementById('ficha-artista');
    const fichaGravadora = document.getElementById('ficha-gravadora');
    const fichaDirecao = document.getElementById('ficha-direcao');

    const updateOverlay = (filename) => {
        if (filename && videoOverlay) {
            const imageUrl = `/assets/uploads/overlay/${filename}?v=${new Date().getTime()}`;
            videoOverlay.src = imageUrl;
            videoOverlay.classList.remove('hidden');
        } else if (videoOverlay) {
            videoOverlay.classList.add('hidden');
            videoOverlay.src = '';
        }
    };

    const updateFichaTecnica = (songData) => {
        if (!songData || songData.artist === 'Comercial' || !fichaTecnicaEl) {
            currentFichaData = null;
            fichaTecnicaEl.classList.remove('visible');
            return;
        }
        currentFichaData = songData;

        const updateField = (element, value) => {
            const parent = element.parentElement;
            if (value && value.trim() !== '') {
                element.textContent = value;
                parent.style.display = 'block';
            } else {
                parent.style.display = 'none';
            }
        };

        updateField(fichaMusica, songData.title);
        updateField(fichaAlbum, songData.album);
        updateField(fichaArtista, songData.artist);
        updateField(fichaGravadora, songData.record_label);
        updateField(fichaDirecao, songData.director);
    };

    const handleTimeUpdate = () => {
        if (!currentFichaData || !video.duration || !isFinite(video.duration)) {
            fichaTecnicaEl.classList.remove('visible');
            return;
        }
        const currentTime = video.currentTime;
        const duration = video.duration;

        const isFirstWindow = (currentTime >= 10 && currentTime < 20);
        const isSecondWindow = (currentTime >= duration - 20 && currentTime < duration - 10);

        if (isFirstWindow || isSecondWindow) {
            fichaTecnicaEl.classList.add('visible');
        } else {
            fichaTecnicaEl.classList.remove('visible');
        }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    const syncUI = () => {
        if (video.muted) {
            unmuteOverlay.style.display = 'flex';
            muteToggleButton.innerHTML = '🔇';
        } else {
            unmuteOverlay.style.display = 'none';
            muteToggleButton.innerHTML = '🔊';
        }
    };

    unmuteOverlay.addEventListener('click', () => {
        video.muted = false;
        video.play().catch(() => {});
        syncUI();
        
        // Adiciona a funcionalidade de tela cheia
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
            });
        }
    });

    muteToggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        video.muted = !video.muted;
        syncUI();
    });

    fullscreenButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                alert(`Erro ao entrar em tela cheia: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    videoContainer.addEventListener('mousemove', () => {
        clearTimeout(hideControlsTimer);
        if (!video.muted) {
            bottomControls.classList.remove('hidden');
        }
        hideControlsTimer = setTimeout(() => {
            bottomControls.classList.add('hidden');
        }, 2500);
    });

    syncUI();

    function initPlayer(streamUrl, startTime = 0) {
        if (hls) {
            hls.destroy();
        }
        if (Hls.isSupported()) {
            hls = new Hls({ startPosition: startTime });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                video.play().catch(e => console.error("Erro ao tentar dar play automático:", e));
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', function () {
                video.currentTime = startTime;
                video.play().catch(e => console.error("Erro ao tentar dar play automático:", e));
            });
        }
    }

    async function processSongData(data) {
        clearTimeout(songChangeTimeout); 
        if (data && data.videoUrl) {
            initPlayer(data.videoUrl, data.currentTime || 0);
            updateFichaTecnica(data);
        } else {
            updateFichaTecnica(null);
            songChangeTimeout = setTimeout(fetchCurrentSong, 5000);
        }
    }

    async function fetchCurrentSong() {
        try {
            const response = await fetch('/api/playlists/current');
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            const data = await response.json();
            processSongData(data);
        } catch (error) {
            console.error("Falha ao buscar música atual:", error);
        }
    }

    async function fetchCurrentOverlay() {
        try {
            const response = await fetch('/api/settings/active-overlay');
            if (response.ok) {
                const data = await response.json();
                updateOverlay(data.filename);
            }
        } catch (error) {
            console.error("Falha ao buscar overlay atual:", error);
        }
    }
    
    video.addEventListener('ended', () => {
        songChangeTimeout = setTimeout(fetchCurrentSong, 2000);
    });

    const socket = io();

    socket.on('song:change', (data) => {
        processSongData(data);
    });

    socket.on('player:pause', () => {
        video.pause();
    });

    socket.on('player:play', () => {
        video.play().catch(e => console.error("Erro ao tentar dar play:", e));
    });

    socket.on('overlay:updated', (data) => {
        updateOverlay(data.filename);
    });

    fetchCurrentSong();
    fetchCurrentOverlay();
});