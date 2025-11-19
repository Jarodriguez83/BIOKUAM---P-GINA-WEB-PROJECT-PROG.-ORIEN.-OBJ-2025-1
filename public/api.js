// Clave API de Gemini. Se deja vacía para que el entorno la inyecte.
        const API_KEY = "AIzaSyBBqx-IUhH0Fswb-IuCrHVEvdTG7UkekHs"; 
        
        // URL y Modelo para la API de Gemini
        const MODEL = "gemini-2.5-flash-preview-09-2025";
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
        
        // Historial de la conversación para mantener el contexto
        let chatHistory = [];

        // -------------------------------------------------------------
        // CONTEXTO CLAVE PARA GEMINI (System Instruction)
        // -------------------------------------------------------------
        const SYSTEM_INSTRUCTION_TEXT = `
            Eres el Asistente Virtual de Biokuam, un proyecto social enfocado en ayudar a los campesinos del municipio de Simijaca, Colombia, para el cultivo de maíz. 
            Tu rol es responder preguntas sobre agricultura, manejo de cultivos de maíz, y análisis de la calidad del agua (pH y temperatura) basado en los parámetros ideales.
            
            Información clave:
            - **Cultivo:** Maíz.
            - **Ubicación:** Simijaca, Colombia.
            - **Parámetros óptimos para Maíz:** pH ideal entre 6.0 y 7.5. Temperatura del agua óptima entre 20°C y 30°C.
            - **Tono:** Sé amigable, alentador, y proporciona respuestas claras y prácticas, usando un lenguaje sencillo adecuado para un agricultor.
            
            Cuando se te pida evaluar el agua, usa los parámetros óptimos. Si el usuario no proporciona datos, pídeles que te den los valores de pH y temperatura.
            Tus respuestas deben ser concisas y enfocadas en la solución para el campesino.
        `;
        
        // Referencias a elementos del DOM
        const chatBox = document.getElementById('biokuamChatBox');
        const userInput = document.getElementById('biokuamUserInput');
        const sendBtn = document.getElementById('biokuamSendBtn');

        /**
         * 1. Función para agregar un mensaje al chat box
         * @param {string} text - Contenido del mensaje.
         * @param {string} sender - 'user' o 'ai'.
         * @returns {HTMLElement} El elemento del mensaje creado.
         */
        function appendMessage(text, sender) {
            const msgElement = document.createElement('div');
            msgElement.classList.add(sender === 'user' ? 'biokuam-msg-user' : 'biokuam-msg-ai');
            // Usamos innerHTML para permitir saltos de línea y formateo de la respuesta de la IA
            msgElement.innerHTML = sender === 'ai' ? text.replace(/\n/g, '<br>') : text;
            chatBox.appendChild(msgElement);
            // Desplazar al fondo para mostrar el mensaje más reciente
            chatBox.scrollTop = chatBox.scrollHeight;
            return msgElement;
        }
        
        /**
         * 2. Manejador principal para enviar el mensaje a Gemini
         */
        async function handleSendMessage() {
            const userText = userInput.value.trim();
            if (!userText) return;

            // Limpiar input y deshabilitar controles
            userInput.value = '';
            sendBtn.disabled = true;
            userInput.disabled = true;

            // 1. Mostrar mensaje del usuario y agregarlo al historial
            appendMessage(userText, 'user');
            chatHistory.push({ role: "user", parts: [{ text: userText }] });

            // 2. Agregar indicador de "escribiendo..."
            const typingIndicator = appendMessage('...', 'ai');
            typingIndicator.classList.add('typing-indicator');

            try {
                // 3. Construir el payload de la API
                const payload = {
                    contents: chatHistory,
                    systemInstruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION_TEXT }]
                    },
                    // Usamos tools: [{ "google_search": {} }] para grounding si necesitamos datos externos
                    // tools: [{ "google_search": {} }] 
                };

                // 4. Llamar a la API de Gemini (con reintentos por backoff exponencial)
                const response = await fetchWithExponentialBackoff(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();

                // 5. Procesar la respuesta
                const candidate = result.candidates?.[0];

                if (candidate && candidate.content?.parts?.[0]?.text) {
                    const aiText = candidate.content.parts[0].text;
                    
                    // 6. Eliminar el indicador de "escribiendo..." y mostrar el mensaje de la IA
                    typingIndicator.remove();
                    appendMessage(aiText, 'ai');
                    
                    // 7. Agregar la respuesta de la IA al historial
                    chatHistory.push({ role: "model", parts: [{ text: aiText }] });

                } else {
                    typingIndicator.remove();
                    appendMessage('Lo siento, hubo un problema con la respuesta de la IA. Por favor, inténtalo de nuevo.', 'ai');
                    // Opcional: Eliminar la última entrada del usuario del historial si falló la respuesta
                    chatHistory.pop(); 
                }

            } catch (error) {
                console.error("Error al comunicarse con la API de Gemini:", error);
                typingIndicator.remove();
                appendMessage('¡Ups! Tuvimos un error de conexión con el asistente. Revisa la consola o tu clave API.', 'ai');
                chatHistory.pop(); // Eliminar la entrada del usuario si falla
            } finally {
                // 8. Habilitar controles
                sendBtn.disabled = false;
                userInput.disabled = false;
                userInput.focus();
            }
        }
        
        /**
         * Función para realizar fetch con backoff exponencial.
         */
        async function fetchWithExponentialBackoff(url, options, maxRetries = 5) {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const response = await fetch(url, options);
                    if (response.ok) {
                        return response;
                    }
                    // Throw error to trigger retry logic for non-200 responses
                    throw new Error(`HTTP error! status: ${response.status}`);
                } catch (error) {
                    if (attempt === maxRetries - 1) {
                        console.error("Máximo de reintentos alcanzado. Fallo definitivo.", error);
                        throw error;
                    }
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    // Retardo silencioso (no se loguea como error en la consola, solo en desarrollo si se desea)
                    await new Promise(resolve => setTimeout(resolve, delay)); 
                }
            }
        }

        // -------------------------------------------------------------
        // Event Listeners (Controladores de Eventos)
        // -------------------------------------------------------------

        // Al hacer clic en el botón 'Enviar'
        sendBtn.addEventListener('click', handleSendMessage);

        // Al presionar 'Enter' en el área de texto (si no se presiona Shift)
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Previene el salto de línea por defecto
                handleSendMessage();
            }
        });
        
        // Enfocar el input al cargar la página para facilitar el uso
        window.onload = () => {
             userInput.focus();
        };

















