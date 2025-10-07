import os
import random
import json
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory


from dotenv import load_dotenv
import os

load_dotenv()  # Carga las variables del archivo .env



app = Flask(__name__)

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'tarot')
EXPLANATIONS_FILE = os.path.join(BASE_DIR, 'El Loco2.txt')
DEFAULT_IMAGE = 'TarocchiBN2.jpg'

# Diccionario completo de equivalencias
CARD_NAMES = {
    'Cups01.jpg': ('As de Copas', 'As de Copas (Invertida)'),
    'Cups02.jpg': ('Dos de Copas', 'Dos de Copas (Invertida)'),
    'Cups03.jpg': ('Tres de Copas', 'Tres de Copas (Invertida)'),
    'Cups04.jpg': ('Cuatro de Copas', 'Cuatro de Copas (Invertida)'),
    'Cups05.jpg': ('Cinco de Copas', 'Cinco de Copas (Invertida)'),
    'Cups06.jpg': ('Seis de Copas', 'Seis de Copas (Invertida)'),
    'Cups07.jpg': ('Siete de Copas', 'Siete de Copas (Invertida)'),
    'Cups08.jpg': ('Ocho de Copas', 'Ocho de Copas (Invertida)'),
    'Cups09.jpg': ('Nueve de Copas', 'Nueve de Copas (Invertida)'),
    'Cups10.jpg': ('Diez de Copas', 'Diez de Copas (Invertida)'),
    'Cups11.jpg': ('Sota de Copas', 'Sota de Copas (Invertida)'),
    'Cups12.jpg': ('Caballero de Copas', 'Caballero de Copas (Invertida)'),
    'Cups13.jpg': ('Reina de Copas', 'Reina de Copas (Invertida)'),
    'Cups14.jpg': ('Rey de Copas', 'Rey de Copas (Invertida)'),
    'Pents01.jpg': ('As de Oros', 'As de Oros (Invertida)'),
    'Pents02.jpg': ('Dos de Oros', 'Dos de Oros (Invertida)'),
    'Pents03.jpg': ('Tres de Oros', 'Tres de Oros (Invertida)'),
    'Pents04.jpg': ('Cuatro de Oros', 'Cuatro de Oros (Invertida)'),
    'Pents05.jpg': ('Cinco de Oros', 'Cinco de Oros (Invertida)'),
    'Pents06.jpg': ('Seis de Oros', 'Seis de Oros (Invertida)'),
    'Pents07.jpg': ('Siete de Oros', 'Siete de Oros (Invertida)'),
    'Pents08.jpg': ('Ocho de Oros', 'Ocho de Oros (Invertida)'),
    'Pents09.jpg': ('Nueve de Oros', 'Nueve de Oros (Invertida)'),
    'Pents10.jpg': ('Diez de Oros', 'Diez de Oros (Invertida)'),
    'Pents11.jpg': ('Sota de Oros', 'Sota de Oros (Invertida)'),
    'Pents12.jpg': ('Caballero de Oros', 'Caballero de Oros (Invertida)'),
    'Pents13.jpg': ('Reina de Oros', 'Reina de Oros (Invertida)'),
    'Pents14.jpg': ('Rey de Oros', 'Rey de Oros (Invertida)'),
    'RWS_Tarot_00_Fool.jpg': ('El Loco', 'El Loco (Invertida)'),
    'RWS_Tarot_01_Magician.jpg': ('El Mago', 'El Mago (Invertida)'),
    'RWS_Tarot_02_High_Priestess.jpg': ('La Sacerdotisa', 'La Sacerdotisa (Invertida)'),
    'RWS_Tarot_03_Empress.jpg': ('La Emperatriz', 'La Emperatriz (Invertida)'),
    'RWS_Tarot_04_Emperor.jpg': ('El Emperador', 'El Emperador (Invertida)'),
    'RWS_Tarot_05_Hierophant.jpg': ('El Hierofante', 'El Hierofante (Invertida)'),
    'RWS_Tarot_06_Lovers.jpg': ('Los Enamorados', 'Los Enamorados (Invertida)'),
    'RWS_Tarot_07_Chariot.jpg': ('El Carro', 'El Carro (Invertida)'),
    'RWS_Tarot_08_Strength.jpg': ('La Fuerza', 'La Fuerza (Invertida)'),
    'RWS_Tarot_09_Hermit.jpg': ('El Ermitaño', 'El Ermitaño (Invertida)'),
    'RWS_Tarot_10_Wheel_of_Fortune.jpg': ('La Rueda de la Fortuna', 'La Rueda de la Fortuna (Invertida)'),
    'RWS_Tarot_11_Justice.jpg': ('Justicia', 'Justicia (Invertida)'),
    'RWS_Tarot_12_Hanged_Man.jpg': ('El Colgado', 'El Colgado (Invertida)'),
    'RWS_Tarot_13_Death.jpg': ('La Muerte', 'La Muerte (Invertida)'),
    'RWS_Tarot_14_Temperance.jpg': ('La Templanza', 'La Templanza (Invertida)'),
    'RWS_Tarot_15_Devil.jpg': ('El Diablo', 'El Diablo (Invertida)'),
    'RWS_Tarot_16_Tower.jpg': ('La Torre', 'La Torre (Invertida)'),
    'RWS_Tarot_17_Star.jpg': ('La Estrella', 'La Estrella (Invertida)'),
    'RWS_Tarot_18_Moon.jpg': ('La Luna', 'La Luna (Invertida)'),
    'RWS_Tarot_19_Sun.jpg': ('El Sol', 'El Sol (Invertida)'),
    'RWS_Tarot_20_Judgement.jpg': ('El Juicio', 'El Juicio (Invertida)'),
    'RWS_Tarot_21_World.jpg': ('El Mundo', 'El Mundo (Invertida)'),
    'Swords01.jpg': ('As de Espadas', 'As de Espadas (Invertida)'),
    'Swords02.jpg': ('Dos de Espadas', 'Dos de Espadas (Invertida)'),
    'Swords03.jpg': ('Tres de Espadas', 'Tres de Espadas (Invertida)'),
    'Swords04.jpg': ('Cuatro de Espadas', 'Cuatro de Espadas (Invertida)'),
    'Swords05.jpg': ('Cinco de Espadas', 'Cinco de Espadas (Invertida)'),
    'Swords06.jpg': ('Seis de Espadas', 'Seis de Espadas (Invertida)'),
    'Swords07.jpg': ('Siete de Espadas', 'Siete de Espadas (Invertida)'),
    'Swords08.jpg': ('Ocho de Espadas', 'Ocho de Espadas (Invertida)'),
    'Swords09.jpg': ('Nueve de Espadas', 'Nueve de Espadas (Invertida)'),
    'Swords10.jpg': ('Diez de Espadas', 'Diez de Espadas (Invertida)'),
    'Swords11.jpg': ('Sota de Espadas', 'Sota de Espadas (Invertida)'),
    'Swords12.jpg': ('Caballero de Espadas', 'Caballero de Espadas (Invertida)'),
    'Swords13.jpg': ('Reina de Espadas', 'Reina de Espadas (Invertida)'),
    'Swords14.jpg': ('Rey de Espadas', 'Rey de Espadas (Invertida)'),
    'Wands01.jpg': ('As de Bastos', 'As de Bastos (Invertida)'),
    'Wands02.jpg': ('Dos de Bastos', 'Dos de Bastos (Invertida)'),
    'Wands03.jpg': ('Tres de Bastos', 'Tres de Bastos (Invertida)'),
    'Wands04.jpg': ('Cuatro de Bastos', 'Cuatro de Bastos (Invertida)'),
    'Wands05.jpg': ('Cinco de Bastos', 'Cinco de Bastos (Invertida)'),
    'Wands06.jpg': ('Seis de Bastos', 'Seis de Bastos (Invertida)'),
    'Wands07.jpg': ('Siete de Bastos', 'Siete de Bastos (Invertida)'),
    'Wands08.jpg': ('Ocho de Bastos', 'Ocho de Bastos (Invertida)'),
    'Wands09.jpg': ('Nueve de Bastos', 'Nueve de Bastos (Invertida)'),
    'Wands10.jpg': ('Diez de Bastos', 'Diez de Bastos (Invertida)'),
    'Wands11.jpg': ('Sota de Bastos', 'Sota de Bastos (Invertida)'),
    'Wands12.jpg': ('Caballero de Bastos', 'Caballero de Bastos (Invertida)'),
    'Wands13.jpg': ('Reina de Bastos', 'Reina de Bastos (Invertida)'),
    'Wands14.jpg': ('Rey de Bastos', 'Rey de Bastos (Invertida)')
}

