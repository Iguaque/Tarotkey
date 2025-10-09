// ════════════════════════════════════════════════════════════════════════════════
// 🎴 TAROT READER APP - SCRIPT PRINCIPAL v1.22
// ════════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────────
// 📦 VARIABLES GLOBALES
// ────────────────────────────────────────────────────────────────────────────────

// ── Estados del juego ───────────────────────────────────────────────────────────
let currentCards = null;
let currentQuestion = '';
let selectedStyle = 'coaching';
let animationInProgress = false;
// Flags globales para el flujo de autenticación y navegación
let userIsAuthenticated = false;
let skipToAppAfterIntro = false;

// ── Audio ───────────────────────────────────────────────────────────────────────
let soundEnabled = false;
let flipSound, chimeSound, introMusic;
let introVideo, skipIntroBtn;

// ── Elementos del DOM ───────────────────────────────────────────────────────────
let tryBtn, solveBtn, card1, card2, card1Name, card2Name;
let interpretationContent, loading;

// ────────────────────────────────────────────────────────────────────────────────
// 🎨 CONFIGURACIÓN Y CONSTANTES
// ────────────────────────────────────────────────────────────────────────────────

// ── Paleta de colores por tarotista ─────────────────────────────────────────────
const styleColors = {
    'professor': '#3a506b',      // Azul académico
    'coaching': '#34495e',       // Gris azulado profesional
    'nigromante': '#1a1a2e',     // Negro profundo con toque azul
    'gitano': '#2d1b69',         // Púrpura místico
    'místico': '#1d2d44'         // Azul profundo místico
};

// ────────────────────────────────────────────────────────────────────────────────
// 🚀 INICIALIZACIÓN PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────────

// ── Inicialización cuando el DOM esté listo ─────────────────────────────────────
function initApp() {
    console.log("=== Inicializando aplicación (initApp) ===");

    // Verificar que FLASK_VARS está definido - si no, la plantilla no cargó las variables
    if (typeof FLASK_VARS === 'undefined') {
        console.warn("FLASK_VARS no está definido en esta plantilla. Algunas funciones pueden no funcionar completamente.");
    } else {
        console.log("FLASK_VARS:", FLASK_VARS);
    }

    // Inicializar elementos de video introductorio
    initializeIntroVideo();
    // Inicializar controles de sesión y configuración en la esquina superior derecha
    initializeSessionControls();
    // Configurar eventos globales independientemente de si se muestra la pantalla de bienvenida
    setupGlobalEventListeners();
    // Inicializar Tarotista menú si estamos en la página de configuración
    initializeTarotistaMenu();

    // Al iniciar la app, leer la preferencia guardada del tarotista y aplicarla
    try {
        const saved = localStorage.getItem('selected_tarotista_style');
        if (saved) {
            // Mapeo simple (coincide con el mapa en initializeTarotistaMenu)
            const map = { 'profesor':'professor', 'coaching':'coaching', 'nigromante':'nigromante', 'gitano':'gitano', 'místico':'místico' };
            selectedStyle = map[saved] || saved;
            changeBackgroundColor(selectedStyle);
            // Actualizar etiqueta de estilo si está presente
            const styleLabel = document.getElementById('style-label');
            if (styleLabel) {
                // usar la opción de texto del menú si está disponible
                const opt = document.querySelector(`.settings-option[data-style="${saved}"]`);
                styleLabel.textContent = `Estilo: ${opt ? opt.textContent : saved}`;
            }
        }
    } catch (err) {
        console.warn('No se pudo leer la preferencia guardada del tarotista:', err);
    }

    // Mensaje de éxito
    console.log("✅ Aplicación Tarot inicializada correctamente");

    // Si la URL contiene el hash #app, forzamos la vista de la aplicación
    try {
        if (window.location && window.location.hash && window.location.hash.toLowerCase().includes('#app')) {
            console.log('Hash #app detectado: mostrando la aplicación directamente');
            // Detener y ocultar el video introductorio si existe
            try {
                if (introVideo) {
                    introVideo.pause();
                    introVideo.currentTime = 0;
                }
                const introContainer = document.getElementById('intro-video-container');
                if (introContainer) introContainer.style.display = 'none';
            } catch (err) {
                console.warn('No se pudo manipular el video intro:', err);
            }

            // Mostrar la app principal
            skipToAppAfterIntro = true;
            showMainContent();
        }
    } catch (err) {
        console.error('Error comprobando hash de la URL:', err);
    }
}

// Ejecutar initApp() ya sea inmediatamente (si el documento ya está listo)
// o al evento DOMContentLoaded cuando todavía no se ha disparado.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // Documento ya cargado: llamar inmediatamente
    initApp();
}

// ────────────────────────────────────────────────────────────────────────────────
// ⚙️ FUNCIONES DE CONFIGURACIÓN GLOBAL
// ────────────────────────────────────────────────────────────────────────────────

