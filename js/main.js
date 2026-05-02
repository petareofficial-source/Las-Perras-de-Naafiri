// js/main.js
import { RiotAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('summoner-search-form');
    const input = document.getElementById('summoner-input');
    const regionSelect = document.getElementById('region-select');

    // Manejar el envío del formulario de búsqueda
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rawInput = input.value.trim();
        const region = regionSelect.value;
        
        if (!rawInput) return;

        // Separar el nombre del invocador y el tag (ej: "Nanami#LAS" -> ["Nanami", "LAS"])
        let gameName = rawInput;
        let tagLine = "";

        if (rawInput.includes('#')) {
            const parts = rawInput.split('#');
            gameName = parts[0];
            tagLine = parts[1];
        } else {
            // Tag por defecto si el usuario no pone uno (usamos la región)
            tagLine = region;
        }

        // Animación de carga en el botón de búsqueda
        const btn = form.querySelector('.search-btn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.disabled = true;

        try {
            // Redirigir a la página de perfil pasando los parámetros en la URL
            // El profile.js se encargará de leer estos datos y llamar al proxy
            window.location.href = `profile.html?region=${encodeURIComponent(region)}&name=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(tagLine)}`;
            
        } catch (error) {
            console.error("Error en la búsqueda:", error);
            alert("No se pudo conectar con el servidor. Revisa que el Proxy esté encendido.");
        } finally {
            // Restaurar el estado del botón
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        }
    });
});