# Configuración de estilos de tarotista
TAROTIST_STYLES = {
    "profesor": "professor_prompt",
    "coaching": "coaching_prompt",
    "nigromante": "necro_prompt",
    "gitano": "gitano_prompt",
    "místico": "mystic_prompt"
}

# Configuración de la API de DeepSeek
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")  # Reemplaza con tu API key real

@app.route('/')
def index():
    # Verificar que la carpeta de imágenes existe
    if not os.path.exists(IMAGE_FOLDER):
        error_msg = f"ERROR: La carpeta {IMAGE_FOLDER} NO EXISTE"
        print(error_msg)
        return f"<h1 style='color:red;'>{error_msg}</h1><p>Verifica que tus imágenes están en la carpeta correcta</p>"
    
    # Obtener lista de todas las imágenes de cartas
    image_files = [f for f in os.listdir(IMAGE_FOLDER) 
                  if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
    # Verificar que hay imágenes
    if not image_files:
        error_msg = f"ERROR: No hay imágenes en {IMAGE_FOLDER}"
        print(error_msg)
        return f"<h1 style='color:red;'>{error_msg}</h1><p>Copia tus imágenes de tarot a la carpeta 'static/images/tarot'</p>"
    
    # Crear lista ordenada de nombres de cartas
    all_card_names = sorted({name[0] for name in CARD_NAMES.values()})
    
    return render_template('index.html', 
                          default_image=DEFAULT_IMAGE,
                          all_card_names=all_card_names,
                          image_files=image_files)

# Endpoint para obtener cartas aleatorias
@app.route('/get_random_cards', methods=['POST'])
def get_random_cards():
    # Obtener lista de imágenes
    image_files = [f for f in os.listdir(IMAGE_FOLDER) 
                  if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
    if len(image_files) < 2:
        return jsonify({"error": "No hay suficientes imágenes"}), 400
    
    # Seleccionar dos imágenes diferentes
    card1, card2 = random.sample(image_files, 2)
    
    # Determinar orientación aleatoria
    reversed1 = random.choice([True, False])
    reversed2 = random.choice([True, False])
    
    # Obtener nombres de cartas
    name1 = CARD_NAMES.get(card1, (card1, card1 + " (Invertida)"))[1 if reversed1 else 0]
    name2 = CARD_NAMES.get(card2, (card2, card2 + " (Invertida)"))[1 if reversed2 else 0]
    
    return jsonify({
        "card1": {
            "filename": card1,
            "reversed": reversed1,
            "name": name1,
            "color": "red" if reversed1 else "white"
        },
        "card2": {
            "filename": card2,
            "reversed": reversed2,
            "name": name2,
            "color": "red" if reversed2 else "white"
        }
    })

# Endpoint para obtener interpretación
@app.route('/get_interpretation', methods=['POST'])
def get_interpretation():
    data = request.json
    question = data.get('question', '')
    card1 = data.get('card1', '')
    card2 = data.get('card2', '')
    style = data.get('style', 'coaching')
    
    # Obtener la interpretación
    interpretation = get_tarot_interpretation(question, card1, card2, style)
    
    return jsonify({
        "interpretation": interpretation,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# Función para obtener interpretación de DeepSeek
def get_tarot_interpretation(pregunta, carta1, carta2, style):
    """Obtiene una respuesta interpretativa de DeepSeek basada en pregunta y cartas"""
    # Si no hay pregunta, usar una por defecto
    if not pregunta or pregunta.strip() == "":
        pregunta = "¿Qué mensaje tienen las cartas para mí en este momento?"
    
    # Obtener el prompt según el estilo seleccionado
    prompt_func = TAROTIST_STYLES.get(style, "coaching_prompt")
    prompt = globals()[prompt_func](pregunta, carta1, carta2)
    
    # Configurar los headers y datos para la API
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "Eres un sabio tarotista con 50 años de experiencia, que da respuestas completas y bien estructuradas, nunca cortes la respuesta a medias."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5,
        "frequency_penalty": 0.7,
        "presence_penalty": 0.3,
        "max_tokens": 550
    }
    
    try:
        # Hacer la solicitud a la API
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        # Procesar la respuesta
        data = response.json()
        return data['choices'][0]['message']['content']
    except Exception as e:
        return f"Error al obtener respuesta: {str(e)}"

# Definición de los diferentes prompts
def professor_prompt(pregunta, carta1, carta2):
    return f"""
    Eres un experto tarotista con más de 50 años de experiencia. Un usuario ha hecho la siguiente pregunta y se requiere una interpretacion de la combinación considerando las orientaciones, la respuesta debe ser COMPLETA Y BIEN REDONDEADA: 
    "{pregunta}"
    Las cartas reveladas son: 
    Carta 1: {carta1}
    Carta 2: {carta2}
    Por favor, proporciona una interpretación de tarot que:
    **Parte 1: Análisis individual de cada carta**
    - Explique el significado tradicional de cada carta
    - Detalle claramente cómo la posición (normal o invertida) modifica su interpretación
    - Describa las energías y simbolismos clave de cada carta
    **Parte 2: Interrelación entre las cartas**
    - Analice cómo estas cartas interactúan y se influyen mutuamente
    - Explique la dinámica entre sus energías y significados
    - Describa cómo se complementan o contrastan
    **Parte 3: Interpretación conjunta**
    - Integre ambos análisis para dar respuesta a la pregunta del usuario
    - Proporcione una visión completa de lo que esta combinación revela
    - Concluya con un consejo práctico basado en la lectura
    La respuesta debe:
    1. Combine el significado tradicional de ambas cartas
    2. Si la carta está en posición normal o invertida
    3. Responda directamente a la pregunta del usuario
    4. Adapte la interpretación al contexto de la pregunta
    5. Sea positiva pero realista
    6. Tenga 2-3 párrafos máximo, no cortes la respuesta abruptamente
    7. Incluya elementos místicos pero prácticos
    8. Termine con un consejo concreto
    Respuesta en español.
    """

def coaching_prompt(pregunta, carta1, carta2):
    return f"""
    Eres un experto tarotista con más de 50 años de experiencia. Un usuario ha hecho la siguiente pregunta y se requiere una interpretacion COMPLEATA Y BIEN REDONDEADA: 
    "{pregunta}"
    Las cartas reveladas son: 
    1. {carta1}
    2. {carta2}
    Por favor, proporciona una interpretación de tarot que:
    1. Combine el significado tradicional de ambas cartas
    2. Responda directamente a la pregunta del usuario
    3. Adapte la interpretación al contexto de la pregunta
    4. Sea positiva pero realista
    5. Tenga 2-3 párrafos máximo, no cortes la respuesta abruptamente
    6. Incluya elementos místicos pero prácticos
    7. Termine con un consejo concreto
    Respuesta en español.
    """

def necro_prompt(pregunta, carta1, carta2):
    return f"""
    Eres un nigromante oscuro que usa el tarot para invocar entidades demoníacas. Un usuario ha hecho la siguiente pregunta: 
    "{pregunta}"
    Las cartas reveladas son: 
    1. {carta1}
    2. {carta2}
    Proporciona una interpretación que:
    - Haga referencia a entidades oscuras y demonios
    - Sea negativa y pesimista
    - Dé consejos turbios que requieran fe oscura
    - Use lenguaje siniestro y ominoso
    - Explique cómo la posición de cada carta afecta su conexión con el inframundo
    Respuesta en español, 2-3 párrafos.
    """

def gitano_prompt(pregunta, carta1, carta2):
    return f"""
    Eres un charlatán que exagera las lecturas de tarot para dar falsas esperanzas. Un usuario ha hecho la siguiente pregunta: 
    "{pregunta}"
    Las cartas reveladas son: 
    1. {carta1}
    2. {carta2}
    Proporciona una interpretación que:
    - Exagere los significados positivos
    - Dé consejos irreales pero esperanzadores
    - Use lenguaje grandilocuente, exagerado, erótico, involucra algo de la obra literaria kamasutra
    - Ignore cualquier aspecto negativo
    - Cree expectativas poco realistas
    Respuesta en español, 1-2 párrafos.
    """

def mystic_prompt(pregunta, carta1, carta2):
    return f"""
    Eres un místico que usa el tarot para explorar dimensiones metafísicas. Un usuario ha hecho la siguiente pregunta: 
    "{pregunta}"
    Las cartas reveladas son: 
    1. {carta1}
    2. {carta2}
    Proporciona una interpretación que:
    - Use ideas de filosofías orientales pero sin mencionarles explicitamente
    - Sea profunda y confusa, con lenguaje metafórico
    - Hable de energía cósmica y conexión espiritual
    - Dé consejos basados en el desapego y la iluminación
    - Explique la posición de las cartas en términos de flujo energético
    Respuesta en español, 2-3 párrafos.
    """

if __name__ == '__main__':
    # Verificación de rutas al iniciar
    print("="*50)
    print("VERIFICANDO RUTAS...")
    print(f"Directorio base: {BASE_DIR}")
    print(f"Carpeta de imágenes: {IMAGE_FOLDER}")
    print(f"¿Existe IMAGE_FOLDER? {os.path.exists(IMAGE_FOLDER)}")
    print(f"Imagen predeterminada: {DEFAULT_IMAGE}")
    print(f"¿Existe TarocchiBN2.jpg? {os.path.exists(os.path.join(BASE_DIR, 'static', 'images', DEFAULT_IMAGE))}")
    print(f"Archivo de explicaciones: {EXPLANATIONS_FILE}")
    print(f"¿Existe El Loco2.txt? {os.path.exists(EXPLANATIONS_FILE)}")
    print("="*50)
    
    # Ejecutar la aplicación
    app.run(host='0.0.0.0', port=5000, debug=True)
