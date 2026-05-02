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

    // Cargar búsquedas recientes
    loadRecentSearches();
});

async function loadRecentSearches() {
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;

    try {
        const response = await fetch('/api/recent');
        const data = await response.json();

        if (data.length === 0) {
            recentList.innerHTML = '<p class="no-recent">No hay búsquedas recientes.</p>';
            return;
        }

        recentList.innerHTML = '';
        data.forEach(s => {
            const item = document.createElement('a');
            item.className = 'recent-item animate-fade-in';
            item.href = `profile.html?region=${s.region}&name=${encodeURIComponent(s.gameName)}&tag=${encodeURIComponent(s.tagLine)}`;
            item.innerHTML = `
                <img src="https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/${s.profileIconId}.png" alt="icon">
                <div class="recent-info">
                    <span class="recent-name">${s.gameName}</span>
                    <span class="recent-tag">#${s.tagLine}</span>
                </div>
            `;
            recentList.appendChild(item);
        });
    } catch (error) {
        console.error('Error cargando recientes:', error);
    }
}