// ── Configurar eventos globales ────────────────────────────────────────────────
function setupGlobalEventListeners() {
    // Evento para tecla Enter en input de pregunta
    document.addEventListener('keydown', function(e) {
        if (e.target.id === 'question-input' && e.key === 'Enter') {
            e.preventDefault();
            handleQuestionSubmit();
        }
    });

    // Eventos de clic globales
    document.addEventListener('click', function(e) {
        handleGlobalClickEvents(e);
    });
    
    console.log("✅ Eventos globales configurados");
}

/*
 * Inicializa los botones de sesión (login/logout) y configuración.
 * - Consulta `/api/user` para saber si hay un usuario autenticado.
 * - Muestra `login-btn` si no está autenticado.
 * - Muestra `logout-btn` si está autenticado.
 * - `config-btn` siempre visible y redirige a /settings.
 */
function initializeSessionControls() {
    // Obtener referencias a los botones que agregamos en index.html
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const configBtn = document.getElementById('config-btn');

    if (!loginBtn || !logoutBtn || !configBtn) {
        console.warn('Controles de sesión no encontrados en el DOM');
        return;
    }

    // Consultar el endpoint /api/user para obtener estado de autenticación
    // Si el usuario ya está autenticado, saltamos la introducción y vamos directo al contenido principal
    fetch('/api/user')
        .then(resp => resp.json())
        .then(data => {
            // Si el usuario está autenticado, mostrar logout y ocultar login
            if (data && data.authenticated) {
                // Marcar que el usuario está autenticado (para controlar el flujo tras el video)
                userIsAuthenticated = true;
                // Indicamos que, tras el video, debemos ir directamente a la app en vez del welcome
                skipToAppAfterIntro = true;
                // Usuario autenticado: ocultar login, mostrar logout
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-flex';

                // Mostrar avatar en la esquina: si tenemos picture la usamos, si no, mostramos inicial
                const avatarBtn = document.getElementById('avatar-btn');
                if (avatarBtn) {
                    avatarBtn.style.display = 'inline-flex';
                    // Limpiar contenido anterior
                    avatarBtn.innerHTML = '';

                    if (data.picture) {
                        // Crear imagen circular con la URL proporcionada por Google
                        const img = document.createElement('img');
                        img.src = data.picture;
                        img.alt = (data.name || data.email || 'Avatar');
                        avatarBtn.appendChild(img);
                    } else {
                        // Si no hay picture, mostrar iniciales del nombre
                        const initials = document.createElement('div');
                        initials.className = 'avatar-initials';
                        const name = data.name || data.email || 'U';
                        const parts = name.trim().split(' ');
                        let text = parts.length > 1 ? (parts[0][0] + parts[parts.length-1][0]) : name[0];
                        text = text.toUpperCase();
                        initials.textContent = text;
                        avatarBtn.appendChild(initials);
                    }

                    // Añadir title con nombre para accesibilidad
                    avatarBtn.title = data.name || data.email || 'Cuenta';
                }

                // Opcional: usar el nombre del usuario en el título del botón logout
                logoutBtn.title = 'Terminar sesión (' + (data.name || data.email || 'Usuario') + ')';
                
                // Recuperar pregunta pendiente expuesta por /api/user (si existe)
                if (data.pending_question) {
                    currentQuestion = data.pending_question;
                    skipToAppAfterIntro = true;
                    // Consumir la pregunta para que no vuelva a aparecer en futuros /api/user
                    fetch('/consume_pending_question', { method: 'POST', credentials: 'same-origin' })
                        .then(() => { /* consumida */ })
                        .catch(() => {});
                }

                // Si el backend reporta una preferencia de tarotista, aplicarla
                if (data.tarotista_style) {
                    try {
                        // Mapeo para nombres internos si es necesario
                        const map = { 'profesor':'professor', 'professor':'professor', 'nigromante':'nigromante', 'necro':'nigromante', 'gitano':'gitano', 'gypsy':'gitano', 'místico':'místico', 'mystic':'místico' };
                        const serverStyle = data.tarotista_style;
                        const mapped = map[serverStyle] || serverStyle;
                        selectedStyle = mapped;
                        changeBackgroundColor(selectedStyle);
                        // actualizar etiqueta
                        const styleLabel = document.getElementById('style-label');
                        if (styleLabel) {
                            // intentar buscar el texto de la opción
                            const opt = document.querySelector(`.settings-option[data-style="${serverStyle}"]`);
                            styleLabel.textContent = `Estilo: ${opt ? opt.textContent : serverStyle}`;
                        }
                    } catch (err) { console.warn('No se pudo aplicar tarotista del servidor:', err); }
                }

                // No forzamos ocultar el intro inmediatamente; dejamos que el video se reproduzca
                // y la transición correspondiente (transitionFromIntroToWelcome) decidirá si mostrar
                // el welcome o ir directamente a la app (ver dicha función).
            } else {
                // No autenticado: ocultar avatar y logout, mostrar login
                const avatarBtn = document.getElementById('avatar-btn');
                if (avatarBtn) {
                    avatarBtn.style.display = 'none';
                    avatarBtn.innerHTML = '';
                }
                loginBtn.style.display = 'inline-flex';
                logoutBtn.style.display = 'none';
            }
        })
        .catch(err => {
            console.error('Error consultando /api/user:', err);
            // Fallback: mostrar login
            loginBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
        });

    // Click en Iniciar sesión -> redirigir a la ruta del backend que inicia OAuth
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Redirigir a la ruta que construye la URL de Google OAuth en el servidor
        window.location.href = '/login/google';
    });

    // Click en Terminar sesión -> redirigir a /logout para que el backend borre la sesión
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Redirigir a /logout (backend limpia la sesión y redirige a /)
        window.location.href = '/logout';
    });

    // Click en Configuración -> navegar a la página de configuración
    configBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Lleva a /settings donde actualmente mostraremos "en construcción"
        window.location.href = '/settings';
    });

    // Click en Avatar -> navegar a /settings (perfil/configuración)
    const avatarBtnGlobal = document.getElementById('avatar-btn');
    if (avatarBtnGlobal) {
        avatarBtnGlobal.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/settings';
        });
    }
}



