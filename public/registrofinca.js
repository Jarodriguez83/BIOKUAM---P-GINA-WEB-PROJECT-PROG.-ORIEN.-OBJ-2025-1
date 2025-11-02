/*
    PÁGINA DE REGISTRO PARA LA FINCA - BIOKUAM
     FECHA: 22-04-2025
     PROGRAMADO POR: CMCB / JSNT
*/
// Clase Finca
class Finca {
  constructor(nombre, vereda, hectareas, fechaCultivo, dificultades) {
    this.nombre = nombre;
    this.vereda = vereda;
    this.hectareas = hectareas;
    this.fechaCultivo = fechaCultivo;
    this.dificultades = dificultades;
  }

  validarRegistro() {
    return this.nombre !== "" && this.vereda !== "" && this.hectareas > 0 && this.fechaCultivo !== "";
  }

  getDatosParaServidor(correo) {
    return {
      nombre_finca: this.nombre,
      vereda: this.vereda,
      hectareas: this.hectareas,
      fecha_cultivo: this.fechaCultivo,
      dificultades: this.dificultades,
      correo: correo
    };
  }
}

// Función para obtener token del usuario
function obtenerTokenUsuario() {
  const usuarioLogueado = localStorage.getItem('usuarioLogueado');
  if (!usuarioLogueado) {
    alert("Debes iniciar sesión para registrar una finca.");
    window.location.href = "index.html";
    return null;
  }
  
  const usuario = JSON.parse(usuarioLogueado);
  return usuario.id;
}

// Enviar registro al servidor
async function enviarRegistroAlServidor(datosFinca, token) {
  const response = await fetch('/api/registro-finca', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(datosFinca)
  });

  return await response.json();
}

// Formulario
const formulario = document.getElementById("registroFincaForm");

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = obtenerTokenUsuario();
    if (!token) return;

    const nombre = document.getElementById("nombreFinca").value.trim();
    const vereda = document.getElementById("vereda").value.trim();
    const hectareas = parseFloat(document.getElementById("hectareas").value);
    const fecha = document.getElementById("fechaCultivo").value;
    const dificultades = document.getElementById("dificultades").value.trim();
    const correo = document.getElementById("correoAgricultor").value.trim();

    const nuevaFinca = new Finca(nombre, vereda, hectareas, fecha, dificultades);

    if (!nuevaFinca.validarRegistro()) {
      alert("Por favor completa todos los campos correctamente.");
      return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Registrando...';
    submitBtn.disabled = true;

    try {
      const datosFinca = nuevaFinca.getDatosParaServidor(correo);
      const respuestaServidor = await enviarRegistroAlServidor(datosFinca, token);
      
      if (respuestaServidor.success) {
        // Enviar correo si EmailJS está disponible
        if (typeof emailjs !== 'undefined') {
          try {
            await emailjs.send("service_b3p8z9a", "template_6d0njs9", {
              to_email: correo,
              nombre: `Registro de Finca: ${nuevaFinca.nombre}`,
              mensaje: `Finca: ${nuevaFinca.nombre}\nVereda: ${nuevaFinca.vereda}\nHectáreas: ${nuevaFinca.hectareas}\nFecha: ${nuevaFinca.fechaCultivo}\nArchivo: ${respuestaServidor.archivo}`
            });
          } catch (emailError) {
            // Continuar aunque falle el email
          }
        }
        
        alert(`Finca registrada correctamente.\n\nArchivo: ${respuestaServidor.archivo}\nID: ${respuestaServidor.id}`);
        formulario.reset();
        
      } else {
        throw new Error(respuestaServidor.message || 'Error en el servidor');
      }
      
    } catch (error) {
      if (error.message.includes('Token')) {
        alert("Sesión expirada. Inicia sesión nuevamente.");
        localStorage.removeItem('usuarioLogueado');
        window.location.href = "index.html";
      } else {
        alert(`Error al registrar la finca: ${error.message}`);
      }
    } finally {
      submitBtn.textContent = 'REGISTRAR FINCA';
      submitBtn.disabled = false;
    }
  });
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
  const usuarioLogueado = localStorage.getItem('usuarioLogueado');
  
  if (!usuarioLogueado) {
    alert("Debes iniciar sesión para acceder a esta página.");
    window.location.href = "index.html";
    return;
  }
  
  try {
    const usuario = JSON.parse(usuarioLogueado);
    const elementoUsuario = document.getElementById('nombreUsuarioLogueado');
    if (elementoUsuario) {
      elementoUsuario.textContent = usuario.nombre;
    }
  } catch (error) {
    localStorage.removeItem('usuarioLogueado');
    window.location.href = "index.html";
  }
});

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('usuarioLogueado');
  alert("Sesión cerrada correctamente.");
  window.location.href = "index.html";
}

window.cerrarSesion = cerrarSesion;