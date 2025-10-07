// Variables globales
let currentCards = null;
let selectedStyle = 'coaching';
let currentQuestion = '';
let soundEnabled = false;
let flipSound, chimeSound;
let tryBtn, solveBtn, card1, card2, card1Name, card2Name;
let interpretationContent, loading;
let animationInProgress = false;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("=== Inicio de la aplicación Tarot ===");
    
    // Verificar que FLASK_VARS está definido
    if (typeof FLASK_VARS === 'undefined') {
        console.error("ERROR CRÍTICO: FLASK_VARS no está definido. Verifica que esté en el HTML antes de cargar este script.");
        document.body.innerHTML = `
            <div style="color: red; padding: 20px; background: #2c394b; border-radius: 10px; max-width: 800px; margin: 50px auto;">
                <h1>❌ Error Crítico</h1>
                <p>Las variables de Flask no están definidas. Esto suele ocurrir cuando:</p>
                <ul>
                    <li>El script se carga antes de definir FLASK_VARS en el HTML</li>
                    <li>Hay un error en el renderizado de Flask</li>
                </ul>
                <p>Solución:</p>
                <ol>
                    <li>Verifica que el bloque de FLASK_VARS esté en el <head> ANTES de cargar script.js</li>
                    <li>Revisa que en index.html tengas: <script>const FLASK_VARS = {...}</script></li>
                </ol>
            </div>
        `;
        return;
    }
    
    console.log("FLASK_VARS:", FLASK_VARS);
    
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
    
    // Verificar que los elementos críticos existan
    const missingElements = [];
    if (!tryBtn) missingElements.push('try-btn');
    if (!card1) missingElements.push('card1');
    if (!card2) missingElements.push('card2');
    if (!interpretationContent) missingElements.push('interpretation-content');
    if (!loading) missingElements.push('loading');
    
    if (missingElements.length > 0) {
        console.error("ERROR: Elementos del DOM no encontrados:", missingElements);
        if (document.getElementById('interpretation-content')) {
            document.getElementById('interpretation-content').innerHTML = `
                <p class="error">
                    <strong>Error crítico:</strong> Elementos HTML faltantes: ${missingElements.join(', ')}
                </p>
                <p class="error-details">
                    Verifica que los IDs en index.html coincidan con los del JavaScript
                </p>
            `;
        }
        return;
    }
    
    // Event listeners
    console.log("Vinculando evento click a try-btn");
    tryBtn.addEventListener('click', getRandomCards);
    solveBtn.addEventListener('click', getInterpretation);
    
    // Configuración inicial
    document.querySelector('#current-year').textContent = FLASK_VARS.year;
    
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
    clearBtn.addEventListener('click', clearAll);
    settingsBtn.addEventListener('click', toggleSettingsMenu);
    askBtn.addEventListener('click', toggleQuestionArea);
    submitQuestion.addEventListener('click', submitQuestionHandler);
    cancelQuestion.addEventListener('click', () => {
        questionArea.style.display = 'none';
        questionInput.value = currentQuestion;
    });
    
    // Agregar evento para la tecla Enter en el input de pregunta
    questionInput.addEventListener('keypress', function(event) {
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
        });
    });
    
    // Inicializar sonidos inmediatamente después de la carga del DOM
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
                    // El sonido se habilitará en el primer clic real
                });
            }
        }, 100);
    }
    
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
    
    // Mensaje de éxito
    console.log("✅ Aplicación Tarot inicializada correctamente");
});