// ── Inicializar video introductorio ──────────────────────────────────────────────
// ── Inicializar video introductorio ──────────────────────────────────────────────
function initializeIntroVideo() {
    console.log("=== Inicializando Video Introductorio ===");
    
    // Obtener elementos del video
    introVideo = document.getElementById('intro-video');
    skipIntroBtn = document.getElementById('skip-intro');
    const introContainer = document.getElementById('intro-video-container');
    const videoLoading = document.getElementById('video-loading');
    
    // Verificar que los elementos existen
    if (!introVideo || !skipIntroBtn) {
        console.log("No se encontraron elementos de video, mostrando pantalla de bienvenida directamente");
        showWelcomeScreen();
        return;
    }
    
    // MOSTRAR LOADING
    if (videoLoading) {
        videoLoading.style.display = 'block';
    }
    
    // EVENTOS DEL VIDEO
    introVideo.addEventListener('loadeddata', () => {
        console.log("Video cargado correctamente");
        if (videoLoading) {
            videoLoading.style.display = 'none';
        }
    });
    
    introVideo.addEventListener('play', () => {
        console.log("Video comenzó a reproducirse");
        // Reproducir música de intro si existe
        const introMusic = document.getElementById('intro-music');
        if (introMusic) {
            introMusic.volume = 0.3;
            attemptToPlayMusic(introMusic);
        }
    });

    // Función para intentar reproducir música respetando las políticas de autoplay
    function attemptToPlayMusic(musicElement) {
        musicElement.play()
            .then(() => {
                console.log("Música de intro reproduciéndose correctamente");
            })
            .catch(error => {
                console.log("Música pausada - esperando interacción del usuario:", error.name);
                
                // Crear un listener para la primera interacción
                const firstInteractionHandler = () => {
                    musicElement.play()
                        .then(() => {
                            console.log("Música iniciada después de interacción del usuario");
                        })
                        .catch(err => {
                            console.log("Aún no se puede reproducir la música:", err);
                        });
                    
                    // Limpiar los listeners después de la primera interacción
                    document.removeEventListener('click', firstInteractionHandler);
                    document.removeEventListener('touchstart', firstInteractionHandler);
                    document.removeEventListener('keydown', firstInteractionHandler);
                };
                
                // Añadir listeners para diferentes tipos de interacción
                document.addEventListener('click', firstInteractionHandler);
                document.addEventListener('touchstart', firstInteractionHandler);
                document.addEventListener('keydown', firstInteractionHandler);
            });
    }
    
    introVideo.addEventListener('ended', () => {
        console.log("Video terminado");
        transitionFromIntroToWelcome();
    });
    
    introVideo.addEventListener('error', (e) => {
        console.error("Error en video:", e);
        // Si hay error, mostrar pantalla de bienvenida directamente
        if (introContainer) {
            introContainer.style.display = 'none';
        }
        showWelcomeScreen();
    });
    
    // Evento para botón saltar
    skipIntroBtn.addEventListener('click', () => {
        console.log("Usuario saltó el video introductorio");
        transitionFromIntroToWelcome();
    });
    
    // Intentar reproducir el video
    setTimeout(() => {
        if (introVideo.paused) {
            introVideo.play().catch(e => {
                console.log("Error al reproducir video automáticamente:", e);
                transitionFromIntroToWelcome();
            });
        }
    }, 500);
}

