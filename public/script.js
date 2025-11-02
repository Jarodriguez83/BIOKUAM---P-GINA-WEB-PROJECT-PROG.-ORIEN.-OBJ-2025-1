/*
    PÁGINA DE REGISTRO - BIOKUAM
     FECHA: 01-04-2025
     PROGRAMADO POR: CMCB / JSNT
*/
// Clase Usuario
class Usuario {
    constructor(nombre, celular, correo, tipoDoc, numDoc, contrasena) {
        this.id = this.generarID();
        this.nombre = nombre;
        this.celular = celular;
        this.correo = correo;
        this.tipoDoc = tipoDoc;
        this.numDoc = numDoc;
        this.contrasena = contrasena;
        this.fechaRegistro = new Date().toISOString();
    }

    generarID() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 3);
        return `BKM${timestamp}${random}`;
    }

    validar() {
        return (
            this.nombre !== "" &&
            this.correo.includes("@") &&
            this.contrasena.length >= 6 &&
            this.numDoc !== "" &&
            this.tipoDoc !== ""
        );
    }
    
    getDatosParaServidor() {
        return {
            id: this.id,
            nombre: this.nombre,
            celular: this.celular,
            correo: this.correo,
            tipoDoc: this.tipoDoc,
            contrasena: this.contrasena,
            numDoc: this.numDoc,
            fechaRegistro: this.fechaRegistro
        };
    }
}

// Funciones de UI
function mostrarFormulario(tipo) {
    const loginForm = document.getElementById('loginForm');
    const registroForm = document.getElementById('registroForm');
    const tabs = document.querySelectorAll('.tab-button');

    if (tipo === 'login') {
        loginForm.classList.add('active');
        registroForm.classList.remove('active');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registroForm.classList.add('active');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function togglePassword(id, el) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
    el.textContent = input.type === "text" ? "◎" : "◉";
}

// Login
async function iniciarSesion(event) {
    event.preventDefault();

    const correoIngresado = document.getElementById("loginUsuario").value.trim();
    const claveIngresada = document.getElementById("loginPassword").value.trim();

    if (!correoIngresado || !claveIngresada) {
        alert("Por favor, complete todos los campos.");
        return;
    }

    try {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Iniciando...';
        submitBtn.disabled = true;

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo: correoIngresado,
                contrasena: claveIngresada
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
            alert(`Bienvenido ${data.usuario.nombre}!`);
            document.getElementById("loginForm").reset();
            window.location.href = "pagina.principal.html";
        } else {
            alert(data.message);
        }

        submitBtn.textContent = 'INGRESAR';
        submitBtn.disabled = false;

    } catch (error) {
        alert('Error de conexión con el servidor.');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'INGRESAR';
        submitBtn.disabled = false;
    }
}

// Registro
document.getElementById("registroForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const celular = document.getElementById("celular").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const tipoDoc = document.getElementById("tipo_documento").value;
    const numDoc = document.getElementById("numero_documento").value.trim();
    const contrasena = document.getElementById("contrasena").value;
    const confirmar = document.getElementById("confirmar_contrasena").value;
    const terminos = document.getElementById("terminos").checked;

    if (contrasena !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    if (!terminos) {
        alert("Debes aceptar los términos y condiciones.");
        return;
    }

    const nuevoUsuario = new Usuario(nombre, celular, correo, tipoDoc, numDoc, contrasena);

    if (!nuevoUsuario.validar()) {
        alert("Datos inválidos. Verifica todos los campos.");
        return;
    }

    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Registrando...';
        submitBtn.disabled = true;

        const response = await fetch('/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario.getDatosParaServidor())
        });

        const data = await response.json();

        if (data.success) {
            // Enviar correo si EmailJS está disponible
            if (typeof emailjs !== 'undefined') {
                try {
                    await emailjs.send("service_b3p8z9a", "template_6d0njs9", {
                        to_email: correo,
                        nombre: nombre,
                        id_usuario: nuevoUsuario.id
                    });
                } catch (emailError) {
                    // Continuar aunque falle el email
                }
            }
            
            alert(`Registro exitoso!\n\nID: ${data.usuario.id}\nNombre: ${data.usuario.nombre}`);
            document.getElementById("registroForm").reset();
            mostrarFormulario('login');
        } else {
            alert(`Error: ${data.message}`);
        }

        submitBtn.textContent = 'CREAR CUENTA';
        submitBtn.disabled = false;

    } catch (error) {
        alert("Error de conexión con el servidor.");
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'CREAR CUENTA';
        submitBtn.disabled = false;
    }
});

// Validaciones básicas
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarDocumento(numero) {
    return numero.length >= 6 && /^\d+$/.test(numero);
}

// Validaciones en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const correoInput = document.getElementById('correo');
    const documentoInput = document.getElementById('numero_documento');
    
    if (correoInput) {
        correoInput.addEventListener('blur', function() {
            if (this.value && !validarEmail(this.value)) {
                this.style.borderColor = 'red';
            } else {
                this.style.borderColor = '';
            }
        });
    }
    
    if (documentoInput) {
        documentoInput.addEventListener('blur', function() {
            if (this.value && !validarDocumento(this.value)) {
                this.style.borderColor = 'red';
            } else {
                this.style.borderColor = '';
            }
        });
    }
});