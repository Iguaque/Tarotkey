import os
import random
import json
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'tarot')
EXPLANATIONS_FILE = os.path.join(BASE_DIR, 'El Loco2.txt')
CARD_NAMES_FILE = os.path.join(BASE_DIR, 'card_names.json')  # Nuevo archivo JSON
DEFAULT_IMAGE = 'TarocchiBN2.jpg'

# Cargar el diccionario de equivalencias desde el archivo JSON
def load_card_names():
    try:
        with open(CARD_NAMES_FILE, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"ERROR: No se encontró el archivo {CARD_NAMES_FILE}")
        return {}
    except json.JSONDecodeError:
        print(f"ERROR: El archivo {CARD_NAMES_FILE} no es un JSON válido")
        return {}

CARD_NAMES = load_card_names()

# Configuración de estilos de tarotista
TAROTIST_STYLES = {
    "profesor": "professor",
    "coaching": "coaching", 
    "nigromante": "necro",
    "gitano": "gypsy",
    "místico": "mystic"
}

# Configuración de la API de DeepSeek
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

@app.route('/')
def index():
    if not os.path.exists(IMAGE_FOLDER):
        error_msg = f"ERROR: La carpeta {IMAGE_FOLDER} NO EXISTE"
        print(error_msg)
        return f"<h1 style='color:red;'>{error_msg}</h1><p>Verifica que tus imágenes están en la carpeta correcta</p>"
    
    image_files = [f for f in os.listdir(IMAGE_FOLDER) 
                  if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
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

@app.route('/get_random_cards', methods=['POST'])
def get_random_cards():
    image_files = [f for f in os.listdir(IMAGE_FOLDER) 
                  if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]
    
    if len(image_files) < 2:
        return jsonify({"error": "No hay suficientes imágenes"}), 400
    
    card1, card2 = random.sample(image_files, 2)
    reversed1 = random.choice([True, False])
    reversed2 = random.choice([True, False])
    
    # Obtener nombres de cartas del JSON (ahora es una lista, no tupla)
    names = CARD_NAMES.get(card1, [card1, card1 + " (Invertida)"])
    name1 = names[1 if reversed1 else 0]
    names = CARD_NAMES.get(card2, [card2, card2 + " (Invertida)"])
    name2 = names[1 if reversed2 else 0]
    
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

@app.route('/get_interpretation', methods=['POST'])
def get_interpretation():
    data = request.json
    question = data.get('question', '')
    card1 = data.get('card1', '')
    card2 = data.get('card2', '')
    style = data.get('style', 'coaching')
    
    print(f"DEBUG: Interpretación solicitada - Estilo: {style}, Cartas: {card1}, {card2}")
    
    # Mapear el estilo recibido al estilo interno
    internal_style = TAROTIST_STYLES.get(style, "coaching")
    print(f"DEBUG: Estilo interno mapeado: {internal_style}")
    
    interpretation = get_tarot_interpretation(question, card1, card2, internal_style)
    
    return jsonify({
        "interpretation": interpretation,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

def get_tarot_interpretation(pregunta, carta1, carta2, style):
    """Obtiene una respuesta interpretativa de DeepSeek basada en pregunta y cartas"""
    if not pregunta or pregunta.strip() == "":
        pregunta = "¿Qué mensaje tienen las cartas para mí en este momento?"
    
    # Verificar qué estilo está siendo usado
    print(f"DEBUG: Usando tarotista - Estilo interno: {style}")
    
    # Obtener el payload personalizado según el estilo
    payload = get_style_payload(pregunta, carta1, carta2, style)
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        print(f"DEBUG: Enviando solicitud a la API con estilo interno: {style}")
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print(f"DEBUG: Respuesta recibida del API para estilo interno: {style}")
        return data['choices'][0]['message']['content']
    except Exception as e:
        print(f"ERROR: Error al obtener respuesta del API: {str(e)}")
        return f"Error al obtener respuesta: {str(e)}"

def get_style_payload(pregunta, carta1, carta2, style):
    """Genera el payload personalizado según el estilo de tarotista"""
    base_messages = [
        {"role": "user", "content": get_tarot_prompt(pregunta, carta1, carta2, style)}
    ]
    
    # Configuración personalizada por estilo
    if style == "professor":
        print("DEBUG: Cargando configuración para Profesor")
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un sabio profesor de tarot con 50 años de experiencia académica, que da respuestas completas, estructuradas y profundas."},
                *base_messages
            ],
            "temperature": 0.4,
            "frequency_penalty": 0.8,
            "presence_penalty": 0.4,
            "max_tokens": 600
        }
    elif style == "coaching":
        print("DEBUG: Cargando configuración para Coaching")
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un coach de vida con experiencia en tarot, que da respuestas motivadoras, prácticas y orientadas a la acción."},
                *base_messages
            ],
            "temperature": 0.6,
            "frequency_penalty": 0.5,
            "presence_penalty": 0.3,
            "max_tokens": 200
        }
    elif style == "necro":
        print("DEBUG: Cargando configuración para Nigromante")
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un nigromante oscuro que usa el tarot para invocar entidades demoníacas, con un tono siniestro y ominoso."},
                *base_messages
            ],
            "temperature": 0.8,
            "frequency_penalty": 0.9,
            "presence_penalty": 0.7,
            "max_tokens": 100
        }
    elif style == "gypsy":
        print("DEBUG: Cargando configuración para Gitano")
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un vidente gitano carismático que exagera las lecturas para dar falsas esperanzas con lenguaje grandilocuente y erótico."},
                *base_messages
            ],
            "temperature": 0.7,
            "frequency_penalty": 0.6,
            "presence_penalty": 0.5,
            "max_tokens": 100
        }
    elif style == "mystic":
        print("DEBUG: Cargando configuración para Místico")
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un místico que explora dimensiones metafísicas a través del tarot, con lenguaje profundo y metafórico."},
                *base_messages
            ],
            "temperature": 0.5,
            "frequency_penalty": 0.7,
            "presence_penalty": 0.6,
            "max_tokens": 100
        }
    else:
        print(f"DEBUG: Estilo desconocido o no válido: {style}, usando coaching por defecto")
        # Default para coaching
        return {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un coach de vida con experiencia en tarot, que da respuestas motivadoras, prácticas y orientadas a la acción."},
                *base_messages
            ],
            "temperature": 0.6,
            "frequency_penalty": 0.5,
            "presence_penalty": 0.3,
            "max_tokens": 200
        }

