/*
    SERVIDOR PARA LA PÁGINA WEB - NODE.JS
     FECHA: 27-05-2025
     PROGRAMADO POR: CMCB / JSNT
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = 3000;
const CARPETA_PUBLIC = path.join(__dirname, "public");
const RUTA_USUARIOS = path.join(__dirname, "usuarios.txt");
const RUTA_FINCAS = path.join(__dirname, "fincas.txt");
const RUTA_BARCOS = path.join(__dirname, "barcos.txt");

function leerArchivo(ruta) {
  return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, "utf8")) : [];
}

function escribirArchivo(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

function verificarAutorizacion(req) {
  const token = req.headers.authorization?.split(' ')[1];
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
  req.on("end", () => {
    const { url, method } = req;

    if (url === "/api/login" && method === "POST") {
      try {
        const { correo, contrasena } = JSON.parse(body);
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
        manejarError(res, 400, "JSON inválido");
      }
      return;
    }

    if (url === "/api/registro" && method === "POST") {
      try {
        const nuevo = JSON.parse(body);
        const lista = leerArchivo(RUTA_USUARIOS);
        if (lista.find(u => u.correo === nuevo.correo)) return manejarError(res, 409, "Email ya registrado");

        nuevo.id = nuevo.id || `BKM${Date.now()}${(lista.length + 1).toString().padStart(3, '0')}`;
        nuevo.fechaRegistro = new Date().toISOString();
        lista.push(nuevo);
        escribirArchivo(RUTA_USUARIOS, lista);
        
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: "Usuario registrado", usuario: { id: nuevo.id, nombre: nuevo.nombre, correo: nuevo.correo } }));
      } catch {
        manejarError(res, 400, "JSON inválido");
      }
      return;
    }

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
        const datosFinca = JSON.parse(body);
        registrarElemento(RUTA_FINCAS, "FINCA", datosFinca);
      } catch {
        manejarError(res, 400, "Error procesando datos");
      }
      return;
    }

    if (url === "/api/registro-barco" && method === "POST") {
      try {
        const datosBarco = JSON.parse(body);
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

    // Archivos estáticos
    let rutaRel = req.url === "/" ? "index.html" : req.url.slice(1).split("?")[0];
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
    const filePath = path.join(CARPETA_PUBLIC, rutaRel);
    const resolvedPath = path.resolve(filePath);
    const resolvedPublic = path.resolve(CARPETA_PUBLIC);
    
    if (!resolvedPath.startsWith(resolvedPublic)) {
      return manejarError(res, 403, "403 - Prohibido");
    }

    servirArchivo(res, filePath, contentType);
  });
});

server.listen(PUERTO, () => {
  console.log(`Servidor BIOKUAM corriendo en http://localhost:${PUERTO}`);
});
