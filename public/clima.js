// =======================
// CLIMA BIOKUAM
// FECHA: 13-11-2025
// DOCUMENTACIÓN: CMCB, JSNT
// =======================

// ⚠️ Reemplaza con tu propia API KEY de OpenWeatherMap
const API_KEY = "0841f15208b7901a56d98c77f871acf9";
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
