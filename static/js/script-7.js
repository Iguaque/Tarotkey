// Variables globales
let currentCards = null;
let selectedStyle = 'coaching';
let currentQuestion = '';
let soundEnabled = false;
let flipSound, chimeSound;
let tryBtn, solveBtn, card1, card2, card1Name, card2Name;
let interpretationContent, loading;
let animationInProgress = false;

// Paleta de colores por tarotista
const styleColors = {
    'professor': '#3a506b',      // Azul académico
    'coaching': '#34495e',       // Gris azulado profesional
    'nigromante': '#1a1a2e',     // Negro profundo con toque azul
    'gitano': '#2d1b69',         // Púrpura místico
    'místico': '#1d2d44'         // Azul profundo místico
};

// Mensaje de inicio
console.log("=== Inicio de la aplicación Tarot - Script Cargado ===");

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("=== DOM Content Loaded - Iniciando ===");
    
    // Verificar que FLASK_VARS está definido
    if (typeof FLASK_VARS === 'undefined') {
        console.error("ERROR CRÍTICO: FLASK_VARS no está definido");
        return;
    }
    
    console.log("FLASK_VARS:", FLASK_VARS);



    
    // Configurar eventos inmediatos para la interfaz principal
    document.addEventListener('click', function(e) {
        if (e.target.id === 'settings-btn') {
            const settingsMenu = document.getElementById('settings-menu');
            settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
        }
        if (e.target.id === 'ask-btn') {
            const questionArea = document.getElementById('question-area');
            questionArea.style.display = 'block';
            document.getElementById('question-input').focus();
        }
    });






    // Elementos de la pantalla de bienvenida
    const blackScreen = document.getElementById('black-screen');
    const mainContent = document.getElementById('main-content');
    const welcomeQuestionInput = document.getElementById('welcome-question-input');
    const welcomeSubmitBtn = document.getElementById('welcome-submit-btn');
    const skipWelcome = document.getElementById('skip-welcome');
    
    console.log("Elementos de bienvenida encontrados:", {
        blackScreen: !!blackScreen,
        mainContent: !!mainContent,
        welcomeQuestionInput: !!welcomeQuestionInput,
        welcomeSubmitBtn: !!welcomeSubmitBtn,
        skipWelcome: !!skipWelcome
    });
    
    // Evento para la pantalla de bienvenida
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
    
    // Mensaje de éxito
    console.log("✅ Aplicación Tarot inicializada correctamente");
    
    function submitWelcomeQuestion() {
        const question = welcomeQuestionInput.value.trim();
        if (question) {
            currentQuestion = question;
            // Mostrar la pregunta en el área de interpretación
            if (interpretationContent) {
                interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${question}</p>`;
            }
            // Transición a la interfaz principal
            showMainContent();
            // Automáticamente sacar las cartas después de un breve momento
            setTimeout(() => {
                if (tryBtn) {
                    tryBtn.click();
                }
            }, 300);
        }
    }
    
    function showMainContent() {
        console.log("Mostrando contenido principal");
        // Ocultar pantalla de bienvenida
        if (blackScreen) {
            blackScreen.style.display = 'none';
        }
        // Mostrar interfaz principal
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        // Asegurar que el estilo por defecto se aplique
        changeBackgroundColor('coaching');
        
        // Configurar elementos del contenido principal DESPUÉS de mostrarlo
        setupMainContentEvents();

        // Asegurar que los eventos estén disponibles inmediatamente
        const settingsBtn = document.getElementById('settings-btn');
        const askBtn = document.getElementById('ask-btn');
        if (settingsBtn) settingsBtn.addEventListener('click', toggleSettingsMenu);
        if (askBtn) askBtn.addEventListener('click', toggleQuestionArea);


    }
    
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
        submitQuestion?.addEventListener('click', submitQuestionHandler);
        cancelQuestion?.addEventListener('click', () => {
            questionArea.style.display = 'none';
            questionInput.value = currentQuestion;
        });
        
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
                if (questionArea.style.display === 'block') {
                    questionArea.style.display = 'none';
                    questionInput.value = currentQuestion;
                }
            }
        });
        
        // Manejar selección de estilo
        document.querySelectorAll('.settings-option').forEach(option => {
            option.addEventListener('click', () => {
                selectedStyle = option.dataset.style;
                settingsMenu.style.display = 'none';
                document.getElementById('style-label').textContent = `Estilo: ${option.textContent}`;
                
                // Cambiar el color de fondo según el estilo seleccionado
                changeBackgroundColor(selectedStyle);
            });
        });
        
        // Configuración inicial
        document.querySelector('#current-year').textContent = FLASK_VARS.year;
        
        console.log("✅ Eventos del contenido principal configurados");



    }
    
    // Funciones completas del script...
    
    // Función principal - ACTUALIZADA para que sonido y cartas ocurran simultáneamente
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
        tryBtn.disabled = true;
        solveBtn.disabled = true;
        
        // PASO 1: BORRAR LAS IMÁGENES ACTUALES
        console.log("Paso 1: Limpiando imágenes anteriores");
        card1.innerHTML = '';
        card2.innerHTML = '';
        card1Name.textContent = '';
        card2Name.textContent = '';
        
        // PASO 2: Mostrar inmediatamente la imagen predeterminada
        console.log("Paso 2: Mostrando imagen predeterminada");
        card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
        card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
        
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
                solveBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                interpretationContent.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                
                // Restaurar imagen predeterminada
                card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
                card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
            })
            .finally(() => {
                // Habilitar botón Try
                tryBtn.disabled = false;
                animationInProgress = false;
            });
    }
    
    function displayCards(card1Data, card2Data) {
        console.log("Mostrando cartas:", card1Data, card2Data);
        
        // Carta 1
        const img1 = document.createElement('img');
        img1.src = `${FLASK_VARS.staticUrl}/images/tarot/${card1Data.filename}`;
        img1.alt = card1Data.name;
        img1.className = card1Data.reversed ? 'reversed' : '';
        card1.innerHTML = '';
        card1.appendChild(img1);
        
        if (card1Name) {
            card1Name.textContent = card1Data.name;
            card1Name.style.color = card1Data.color;
        }
        
        // Carta 2
        const img2 = document.createElement('img');
        img2.src = `${FLASK_VARS.staticUrl}/images/tarot/${card2Data.filename}`;
        img2.alt = card2Data.name;
        img2.className = card2Data.reversed ? 'reversed' : '';
        card2.innerHTML = '';
        card2.appendChild(img2);
        
        if (card2Name) {
            card2Name.textContent = card2Data.name;
            card2Name.style.color = card2Data.color;
        }
        
        // Actualizar área de interpretación
        interpretationContent.innerHTML = '';
        if (currentQuestion) {
            interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
        }
    }
    
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
            interpretationContent.style.display = 'none';
            loading.style.display = 'block';
            
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
                loading.style.display = 'none';
                interpretationContent.style.display = 'block';
                
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
                
                interpretationContent.innerHTML = content;
            })
            .catch(error => {
                console.error('Error:', error);
                loading.style.display = 'none';
                interpretationContent.style.display = 'block';
                interpretationContent.innerHTML = `
                    <p class="error">
                        Error al obtener la interpretación. Por favor, intenta de nuevo.
                    </p>
                    <p class="error-details">${error.message}</p>
                `;
            });
        });
    }
    
    function clearAll() {
        // Limpiar cartas
        card1.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 1" class="default-card">`;
        card2.innerHTML = `<img src="${FLASK_VARS.staticUrl}/images/${FLASK_VARS.defaultImage}" alt="Carta 2" class="default-card">`;
        card1Name.textContent = '';
        card2Name.textContent = '';
        
        // Limpiar interpretación
        interpretationContent.innerHTML = '<p>¿Qué pregunta tienes para las cartas del destino?</p>';
        
        // Resetear variables
        currentCards = null;
        currentQuestion = '';
        solveBtn.disabled = true;
        animationInProgress = false;
        
        // Volver al color de fondo por defecto
        changeBackgroundColor('coaching');
    }
    
    function toggleSettingsMenu() {
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    }
    
    function toggleQuestionArea() {
        questionArea.style.display = questionArea.style.display === 'block' ? 'none' : 'block';
        if (questionArea.style.display === 'block') {
            questionInput.value = currentQuestion;
            questionInput.focus();
        }
    }
    
    function submitQuestionHandler() {
        currentQuestion = questionInput.value.trim();
        questionArea.style.display = 'none';
        
        // Actualizar área de interpretación
        if (currentQuestion) {
            interpretationContent.innerHTML = `<p class="question-display">Pregunta: ${currentQuestion}</p>`;
        } else {
            interpretationContent.innerHTML = '<p>¿Qué pregunta tienes para las cartas del destino?</p>';
        }
    }
    
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
    
    // Inicializar sonidos inmediatamente
    initializeSounds();
    
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

});