// ── Transición del video a pantalla de bienvenida ──────────────────────────────────
function transitionFromIntroToWelcome() {
    console.log("Iniciando transición del video a pantalla de bienvenida");
    
    const introContainer = document.getElementById('intro-video-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    
    if (!introContainer || !welcomeScreen) {
        console.error("No se encontraron elementos para la transición");
        return;
    }
    
    // Detener música de intro si está sonando
    const introMusic = document.getElementById('intro-music');
    if (introMusic) {
        introMusic.pause();
        introMusic.currentTime = 0;
    }
    
    // Fade out del video
    introContainer.style.opacity = '0';
    
    // Después del fade out, mostrar pantalla de bienvenida
    setTimeout(() => {
        introContainer.style.display = 'none';
        // Si el flujo indica saltar al app (usuario autenticado), mostrar la app directamente
        if (skipToAppAfterIntro) {
            showMainContent();
        } else {
            showWelcomeScreen();
        }
    }, 1); // Duración del fade out
}

// ── Mostrar pantalla de bienvenida ───────────────────────────────────────────────
function showWelcomeScreen() {
    console.log("Mostrando pantalla de bienvenida");
    
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('main-content');
    
    if (!welcomeScreen) {
        console.error("No se encontró la pantalla de bienvenida");
        return;
    }
    
    // APLICAR IMAGEN DE FONDO (reemplaza el fondo azul)
    welcomeScreen.style.backgroundImage = "url('" + FLASK_VARS.staticUrl + "videos/Frame-00096.png')";
    welcomeScreen.style.backgroundSize = "cover";
    welcomeScreen.style.backgroundPosition = "center";
    welcomeScreen.style.backgroundRepeat = "no-repeat";
    welcomeScreen.style.backgroundAttachment = "fixed";
    
    // Mostrar pantalla de bienvenida con fade suave
    welcomeScreen.style.opacity = "0";
    welcomeScreen.style.display = 'flex';
    
    // Fade in suave
    setTimeout(() => {
        welcomeScreen.style.transition = "opacity 0.8s ease";
        welcomeScreen.style.opacity = "1";
    }, 0);
    
    // Configurar elementos de la pantalla de bienvenida
    const welcomeQuestionInput = document.getElementById('welcome-question-input');
    const welcomeSubmitBtn = document.getElementById('welcome-submit-btn');
    const skipWelcome = document.getElementById('skip-welcome');
    
    // Eventos para la pantalla de bienvenida
    if (welcomeQuestionInput && welcomeSubmitBtn) {
        welcomeQuestionInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitWelcomeQuestion();
            }
        });
        
        welcomeSubmitBtn.addEventListener('click', submitWelcomeQuestion);
        skipWelcome.addEventListener('click', () => {
            showMainContent();
        });
    }
    
    // Poner foco en el input después de un breve momento
    setTimeout(() => {
        if (welcomeQuestionInput) {
            welcomeQuestionInput.focus();
        }
    }, 1000);

// (Antes se configuraban los eventos aquí; ahora se registran siempre al cargar el DOM)

}

// ────────────────────────────────────────────────────────────────────────────────
// 🎯 FUNCIONES DE CONTROL DE FLUJO GLOBAL
// ────────────────────────────────────────────────────────────────────────────────


// ── Manejador de eventos de clic globales ──────────────────────────────────────
function handleGlobalClickEvents(e) {
    // Botón Settings (protegido): la UI de settings pudo haber sido movida.
    if (e.target.id === 'settings-btn') {
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) {
            settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
        }
    }
    
    // Botón Ask me!
    if (e.target.id === 'ask-btn') {
        const questionArea = document.getElementById('question-area');
        questionArea.style.display = 'block';
        document.getElementById('question-input').focus();
    }
    
    // Botón Submit pregunta
    if (e.target.id === 'submit-question') {
        handleQuestionSubmit();
    }
    
    // Botón Cancel pregunta
    if (e.target.id === 'cancel-question') {
        const questionArea = document.getElementById('question-area');
        questionArea.style.display = 'none';
        const questionInput = document.getElementById('question-input');
        questionInput.value = currentQuestion;
    }
}

