// js/profile.js
import { RiotAPI } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Leer los parámetros de la URL para saber a quién buscar
    const urlParams = new URLSearchParams(window.location.search);
    const region = urlParams.get('region');
    const gameName = urlParams.get('name');
    const tagLine = urlParams.get('tag');

    // Si faltan datos esenciales, volvemos al inicio
    if (!region || !gameName || !tagLine) {
        window.location.href = 'index.html';
        return;
    }

    // Referencias a elementos del DOM para mostrar los datos
    const summonerNameEl = document.querySelector('.summoner-name');
    const summonerTagEl = document.querySelector('.summoner-tag');
    const summonerLevelEl = document.querySelector('.summoner-level');
    const summonerIconEl = document.querySelector('.summoner-icon');
    const btnUpdate = document.querySelector('.btn-update');

    // Estado visual inicial de carga
    summonerNameEl.textContent = "Cargando...";
    summonerTagEl.textContent = "";
    summonerLevelEl.textContent = "--";

    try {
        // 1. Obtener datos básicos del Invocador
        const summonerData = await RiotAPI.getSummonerByRiotId(gameName, tagLine, region);
        const version = RiotAPI.getDDragonVersion();
        
        // Actualizar la interfaz básica
        summonerNameEl.textContent = summonerData.gameName || gameName;
        summonerTagEl.textContent = `#${summonerData.tagLine || tagLine}`;
        summonerLevelEl.textContent = summonerData.summonerLevel || "0";
        document.title = `${summonerData.gameName} #${summonerData.tagLine} - Perfil`;

        if (summonerIconEl && summonerData.profileIconId) {
            summonerIconEl.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${summonerData.profileIconId}.png`;
        }

        // 2. Cargar datos adicionales en paralelo
        if (summonerData.puuid) {
            const [rankedData, masteryData, matches] = await Promise.all([
                RiotAPI.getRankedStats(summonerData.puuid, region),
                RiotAPI.getChampionMastery(summonerData.puuid, region),
                RiotAPI.getMatchHistory(summonerData.puuid, region)
            ]);

            renderRankedStats(rankedData);
            renderMasteries(masteryData, version);
            renderMatches(matches, summonerData.puuid, version);
        }

    } catch (error) {
        console.error("Error cargando el perfil:", error);
        summonerNameEl.textContent = "Invocador no encontrado";
        document.querySelector('.match-list').innerHTML = `<div class="error-msg">Error al cargar datos.</div>`;
    }

    // Botón Actualizar
    if (btnUpdate) {
        btnUpdate.addEventListener('click', () => window.location.reload());
    }
});

/**
 * Renderiza las estadísticas de Ranked (Solo/Duo y Flex)
 */
function renderRankedStats(data) {
    const cards = document.querySelectorAll('.ranked-card');
    
    // Limpiar estados por defecto
    cards.forEach(card => card.style.opacity = '0.5');

    data.forEach(entry => {
        const isSolo = entry.queueType === 'RANKED_SOLO_5x5';
        const card = isSolo ? cards[0] : cards[1];
        
        if (card) {
            card.style.opacity = '1';
            const tier = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
            card.querySelector('.ranked-tier').textContent = `${tier} ${entry.rank}`;
            card.querySelector('.ranked-lp').textContent = `${entry.leaguePoints} LP`;
            card.querySelector('.wins').textContent = `${entry.wins}V`;
            card.querySelector('.losses').textContent = `${entry.losses}D`;
            
            const winrate = Math.round((entry.wins / (entry.wins + entry.losses)) * 100);
            card.querySelector('.winrate-percent').textContent = `${winrate}% Win Rate`;
            
            // Actualizar emblema
            const emblemImg = card.querySelector('.ranked-emblem');
            if (emblemImg) {
                emblemImg.src = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${entry.tier.toLowerCase()}.png`;
            }
        }
    });
}

/**
 * Renderiza el Top 3 de Maestrías
 */
function renderMasteries(data, version) {
    const champListEl = document.querySelector('.champ-list');
    if (!champListEl || !data) return;

    champListEl.innerHTML = '';
    
    data.forEach(m => {
        const champName = RiotAPI.getChampionName(m.championId);
        const html = `
            <div class="champ-item">
                <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png" alt="${champName}">
                <div class="champ-info">
                    <div class="champ-name">${champName}</div>
                    <div class="champ-kda">Nivel ${m.championLevel}</div>
                </div>
                <div class="champ-winrate">
                    <div class="wr-text">${(m.championPoints / 1000).toFixed(1)}k</div>
                    <div class="games-played">Puntos</div>
                </div>
            </div>
        `;
        champListEl.insertAdjacentHTML('beforeend', html);
    });
}

/**
 * Renderiza el historial de partidas premium
 */
function renderMatches(matches, currentPuuid, version) {
    const matchListEl = document.querySelector('.match-list');
    if (!matches || matches.length === 0) {
        matchListEl.innerHTML = '<div class="no-matches">No hay partidas recientes.</div>';
        return;
    }

    matchListEl.innerHTML = '';

    matches.forEach(match => {
        const me = match.info?.participants?.find(p => p.puuid === currentPuuid) || {};
        const isWin = me.win;
        const resultText = isWin ? 'Victoria' : 'Derrota';
        
        // Formatear duración y tiempo transcurrido
        const durationMin = Math.floor(match.info.gameDuration / 60);
        const durationSec = match.info.gameDuration % 60;
        
        // Participantes por equipo
        const blueTeam = match.info.participants.slice(0, 5);
        const redTeam = match.info.participants.slice(5, 10);

        const renderParticipant = (p) => `
            <div class="participant ${p.puuid === currentPuuid ? 'bold' : ''}">
                <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${p.championName}.png">
                <span class="p-name">${p.riotIdGameName || p.summonerName}</span>
            </div>
        `;

        const itemsHTML = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6].map(id => 
            id > 0 ? `<div class="item-slot"><img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png"></div>` 
                   : `<div class="item-slot empty"></div>`
        ).join('');

        const cardHTML = `
            <div class="match-card ${isWin ? 'win' : 'loss'}">
                <div class="match-decoration"></div>
                <div class="match-info">
                    <div class="match-type">${match.info.gameMode}</div>
                    <div class="match-result">${resultText}</div>
                    <div class="match-duration">${durationMin}:${durationSec.toString().padStart(2, '0')}</div>
                </div>
                
                <div class="match-player">
                    <div class="player-champion">
                        <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${me.championName}.png" class="champ-icon">
                        <div class="champ-level">${me.champLevel}</div>
                    </div>
                    <div class="player-kda-stats">
                        <div class="kda">
                            <span class="kills">${me.kills}</span> / <span class="deaths">${me.deaths}</span> / <span class="assists">${me.assists}</span>
                        </div>
                        <div class="cs-info">${me.totalMinionsKilled + (me.neutralMinionsKilled || 0)} CS</div>
                    </div>
                </div>

                <div class="match-items">${itemsHTML}</div>

                <div class="match-participants">
                    <div class="team blue-team">${blueTeam.map(renderParticipant).join('')}</div>
                    <div class="team red-team">${redTeam.map(renderParticipant).join('')}</div>
                </div>
            </div>
        `;
        matchListEl.insertAdjacentHTML('beforeend', cardHTML);
    });
}

