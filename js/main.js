// js/main.js
import { RiotAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('summoner-search-form');
    const input = document.getElementById('summoner-input');
    const regionSelect = document.getElementById('region-select');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rawInput = input.value.trim();
        const region = regionSelect.value;
        
        if (!rawInput) return;

        // Parse GameName and TagLine (e.g., "Nanami#LAS" -> ["Nanami", "LAS"])
        let gameName = rawInput;
        let tagLine = "";

        if (rawInput.includes('#')) {
            const parts = rawInput.split('#');
            gameName = parts[0];
            tagLine = parts[1];
        } else {
            // Default tagline if none provided
            tagLine = region;
        }

        // Animar el botón mientras busca
        const btn = form.querySelector('.search-btn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.disabled = true;

        try {
            // Llamar a la API
            // Redirigir a la vista de perfil
            window.location.href = `profile.html?region=${encodeURIComponent(region)}&name=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(tagLine)}`;
            
        } catch (error) {
            console.error("Error buscando invocador:", error);
            alert("No se pudo conectar con el Proxy de Riot o el invocador no existe.");
        } finally {
            // Restaurar botón
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        }
    });
});