// Inicializa la funcionalidad del botón "Tarotista" que vive únicamente en la
// página de configuración (/settings). Es segura: si los elementos no existen,
// no hace nada. Maneja abrir/cerrar el menú y seleccionar un estilo de lectura.
function initializeTarotistaMenu() {
    const btn = document.getElementById('tarotista-btn');
    const menu = document.getElementById('tarotista-menu');
    if (!btn || !menu) return; // no estamos en la página de settings

    // Toggle del menú
    // Marcar atributo aria para accesibilidad
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    function toggleTarotistaMenu() {
        const isOpen = (menu.style.display === 'block');
        menu.style.display = isOpen ? 'none' : 'block';
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTarotistaMenu();
    });

    // Delegated fallback: si por alguna razón el click directo no llega al botón
    // (por capas o superposiciones), permitimos que un click dentro del wrapper
    // active el botón. Esto evita que el menú quede inaccesible.
    const wrapper = btn.closest('.tarotista-wrapper');
    if (wrapper) {
        wrapper.addEventListener('click', (e) => {
            // Si el click fue en el botón, ya está manejado; aquí cubrimos otros targets
            if (e.target === btn || btn.contains(e.target)) return;
            // Si se hizo click en el wrapper (no en el menú), abrimos el menú
            const clickedMenu = e.target.closest('#tarotista-menu');
            if (!clickedMenu) {
                e.stopPropagation();
                toggleTarotistaMenu();
            }
        });
    }

    // Mapa de nombres del menú a las llaves usadas por changeBackgroundColor
    const tarotistaStyleMap = {
        'profesor': 'professor', // corrección de idioma
        'coaching': 'coaching',
        'nigromante': 'nigromante',
        'gitano': 'gitano',
        'místico': 'místico'
    };

    // Selección de opción
    menu.querySelectorAll('.settings-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const selected = opt.getAttribute('data-style');

            // Función que aplica el estilo en el cliente (UI) — llamada tras persistencia
            function applySelection() {
                try { localStorage.setItem('selected_tarotista_style', selected); } catch (err) { /* ignore */ }
                const mapped = tarotistaStyleMap[selected] || selected;
                selectedStyle = mapped;
                changeBackgroundColor(selectedStyle);
                const styleLabel = document.getElementById('style-label');
                if (styleLabel) styleLabel.textContent = `Estilo: ${opt.textContent}`;
                menu.querySelectorAll('.settings-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                menu.style.display = 'none';
                const msg = document.createElement('div');
                msg.className = 'toast';
                msg.textContent = `Seleccionado: ${opt.textContent}`;
                document.body.appendChild(msg);
                setTimeout(() => msg.remove(), 1800);
            }

            // Si el usuario está autenticado, persistir en el servidor primero
            if (userIsAuthenticated) {
                fetch('/save_tarotista_style', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ style: selected })
                }).then(r => r.json())
                .then(data => {
                    if (data && data.ok) {
                        applySelection();
                    } else {
                        console.warn('No se pudo guardar preferencia en servidor:', data.error);
                        // fallback al cliente
                        applySelection();
                    }
                }).catch(err => {
                    console.error('Error guardando preferencia en servidor:', err);
                    applySelection();
                });
            } else {
                // No autenticado: persistencia local
                applySelection();
            }
        });
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (menu.style.display === 'block' && !menu.contains(e.target) && e.target !== btn) {
            menu.style.display = 'none';
        }
    });
}

// ── Manejador de submit de pregunta ──────────────────────────────────────────────
function handleQuestionSubmit() {
    const questionInput = document.getElementById('question-input');
    currentQuestion = questionInput.value.trim();
    const questionArea = document.getElementById('question-area');
    questionArea.style.display = 'none';
    const interpretationContent = document.getElementById('interpretation-content');
    if (currentQuestion) {
        interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
    } else {
        interpretationContent.innerHTML = '<p>¿Qué pregunta tienes para las cartas del destino?</p>';
    }
}