// =======================
// CLIMA BIOKUAM
// FECHA: 13-11-2025
// DOCUMENTACIÓN: CMCB, JSNT
// =======================

// ⚠️ Reemplaza con tu propia API KEY de OpenWeatherMap
const API_KEY2 = "0841f15208b7901a56d98c77f871acf9";
const ciudad = "Simijaca";
const url = `https://api.openweathermap.org/data/2.5/weather?q=Simijaca&appid=0841f15208b7901a56d98c77f871acf9&units=metric&lang=es`;

async function obtenerClima() {
  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    document.getElementById("ubicacion").innerHTML = `📍 UBICACIÓN: ${datos.name}`;
    document.getElementById("temperatura").innerHTML = `🌡️ TEMPERATURA: ${datos.main.temp.toFixed(1)} °C`;
    document.getElementById("descripcion").innerHTML = `☁️ CONDICIÓN: ${datos.weather[0].description}`;
    document.getElementById("humedad").innerHTML = `💧 HUMEDAD: ${datos.main.humidity}%`;
    document.getElementById("viento").innerHTML = `🌬️ VIENTO: ${datos.wind.speed} m/s`;
  } catch (error) {
    console.error("ERROR AL OBTENER EL CLIMA:", error);
  }
}

obtenerClima();











// Coordenadas de Simijaca, Colombia
        const SIMIJACA_LAT = 5.510;
        const SIMIJACA_LON = -73.805;
        const MAP_ZOOM = 13;

        /**
         * Inicializa y configura el mapa Leaflet.
         */
        function initLeafletMap() {
            if (typeof L === 'undefined') {
                console.error("Leaflet (L) no está definido. Los archivos JS no se cargaron.");
                return;
            }

            const mapContainer = document.getElementById('biokuamMap');
            if (!mapContainer) return;
            mapContainer.innerHTML = ''; // Limpiar por si acaso
            
            // 1. Inicializa el mapa en el contenedor 'biokuamMap'
            const map = L.map('biokuamMap').setView([SIMIJACA_LAT, SIMIJACA_LON], MAP_ZOOM);

            // 2. Añade los tiles (mosaicos) de Esri (Proveedor estable y gratuito)
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS',
                maxZoom: 19,
                id: 'esri-street-map'
            }).addTo(map);

            // 3. Añade un marcador
            L.marker([SIMIJACA_LAT, SIMIJACA_LON])
                .addTo(map)
                .bindPopup("Simijaca, Cundinamarca")
                .openPopup();
            
            // CORRECCIÓN CRÍTICA: Fuerza al mapa a redimensionarse 
            // Esto soluciona el problema de la "pantalla gris" por la renderización asíncrona.
            setTimeout(() => {
                map.invalidateSize();
                console.log("Mapa de Leaflet inicializado y redimensionado correctamente.");
            }, 100); 
        }

        // Iniciar el mapa cuando la ventana esté completamente cargada
        window.onload = initLeafletMap;

