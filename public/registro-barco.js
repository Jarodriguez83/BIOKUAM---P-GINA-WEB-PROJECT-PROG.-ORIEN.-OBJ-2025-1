/*
    PÁGINA DE REGISTRO PARA EL DISPOSITIVO (BARCO) - BIOKUAM
     FECHA: 22-04-2025
     PROGRAMADO POR: CMCB / JSNT
*/
// Clase Barco
class Barco {
  constructor(nombre, imei, funcionalidades, correo) {
    this.nombre = nombre.trim();
    this.imei = imei.trim();
    this.funcionalidades = funcionalidades;
    this.correo = correo.trim();
  }

  esValido() {
    return (
      this.nombre !== "" &&
      this.imei.length >= 8 &&
      this.funcionalidades.length > 0 &&
      this.validarCorreo(this.correo)
    );
  }

  validarCorreo(correo) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
  }

  getDatosParaServidor() {
    return {
      nombre_barco: this.nombre,
      imei_barco: this.imei,
      funcionalidades: this.funcionalidades.join(", "),
      correo: this.correo
    };
  }
}

// Función para obtener token del usuario
function obtenerTokenUsuario() {
  const usuarioLogueado = localStorage.getItem('usuarioLogueado');
  if (!usuarioLogueado) {
    alert("Debes iniciar sesión para registrar un barco.");
    window.location.href = "index.html";
    return null;
  }
  
  const usuario = JSON.parse(usuarioLogueado);
  return usuario.id;
}

// Enviar registro al servidor
async function enviarRegistroAlServidor(datosBarco, token) {
  const response = await fetch('/api/registro-barco', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(datosBarco)
  });

  return await response.json();
}

// Formulario
const formulario = document.getElementById("registroBarcoForm");

if (formulario) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = obtenerTokenUsuario();
    if (!token) return;

    const nombre = document.getElementById("nombre_barco").value.trim();
    const imei = document.getElementById("imei_barco").value.trim();
    const correo = document.getElementById("correo_barco").value.trim();
    const funcionalidadesSeleccionadas = Array.from(
      document.querySelectorAll('input[name="funcionalidades"]:checked')
    ).map(cb => cb.value);

    const nuevoBarco = new Barco(nombre, imei, funcionalidadesSeleccionadas, correo);

    if (!nuevoBarco.esValido()) {
      alert("Por favor completa todos los campos correctamente. El IMEI debe tener mínimo 8 caracteres.");
      return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Registrando...';
    submitBtn.disabled = true;

    try {
      const datosBarco = nuevoBarco.getDatosParaServidor();
      const respuestaServidor = await enviarRegistroAlServidor(datosBarco, token);
      
      if (respuestaServidor.success) {
        // Enviar correo si EmailJS está disponible
        if (typeof emailjs !== 'undefined') {
          try {
            await emailjs.send("service_b3p8z9a", "template_6d0njs9", {
              to_email: correo,
              nombre: `Registro de Barco: ${nuevoBarco.nombre}`,
              mensaje: `Barco: ${nuevoBarco.nombre}\nIMEI: ${nuevoBarco.imei}\nFuncionalidades: ${nuevoBarco.funcionalidades.join(", ")}\nArchivo: ${respuestaServidor.archivo}`
            });
          } catch (emailError) {
            // Continuar aunque falle el email
          }
        }
        
        alert(`Barco registrado correctamente.\n\nArchivo: ${respuestaServidor.archivo}\nID: ${respuestaServidor.id}`);
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
        alert(`Error al registrar el barco: ${error.message}`);
      }
    } finally {
      submitBtn.textContent = 'REGISTRAR BARCO';
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