// ── Procesar pregunta de bienvenida ───────────────────────────────────────────────
function submitWelcomeQuestion() {
    const welcomeQuestionInput = document.getElementById('welcome-question-input');
    if (!welcomeQuestionInput) return;
    
    const question = welcomeQuestionInput.value.trim();
    if (question) {
        // Si el usuario ya está autenticado, comportarse como antes
        if (userIsAuthenticated) {
            currentQuestion = question;
            // Mostrar la pregunta en el área de interpretación
            const interpretationContent = document.getElementById('interpretation-content');
            if (interpretationContent) {
                interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${question}</p>`;
            }
            // Transición a la interfaz principal
            showMainContent();
            // Automáticamente sacar las cartas después de un breve momento
            setTimeout(() => {
                const tryBtn = document.getElementById('try-btn');
                if (tryBtn) {
                    tryBtn.click();
                }
            }, 300);
        } else {
            // No autenticado: guardar la pregunta en el servidor y redirigir a login
            fetch('/save_pending_question', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            })
            .then(resp => resp.json())
            .then(data => {
                if (data && data.ok) {
                    window.location.href = '/login/google';
                } else {
                    alert('No se pudo guardar la pregunta: ' + (data.error || 'Error'));
                }
            })
            .catch(err => {
                console.error('Error guardando la pregunta pendiente:', err);
                alert('Error conectando con el servidor. Intenta de nuevo.');
            });
        }
    }
}

// ── Mostrar contenido principal ───────────────────────────────────────────────────
function showMainContent() {
    console.log("Mostrando contenido principal");
    
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('main-content');
    
    if (!mainContent) {
        console.error("No se encontró el contenido principal");
        return;
    }
    
    // Ocultar pantalla de bienvenida
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    
    // Mostrar interfaz principal
    mainContent.style.display = 'block';
    
    // Asegurar que el estilo por defecto se aplique
    changeBackgroundColor('coaching');
    
    // Configurar elementos del contenido principal DESPUÉS de mostrarlo
    setupMainContentEvents();
    // Si hay una pregunta almacenada (viene desde welcome antes del login), mostrarla
    if (currentQuestion && currentQuestion.trim() !== '') {
        const interpretationContentEl = document.getElementById('interpretation-content');
        if (interpretationContentEl) {
            interpretationContentEl.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
        }
        // Sacar cartas automáticamente
        setTimeout(() => {
            const tryBtn = document.getElementById('try-btn');
            if (tryBtn) tryBtn.click();
        }, 300);
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// ⚙️ FUNCIONES DE CONFIGURACIÓN PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────────

// ── Configurar eventos del contenido principal ───────────────────────────────────
function setupMainContentEvents() {
    // Elementos del DOM - Verificación robusta
    tryBtn = document.getElementById('try-btn');
    solveBtn = document.getElementById('solve-btn');
    card1 = document.getElementById('card1');
    card2 = document.getElementById('card2');
    card1Name = document.getElementById('card1-name');
    card2Name = document.getElementById('card2-name');
    interpretationContent = document.getElementById('interpretation-content');
    loading = document.getElementById('loading');
    flipSound = document.getElementById('flip-sound');
    chimeSound = document.getElementById('chime-sound');
    
    // Event listeners para el contenido principal
    if (tryBtn) tryBtn.addEventListener('click', getRandomCards);
    if (solveBtn) solveBtn.addEventListener('click', getInterpretation);
    
    // Elementos adicionales
    const clearBtn = document.getElementById('clear-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const askBtn = document.getElementById('ask-btn');
    const questionArea = document.getElementById('question-area');
    const questionInput = document.getElementById('question-input');
    const submitQuestion = document.getElementById('submit-question');
    const cancelQuestion = document.getElementById('cancel-question');
    const settingsMenu = document.getElementById('settings-menu');
    
    // Event listeners adicionales
    clearBtn?.addEventListener('click', clearAll);
    
    // Agregar evento para la tecla Enter en el input de pregunta
    questionInput?.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevenir el comportamiento por defecto
            submitQuestionHandler();
        }
    });
    
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-menu') && !e.target.matches('#settings-btn')) {
            settingsMenu.style.display = 'none';
        }
        if (!e.target.closest('.question-area') && !e.target.matches('#ask-btn')) {
            if (questionArea && questionArea.style.display === 'block') {
                questionArea.style.display = 'none';
                if (questionInput) {
                    questionInput.value = currentQuestion;
                }
            }
        }
    });
    
    // Manejar selección de estilo
    document.querySelectorAll('.settings-option').forEach(option => {
        option.addEventListener('click', () => {
            selectedStyle = option.dataset.style;
            settingsMenu.style.display = 'none';
            const styleLabel = document.getElementById('style-label');
            if (styleLabel) {
                styleLabel.textContent = `Estilo: ${option.textContent}`;
            }
            
            // Cambiar el color de fondo según el estilo seleccionado
            changeBackgroundColor(selectedStyle);
        });
    });
    
    // Configuración inicial
    const currentYear = document.querySelector('#current-year');
    if (currentYear) {
        currentYear.textContent = FLASK_VARS.year;
    }
    
    console.log("✅ Eventos del contenido principal configurados");
}

// ────────────────────────────────────────────────────────────────────────────────
// 🃏 FUNCIONES DE CARTAS
// ────────────────────────────────────────────────────────────────────────────────

// ── Obtener cartas aleatorias ─────────────────────────────────────────────────────
function getRandomCards() {
    console.log("Botón Try clickeado - Iniciando proceso");
    
    // Asegurarnos que los sonidos estén habilitados
    if (!soundEnabled && flipSound) {
        soundEnabled = true;
        flipSound.load();
        console.log("Sonidos habilitados en primer clic");
    }
    
    // Prevenir múltiples clics durante la animación
    if (animationInProgress) {
        console.log("Animación en progreso, ignorando clic");
        return;
    }
    
    animationInProgress = true;
    
    // Deshabilitar botones inmediatamente
    if (tryBtn) tryBtn.disabled = true;
    if (solveBtn) solveBtn.disabled = true;
    
    // PASO 1: BORRAR LAS IMÁGENES ACTUALES
    console.log("Paso 1: Limpiando imágenes anteriores");
    if (card1) card1.innerHTML = '';
    if (card2) card2.innerHTML = '';
    if (card1Name) card1Name.textContent = '';
    if (card2Name) card2Name.textContent = '';
    
    // PASO 2: Mostrar inmediatamente la imagen predeterminada
    console.log("Paso 2: Mostrando imagen predeterminada");
    if (card1) card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
    if (card2) card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
    
    // PASO 3: Obtener cartas aleatorias SIMULTÁNEAMENTE con el sonido
    console.log("Paso 3: Iniciando petición de cartas y reproduciendo sonido simultáneamente");
    
    // Hacer la petición de cartas
    const cardsPromise = fetch('/get_random_cards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    // Reproducir sonido SIMULTÁNEAMENTE
    playSound(flipSound, 0.6); // No usamos callback para que sea simultáneo
    
    // Esperar a que lleguen las cartas
    cardsPromise
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la red: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Guardar cartas actuales
            currentCards = {
                card1: data.card1,
                card2: data.card2
            };
            
            // Mostrar cartas SIMULTÁNEAMENTE
            displayCards(data.card1, data.card2);
            
            // Habilitar botón de interpretación
            if (solveBtn) solveBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error:', error);
            if (interpretationContent) {
                interpretationContent.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            }
            
            // Restaurar imagen predeterminada
            if (card1) card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
            if (card2) card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
        })
        .finally(() => {
            // Habilitar botón Try
            if (tryBtn) tryBtn.disabled = false;
            animationInProgress = false;
        });
}

// ── Mostrar cartas obtenidas ───────────────────────────────────────────────────────
function displayCards(card1Data, card2Data) {
    console.log("Mostrando cartas:", card1Data, card2Data);
    
    // Carta 1
    if (card1) {
        const img1 = document.createElement('img');
        img1.src = `${FLASK_VARS.staticUrl}/images/tarot/${card1Data.filename}`;
        img1.alt = card1Data.name;
        img1.className = card1Data.reversed ? 'reversed' : '';
        card1.innerHTML = '';
        card1.appendChild(img1);
    }
    
    if (card1Name) {
        card1Name.textContent = card1Data.name;
        card1Name.style.color = card1Data.color;
    }
    
    // Carta 2
    if (card2) {
        const img2 = document.createElement('img');
        img2.src = `${FLASK_VARS.staticUrl}/images/tarot/${card2Data.filename}`;
        img2.alt = card2Data.name;
        img2.className = card2Data.reversed ? 'reversed' : '';
        card2.innerHTML = '';
        card2.appendChild(img2);
    }
    
    if (card2Name) {
        card2Name.textContent = card2Data.name;
        card2Name.style.color = card2Data.color;
    }
    
    // Actualizar área de interpretación
    if (interpretationContent) {
        interpretationContent.innerHTML = '';
        if (currentQuestion) {
            interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
        }
    }
}

// ── Limpiar todas las cartas ───────────────────────────────────────────────────────
function clearAll() {
    // Limpiar cartas
    if (card1) card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
    if (card2) card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
    if (card1Name) card1Name.textContent = '';
    if (card2Name) card2Name.textContent = '';
    
    // Limpiar interpretación
    if (interpretationContent) {
        interpretationContent.innerHTML = '<p>¿Qué pregunta tienes para las cartas del destino?</p>';
    }
    
    // Resetear variables
    currentCards = null;
    currentQuestion = '';
    if (solveBtn) solveBtn.disabled = true;
    animationInProgress = false;
    
    // Volver al color de fondo por defecto
    changeBackgroundColor('coaching');
}

// ────────────────────────────────────────────────────────────────────────────────
// 🔮 FUNCIONES DE INTERPRETACIÓN
// ────────────────────────────────────────────────────────────────────────────────

// ── Obtener interpretación de las cartas ────────────────────────────────────────────
function getInterpretation() {
    console.log("Botón Solve clickeado");
    
    if (!currentCards) {
        alert('Primero debes sacar cartas');
        return;
    }
    
    // Reproducir sonido
    playSound(chimeSound, 0.4, () => {
        console.log("Sonido reproducido, mostrando animación de carga");
        
        // Mostrar animación de carga
        if (interpretationContent) interpretationContent.style.display = 'none';
        if (loading) loading.style.display = 'block';
        
        // Preparar datos para enviar
        const data = {
            question: currentQuestion,
            card1: currentCards.card1.name,
            card2: currentCards.card2.name,
            style: selectedStyle
        };
        
        // Obtener interpretación
        fetch('/get_interpretation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener la interpretación');
            }
            return response.json();
        })
        .then(data => {
            console.log("Interpretación recibida:", data);
            
            // Ocultar carga y mostrar interpretación
            if (loading) loading.style.display = 'none';
            if (interpretationContent) interpretationContent.style.display = 'block';
            
            // Mostrar pregunta si existe
            let content = '';
            if (currentQuestion) {
                content += `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
            }
            
            // Mostrar interpretación
            content += `<div class="interpretation-header">✨ Interpretación ✨</div>`;
            content += `<div class="interpretation-text">${data.interpretation.replace(/\n/g, '<br>')}</div>`;
            
            // Añadir fecha y hora
            content += `<div class="timestamp">Generado el: ${data.timestamp}</div>`;
            
            if (interpretationContent) interpretationContent.innerHTML = content;
        })
        .catch(error => {
            console.error('Error:', error);
            if (loading) loading.style.display = 'none';
            if (interpretationContent) interpretationContent.style.display = 'block';
            if (interpretationContent) interpretationContent.innerHTML = `
                <p class="error">
                    Error al obtener la interpretación. Por favor, intenta de nuevo.
                </p>
                <p class="error-details">${error.message}</p>
            `;
        });
    });
}