def get_tarot_prompt(pregunta, carta1, carta2, style):
    """Genera el prompt específico según el estilo"""
    if style == "professor":
        return f"""
        Eres un experto tarotista con más de 50 años de experiencia académica. Un usuario ha hecho la siguiente pregunta: "{pregunta}"
        Las cartas reveladas son: 
        Carta 1: {carta1}
        Carta 2: {carta2}
        Por favor, proporciona una interpretación EXTREMADAMENTE CONCISA y COMPLETA que:
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
        - ASEGURA que tu respuesta SIEMPRE esté completa, NUNCA se corte a mitad de una frase y que termine con un consejo concreto y orientado a la acción
       
        """
    
    elif style == "coaching":
        return f"""
        Eres un coach de vida con experiencia en tarot. RESPONDE DIRECTAMENTE A LA SIGUIENTE pregunta: "{pregunta}"
        Las cartas reveladas son: 
        1. {carta1}
        2. {carta2}
         Proporciona una interpretación EXTREMADAMENTE CONCISA y COMPLETA en MÁXIMO 2-3 frases cortas que:
        - Combine el significado tradicional de ambas cartas
        - Responda directamente a la pregunta del usuario
        - Adapte la interpretación al contexto de la pregunta
        - Sea positiva pero realista
        - Incluya elementos místicos pero prácticos
        - ASEGURA que tu respuesta SIEMPRE esté completa, NUNCA se corte a mitad de una frase y que termine con un consejo concreto y orientado a la acción
        """
    
    elif style == "necro":
        return f"""
        Eres un nigromante oscuro que usa el tarot para invocar entidades demoníacas. RESPONDE DIRECTAMENTE A LA SIGUIENTE pregunta: "{pregunta}"
        Las cartas reveladas son: 
        1. {carta1}
        2. {carta2}
        Proporciona una interpretación EXTREMADAMENTE CONCISA y COMPLETA en MÁXIMO 2-3 frases cortas que:
        - Haga referencia a entidades oscuras y demonios
        - Sea negativa y pesimista
        - Dé consejos turbios que requieran fe oscura
        - Adapte la interpretación al contexto de la pregunta
        - Explique cómo la posición de cada carta afecta su conexión con el inframundo
        - ASEGURA que tu respuesta SIEMPRE esté completa, NUNCA se corte a mitad de una frase, y TERMINE con un consejo macabro.
        """
    
    elif style == "gypsy":
        return f"""
        Eres un vidente gitano carismático que exagera las lecturas de tarot para dar falsas esperanzas. RESPONDE DIRECTAMENTE A LA SIGUIENTE pregunta: "{pregunta}"
        Las cartas reveladas son: 
        1. {carta1}
        2. {carta2}
        Proporciona una interpretación EXTREMADAMENTE CONCISA y COMPLETA en MÁXIMO 2-3 frases cortas que:
        - procura los significados positivos
        - Dé consejos irreales pero esperanzadores
        - Use lenguaje grandilocuente y erótico
        - Adapte la interpretación al contexto de la pregunta
        - ASEGURA que tu respuesta SIEMPRE esté completa, NUNCA se corte a mitad de una frase, y TERMINE con un consejo gitano.
        """
    
    elif style == "mystic":
        return f"""
        Eres un místico que usa el tarot para explorar dimensiones metafísicas. RESPONDE DIRECTAMENTE A LA SIGUIENTE pregunta: "{pregunta}"
        Las cartas reveladas son: 
        1. {carta1}
        2. {carta2}
        Proporciona una interpretación EXTREMADAMENTE CONCISA y COMPLETA en MÁXIMO 2-3 frases cortas que:
        - Use ideas de filosofías espirituales sin mencionarlas explícitamente
        - Sea profunda y con lenguaje metafórico
        - Adapte la interpretación al contexto de la pregunta
        - Dé consejos basados en el desapego y la iluminación
        - Explique la posición de las cartas en términos de flujo energético
        - ASEGURA que tu respuesta SIEMPRE esté completa, NUNCA se corte a mitad de una frase
        """
    
    else:
        print(f"DEBUG: Prompt para estilo desconocido: {style}, usando coaching por defecto")
        # Default para coaching
        return f"""
        Eres un coach de vida con experiencia en tarot. RESPONDE DIRECTAMENTE A LA SIGUIENTE pregunta: "{pregunta}"
        Las cartas reveladas son: 
        1. {carta1}
        2. {carta2}
        Proporciona una interpretación que:
        1. Combine el significado tradicional de ambas cartas
        2. Responda directamente a la pregunta del usuario
        3. Adapte la interpretación al contexto de la pregunta
        4. Sea positiva pero realista
        5. Tenga 2-3 párrafos máximo
        6. Incluya elementos místicos pero prácticos
        7. Termine con un consejo concreto y orientado a la acción
        """

if __name__ == '__main__':
    print("="*50)
    print("VERIFICANDO RUTAS...")
    print(f"Directorio base: {BASE_DIR}")
    print(f"Carpeta de imágenes: {IMAGE_FOLDER}")
    print(f"¿Existe IMAGE_FOLDER? {os.path.exists(IMAGE_FOLDER)}")
    print(f"Imagen predeterminada: {DEFAULT_IMAGE}")
    print(f"¿Existe TarocchiBN2.jpg? {os.path.exists(os.path.join(BASE_DIR, 'static', 'images', DEFAULT_IMAGE))}")
    print(f"Archivo de explicaciones: {EXPLANATIONS_FILE}")
    print(f"¿Existe El Loco2.txt? {os.path.exists(EXPLANATIONS_FILE)}")
    print(f"Archivo de cartas: {CARD_NAMES_FILE}")
    print(f"¿Existe card_names.json? {os.path.exists(CARD_NAMES_FILE)}")
    print("="*50)
    
    # Verificar que el archivo JSON se cargó correctamente
    if not CARD_NAMES:
        print("ERROR: No se pudieron cargar las equivalencias de cartas")
    else:
        print(f"Cartas cargadas: {len(CARD_NAMES)}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)