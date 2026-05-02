// js/profile.js
import { RiotAPI } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Leer los parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const region = urlParams.get('region');
    const gameName = urlParams.get('name');
    const tagLine = urlParams.get('tag');

    if (!region || !gameName || !tagLine) {
        // Si no hay parámetros, volver a index
        window.location.href = 'index.html';
        return;
    }

    // Elementos del DOM a actualizar
    const summonerNameEl = document.querySelector('.summoner-name');
    const summonerTagEl = document.querySelector('.summoner-tag');
    const summonerLevelEl = document.querySelector('.summoner-level');
    const btnUpdate = document.querySelector('.btn-update');

    // Estado de carga inicial
    summonerNameEl.textContent = "Cargando...";
    summonerTagEl.textContent = "";
    summonerLevelEl.textContent = "--";

    try {
        // 1. Obtener datos del Invocador
        const summonerData = await RiotAPI.getSummonerByRiotId(gameName, tagLine, region);
        
        // Asumiendo que el proxy retorna un objeto con { gameName, tagLine, summonerLevel, profileIconId, puuid }
        summonerNameEl.textContent = summonerData.gameName || gameName;
        summonerTagEl.textContent = `#${summonerData.tagLine || tagLine}`;
        summonerLevelEl.textContent = summonerData.summonerLevel || "0";
        document.title = `${summonerData.gameName} #${summonerData.tagLine} - Las Perras de Naafiri`;

        // 2. Obtener Historial de Partidas
        const matchListEl = document.querySelector('.match-list');
        matchListEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">Cargando partidas...</div>';
        
        if (summonerData.puuid) {
            const matches = await RiotAPI.getMatchHistory(summonerData.puuid, region);
            renderMatches(matches, summonerData.puuid);
        }

    } catch (error) {
        console.error("Error cargando el perfil:", error);
        summonerNameEl.textContent = "Invocador no encontrado";
        summonerTagEl.textContent = "";
        document.querySelector('.match-list').innerHTML = '<div style="padding: 20px; color: #ef4444; text-align: center;">Hubo un error al conectar con el servidor proxy.</div>';
    }

    // Listener para el botón Actualizar
    btnUpdate.addEventListener('click', async () => {
        const originalText = btnUpdate.textContent;
        btnUpdate.textContent = "Actualizando...";
        btnUpdate.disabled = true;
        
        // Simular o llamar API real de update
        await new Promise(r => setTimeout(r, 1000));
        
        btnUpdate.textContent = originalText;
        btnUpdate.disabled = false;
        // Recargar página para reflejar cambios
        window.location.reload();
    });
});

/**
 * Función para renderizar las tarjetas de partidas en el DOM
 */
function renderMatches(matches, currentPuuid) {
    const matchListEl = document.querySelector('.match-list');
    
    if (!matches || matches.length === 0) {
        matchListEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No se encontraron partidas recientes.</div>';
        return;
    }

    matchListEl.innerHTML = ''; // Limpiar estado de carga

    matches.forEach(match => {
        // Asumiendo que el match object del proxy es similar a la API de Riot
        // Buscamos a nuestro jugador en la partida
        const me = match.info?.participants?.find(p => p.puuid === currentPuuid) || {};
        
        const isWin = me.win;
        const cardClass = isWin ? 'win' : 'loss';
        const resultText = isWin ? 'Victoria' : 'Derrota';
        
        // KDA
        const kills = me.kills || 0;
        const deaths = me.deaths || 0;
        const assists = me.assists || 0;
        const kdaRatio = deaths === 0 ? "Perfecto" : ((kills + assists) / deaths).toFixed(2) + ":1 KDA";
        
        // Creación del HTML de la tarjeta
        const cardHTML = `
            <div class="match-card ${cardClass}">
                <div class="match-decoration"></div>
                <div class="match-info">
                    <div class="match-type">${match.info?.gameMode || 'Normal'}</div>
                    <div class="match-time-ago">hace poco</div>
                    <div class="match-divider"></div>
                    <div class="match-result-text">${resultText}</div>
                    <div class="match-duration">${Math.floor((match.info?.gameDuration || 0) / 60)}m</div>
                </div>
                
                <div class="match-player">
                    <div class="player-champion">
                        <img src="https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${me.championName || 'Aatrox'}.png" alt="${me.championName}" class="champ-icon" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/29.png'">
                        <div class="champ-level">${me.champLevel || 1}</div>
                    </div>
                    <div class="player-kda-stats" style="margin-left: 15px;">
                        <div class="kda">
                            <span class="kills">${kills}</span> / <span class="deaths">${deaths}</span> / <span class="assists">${assists}</span>
                        </div>
                        <div class="kda-ratio">${kdaRatio}</div>
                        <div class="cs-info">${me.totalMinionsKilled || 0} CS</div>
                    </div>
                </div>
            </div>
        `;
        
        matchListEl.insertAdjacentHTML('beforeend', cardHTML);
    });
}