// ── Manejar submit de pregunta ──────────────────────────────────────────────────────
function submitQuestionHandler() {
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
        currentQuestion = questionInput.value.trim();
    }
    
    const questionArea = document.getElementById('question-area');
    if (questionArea) {
        questionArea.style.display = 'none';
    }
    
    // Actualizar área de interpretación
    if (interpretationContent) {
        if (currentQuestion) {
            interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
        } else {
            interpretationContent.innerHTML = '<p>¿Qué pregunta tienes para las cartas del destino?</p>';
        }
    }
}


// ────────────────────────────────────────────────────────────────────────────────
// 🔐 FUNCIONES DE AUTENTICACIÓN
// ────────────────────────────────────────────────────────────────────────────────

// ── Verificar estado de autenticación ──────────────────────────────────────────────
function checkAuthStatus() {
    console.log("Verificando estado de autenticación...");
    
    fetch('/api/user')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(user => {
            console.log("Estado de autenticación:", user);
            
            if (user.authenticated) {
                // Usuario logueado - mostrar interfaz principal
                showMainInterfaceForAuthenticatedUser(user);
            } else {
                // Usuario no logueado - mantener comportamiento actual
                console.log("Usuario no autenticado, continuando flujo normal");
            }
        })
        .catch(error => {
            console.log("Error verificando autenticación:", error);
            // Continuar con flujo normal si hay error
        });
}

