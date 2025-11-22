/*
    SERVIDOR PARA LA PÁGINA WEB - NODE.JS
    FECHA: 27-05-2025 (Actualizado con Proxy Gemini/Clima)
    PROGRAMADO POR: CMCB / JSNT
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
// Se requiere 'node-fetch' para hacer llamadas a las APIs externas.
// Esto funciona si 'node-fetch' está en el package.json (como lo hemos definido).
const fetch = require('node-fetch'); 

const PUERTO = 3000;
const CARPETA_PUBLIC = path.join(__dirname, "public");
const RUTA_USUARIOS = path.join(__dirname, "usuarios.txt");
const RUTA_FINCAS = path.join(__dirname, "fincas.txt");
const RUTA_BARCOS = path.join(__dirname, "barcos.txt");

// --- CONFIGURACIÓN DE SEGURIDAD Y CLAVES ---

// Leemos las claves de las variables de entorno configuradas en Render.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const SYSTEM_INSTRUCTION_TEXT = "Eres el Asistente Virtual de Biokuam, un consultor experto en cultivos de maíz en el altiplano de Colombia, con enfoque en las condiciones de Simijaca. Responde de manera concisa y profesional.";

if (!GEMINI_API_KEY || !OPENWEATHER_API_KEY) {
    console.warn("ADVERTENCIA: Las claves API no están definidas en las variables de entorno. Las rutas /api/gemini y /api/clima fallarán en Render.");
}

// ------------------------------------------

function leerArchivo(ruta) {
    return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, "utf8")) : [];
}

function escribirArchivo(ruta, datos) {
    // Usamos el formato sincrónico para guardar inmediatamente
    fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

function verificarAutorizacion(req) {
    const token = req.headers.authorization?.split(' ')[1];
    // NOTA: Para producción, este token debería ser JWT, no un ID de usuario simple.
    const usuarios = leerArchivo(RUTA_USUARIOS);
    return usuarios.find(u => u.id === token) ? token : null;
}

function manejarError(res, codigo, mensaje) {
    res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, message: mensaje }));
}

function servirArchivo(res, filePath, contentType) {
    if (!fs.existsSync(filePath)) {
        return manejarError(res, 404, "404 - No encontrado");
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) return manejarError(res, 500, "500 - Error interno");
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
}

// Función para parsear Query Parameters
function parseQueryParams(url) {
    const params = {};
    const parts = url.split('?');
    if (parts.length > 1) {
        parts[1].split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
    }
    return params;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => { // Hacemos 'end' async para usar 'await' en las llamadas fetch
        const { url, method } = req;
        let bodyJson = {};

        try {
            if (body) {
                bodyJson = JSON.parse(body);
            }
        } catch {} // Ignorar si el body no es JSON o está vacío

        // --- Ruteo de APIs Existentes (Login, Registro, CRUD local) ---

        if (url === "/api/login" && method === "POST") {
            try {
                const { correo, contrasena } = bodyJson;
                if (!correo || !contrasena) return manejarError(res, 400, "Correo y contraseña requeridos");
                const usuarios = leerArchivo(RUTA_USUARIOS);
                const usuario = usuarios.find(u => u.correo === correo && u.contrasena === contrasena);
                if (usuario) {
                    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({ success: true, message: "Login exitoso", usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } }));
                } else {
                    manejarError(res, 401, "Credenciales incorrectas");
                }
            } catch {
                manejarError(res, 400, "Error procesando JSON");
            }
            return;
        }

        if (url === "/api/registro" && method === "POST") {
             try {
                const nuevo = bodyJson;
                const lista = leerArchivo(RUTA_USUARIOS);
                if (lista.find(u => u.correo === nuevo.correo)) return manejarError(res, 409, "Email ya registrado");

                nuevo.id = nuevo.id || `BKM${Date.now()}${(lista.length + 1).toString().padStart(3, '0')}`;
                nuevo.fechaRegistro = new Date().toISOString();
                lista.push(nuevo);
                escribirArchivo(RUTA_USUARIOS, lista);
                
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ success: true, message: "Usuario registrado", usuario: { id: nuevo.id, nombre: nuevo.nombre, correo: nuevo.correo } }));
            } catch (e) {
                 manejarError(res, 400, "Error procesando JSON");
            }
            return;
        }
        
        // ... (Tu lógica existente para registro-finca, registro-barco, GET /api/usuarios, /api/fincas, /api/barcos, etc.) ...
        
        // La lógica de CRUD local (fincas, barcos) sigue aquí...
        const registrarElemento = (ruta, tipo, datos) => {
            const token = verificarAutorizacion(req);
            if (!token) return manejarError(res, 401, "Token inválido");

            const elementos = leerArchivo(ruta);
            const nuevoElemento = { ...datos, id: `${tipo}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, usuario_id: token, fecha_registro: new Date().toISOString() };
            elementos.push(nuevoElemento);
            escribirArchivo(ruta, elementos);
            
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ success: true, message: `${tipo} registrado`, archivo: path.basename(ruta), id: nuevoElemento.id }));
        };

        if (url === "/api/registro-finca" && method === "POST") {
            try {
                registrarElemento(RUTA_FINCAS, "FINCA", bodyJson);
            } catch {
                manejarError(res, 400, "Error procesando datos");
            }
            return;
        }

        if (url === "/api/registro-barco" && method === "POST") {
            try {
                const datosBarco = bodyJson;
                if (!datosBarco.nombre_barco || !datosBarco.imei_barco || !datosBarco.correo) return manejarError(res, 400, "Faltan datos requeridos");

                const barcos = leerArchivo(RUTA_BARCOS);
                if (barcos.find(b => b.imei_barco === datosBarco.imei_barco)) return manejarError(res, 409, "IMEI ya registrado");

                registrarElemento(RUTA_BARCOS, "BARCO", datosBarco);
            } catch {
                manejarError(res, 400, "Error procesando datos");
            }
            return;
        }

        if (url === "/api/usuarios" && method === "GET") {
            const lista = leerArchivo(RUTA_USUARIOS);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            return res.end(JSON.stringify(lista));
        }

        if (url === "/api/fincas" && method === "GET") {
            const token = verificarAutorizacion(req);
            if (!token) return manejarError(res, 401, "Token requerido");
            const fincas = leerArchivo(RUTA_FINCAS);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            return res.end(JSON.stringify(fincas));
        }

        if (url === "/api/barcos" && method === "GET") {
            const token = verificarAutorizacion(req);
            if (!token) return manejarError(res, 401, "Token requerido");
            const barcos = leerArchivo(RUTA_BARCOS);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            return res.end(JSON.stringify(barcos));
        }
        
        // ------------------------------------------------------------------------
        // NUEVO: ENDPOINT PROXY para la API de Gemini (/api/gemini)
        // ------------------------------------------------------------------------
        if (url === "/api/gemini" && method === "POST") {
            if (!GEMINI_API_KEY) {
                return manejarError(res, 500, "Clave de Gemini no configurada en el servidor.");
            }
            
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
                
                // Añadimos la systemInstruction al payload antes de enviarlo
                const geminiPayload = {
                    ...bodyJson,
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] }
                };
                
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiPayload)
                });

                const result = await geminiResponse.json();
                
                // Extraemos el texto de la respuesta para el frontend
                const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo obtener una respuesta de la IA.";

                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                return res.end(JSON.stringify({ success: true, text: aiText }));

            } catch (error) {
                console.error("Error en el proxy de Gemini:", error);
                return manejarError(res, 500, "Fallo la comunicación con la API de Gemini.");
            }
        }
        
        // ------------------------------------------------------------------------
        // NUEVO: ENDPOINT PROXY para OpenWeatherMap (/api/clima)
        // ------------------------------------------------------------------------
        if (url.startsWith("/api/clima") && method === "GET") {
            if (!OPENWEATHER_API_KEY) {
                return manejarError(res, 500, "Clave de OpenWeatherMap no configurada.");
            }

            const query = parseQueryParams(url);
            const lat = query.lat;
            const lon = query.lon;
        
            if (!lat || !lon) {
                return manejarError(res, 400, "Latitud y Longitud requeridas para el clima.");
            }
            
            try {
                const OWM_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=es`;
                const owmResponse = await fetch(OWM_URL);
                const data = await owmResponse.json();

                if (data.cod !== 200) {
                    throw new Error(data.message || "Error desconocido de OpenWeatherMap");
                }
                
                // Mapeo de iconos OWM a emojis (para mantener la consistencia del frontend)
                const iconMap = { '01': '☀️', '02': '🌤️', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '🌩️', '13': '❄️', '50': '🌫️' };
                const emoji = iconMap[data.weather[0].icon.slice(0, 2)] || '❓';
                
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                return res.end(JSON.stringify({
                    success: true,
                    temp: data.main.temp,
                    description: data.weather[0].description,
                    emoji: emoji
                }));

            } catch (error) {
                console.error("Error en el proxy de Clima:", error);
                return manejarError(res, 500, "Fallo la comunicación con la API de Clima.");
            }
        }

        // ------------------------------------------------------------------------
        // Ruteo de Archivos Estáticos (Tu lógica existente)
        // ------------------------------------------------------------------------
        let rutaRel = url === "/" ? "index.html" : url.split("?")[0].slice(1);
        rutaRel = decodeURIComponent(rutaRel);
        const ext = path.extname(rutaRel).toLowerCase();
        const mimeTypes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".json": "application/json; charset=utf-8"
        };
        
        const contentType = mimeTypes[ext] || "application/octet-stream";
        // CRÍTICO: El path.join utiliza la constante CARPETA_PUBLIC, que es 'public'
        const filePath = path.join(CARPETA_PUBLIC, rutaRel);
        const resolvedPath = path.resolve(filePath);
        const resolvedPublic = path.resolve(CARPETA_PUBLIC);
        
        if (!resolvedPath.startsWith(resolvedPublic)) {
            return manejarError(res, 403, "403 - Prohibido");
        }

        servirArchivo(res, filePath, contentType);
    });
});

// CRÍTICO: Render utiliza la variable de entorno PORT, si no existe usa 3000
const SERVER_PORT = process.env.PORT || PUERTO; 
server.listen(SERVER_PORT, () => {
    console.log(`Servidor BIOKUAM corriendo en http://localhost:${SERVER_PORT}`);
});