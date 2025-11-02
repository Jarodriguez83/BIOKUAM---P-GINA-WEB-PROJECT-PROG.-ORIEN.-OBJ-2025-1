/*
    RECUPERACIÓN DE CONTRASEÑA - BIOKUAM
     FECHA: 15-04-2025
     PROGRAMADO POR: CMCB / JSNT
*/
let codigoGenerado = "";

document.getElementById("form-correo").addEventListener("submit", function (e) {
  e.preventDefault();
  const correo = document.getElementById("correo").value;

  // Generar código de verificación
  codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();

  const templateParams = {
    to_email: correo,
    nombre: "Usuario",
    codigo: codigoGenerado,
  };

  emailjs.send("service_b3p8z9a", "template_151bm3h", templateParams)
    .then(function () {
      console.log("Correo enviado correctamente");
      alert("Código enviado a tu correo");
      mostrarFormulario("form-codigo");
    })
    .catch(function (error) {
      console.error("Error EmailJS: ", error);
      alert("Hubo un error al enviar el correo");
    });
});

document.getElementById("form-codigo").addEventListener("submit", function (e) {
  e.preventDefault();
  const codigoIngresado = document.getElementById("codigo").value;

  if (codigoIngresado === codigoGenerado) {
    alert("Código verificado correctamente");
    mostrarFormulario("form-nueva");
  } else {
    alert("El código es incorrecto");
  }
});

document.getElementById("form-nueva").addEventListener("submit", function (e) {
  e.preventDefault();
  const nueva = document.getElementById("nueva").value;
  const confirmar = document.getElementById("confirmar").value;

  if (nueva === confirmar) {
    alert("Contraseña cambiada correctamente");
    window.location.href = "index.html";
  } else {
    alert("Las contraseñas no coinciden");
  }
});

function mostrarFormulario(id) {
  document.querySelectorAll(".formulario").forEach(f => f.classList.remove("activo"));
  document.getElementById(id).classList.add("activo");
}