// ── Mostrar interfaz principal para usuarios logueados ──────────────────────────────
function showMainInterfaceForAuthenticatedUser(userData) {
    console.log("Mostrando interfaz para usuario autenticado:", userData);
    
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('main-content');
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    
    if (mainContent) {
        mainContent.style.display = 'block';
        // Personalizar título con nombre del usuario
        const headerTitle = document.querySelector('header h1');
        if (headerTitle && userData.name) {
            headerTitle.textContent = `Tarot Reader by Bertha S. - ¡Hola, ${userData.name.split(' ')[0]}!`;
        }
        
        // Configurar eventos principales
        setupMainContentEvents();
    }
}

// ── Llamar a la verificación de autenticación cuando el DOM esté listo ───────────────
document.addEventListener('DOMContentLoaded', () => {
    // ... tu código existente ...
    
    // Agregar esta línea al final de tu DOMContentLoaded existente:
    checkAuthStatus(); // ✅ Verificar autenticación al cargar
});




// ────────────────────────────────────────────────────────────────────────────────
// 🎵 FUNCIONES DE AUDIO
// ────────────────────────────────────────────────────────────────────────────────

// ── Reproducir sonido ───────────────────────────────────────────────────────────────
function playSound(soundElement, volume = 1.0, onSuccess = () => {}) {
    if (!soundElement) {
        console.log("Sonido no disponible");
        onSuccess();
        return;
    }
    
    try {
        // Asegurarnos que el sonido esté habilitado
        soundEnabled = true;
        
        // Configurar el sonido
        soundElement.volume = volume;
        soundElement.currentTime = 0;
        
        // Reproducir el sonido
        soundElement.play()
            .then(() => {
                console.log("Sonido comenzado");
                
                // Si el sonido termina, llamar al callback
                soundElement.onended = () => {
                    onSuccess();
                };
            })
            .catch(e => {
                console.log("Error al reproducir sonido:", e);
                onSuccess();
            });
    } catch (e) {
        console.error("Error al intentar reproducir sonido:", e);
        onSuccess();
    }
}

// ── Inicializar sonidos ────────────────────────────────────────────────────────────
function initializeSounds() {
    // Cargar los sonidos inmediatamente
    if (flipSound) {
        flipSound.load();
    }
    if (chimeSound) {
        chimeSound.load();
    }
    
    // Intentar pre-reproducir un sonido silencioso para desbloquear la API de audio
    setTimeout(() => {
        if (flipSound) {
            flipSound.volume = 0;
            flipSound.play().then(() => {
                flipSound.pause();
                flipSound.currentTime = 0;
                soundEnabled = true;
                console.log("Sonidos desbloqueados para primera reproducción");
            }).catch(e => {
                console.log("Sonidos aún no desbloqueados, se habilitarán en el primer clic");
            });
        }
    }, 100);
}

// ────────────────────────────────────────────────────────────────────────────────
// 🎨 FUNCIONES DE UI/VISUAL
// ────────────────────────────────────────────────────────────────────────────────

// ── Cambiar color de fondo según estilo ─────────────────────────────────────────────
function changeBackgroundColor(style) {
    const color = styleColors[style] || styleColors['coaching'];
    document.body.style.background = `linear-gradient(135deg, ${color} 0%, #14213d 100%)`;
    
    // Opcional: También puedes cambiar el color de otros elementos
    const container = document.querySelector('.container');
    if (container) {
        container.style.background = `linear-gradient(135deg, ${color} 0%, #14213d 100%)`;
    }
    
    console.log(`Color de fondo cambiado a: ${color} para el estilo: ${style}`);
}

// ── Toggle menú de configuración ───────────────────────────────────────────────────
function toggleSettingsMenu() {
    const settingsMenu = document.getElementById('settings-menu');
    if (settingsMenu) {
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    }
}

// ── Toggle área de pregunta ───────────────────────────────────────────────────────────
function toggleQuestionArea() {
    const questionArea = document.getElementById('question-area');
    const questionInput = document.getElementById('question-input');
    
    if (questionArea) {
        questionArea.style.display = questionArea.style.display === 'block' ? 'none' : 'block';
        if (questionArea.style.display === 'block' && questionInput) {
            questionInput.value = currentQuestion;
            questionInput.focus();
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// 🚀 INICIALIZACIÓN FINAL
// ────────────────────────────────────────────────────────────────────────────────

// Inicializar sonidos inmediatamente
initializeSounds();