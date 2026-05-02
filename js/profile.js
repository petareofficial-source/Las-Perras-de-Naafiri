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

        // 2. Cargar datos adicionales en paralelo (Incluyendo Live Game)
        if (summonerData.puuid) {
            const [rankedData, masteryData, matches, liveGame] = await Promise.all([
                RiotAPI.getRankedStats(summonerData.puuid, region),
                RiotAPI.getChampionMastery(summonerData.puuid, region),
                RiotAPI.getMatchHistory(summonerData.puuid, region),
                RiotAPI.getLiveGame(summonerData.puuid, region)
            ]);

            renderLiveGame(liveGame, summonerData.puuid, version);
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

    // Lógica del buscador mini del Navbar
    const miniForm = document.getElementById('mini-search-form');
    if (miniForm) {
        miniForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const miniInput = miniForm.querySelector('.mini-search-input').value.trim();
            const miniRegion = miniForm.querySelector('.mini-region-select').value;
            
            if (!miniInput) return;
            
            let [name, tag] = miniInput.split('#');
            if (!tag) tag = miniRegion;
            
            window.location.href = `profile.html?region=${miniRegion}&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`;
        });
    }
});

/**
 * Renderiza el estado de partida en vivo
 */
function renderLiveGame(game, currentPuuid, version) {
    const container = document.getElementById('live-game-container');
    if (!game || game.inGame === false || !game.participants) {
        container.innerHTML = '';
        return;
    }

    const me = game.participants.find(p => p.puuid === currentPuuid);
    const champName = RiotAPI.getChampionName(me.championId);

    container.innerHTML = `
        <div class="live-game-card animate-fade-in">
            <div class="live-badge">Live</div>
            <div class="player-champion">
                <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png" class="champ-icon" style="width: 60px; height: 60px;">
            </div>
            <div class="live-info">
                <h3>En Partida: ${game.gameMode}</h3>
                <p>Jugando con <strong>${champName}</strong></p>
                <p>Mapa: ${game.gameId > 0 ? 'La Grieta del Invocador' : 'Cargando...'}</p>
            </div>
        </div>
    `;
}

/**
 * Renderiza las estadísticas de Ranked (Solo/Duo y Flex)
 */
function renderRankedStats(data) {
    const cards = document.querySelectorAll('.ranked-card');
    cards.forEach(card => card.style.opacity = '0.5');

    data.forEach(entry => {
        const isSolo = entry.queueType === 'RANKED_SOLO_5x5';
        const card = isSolo ? cards[0] : cards[1];
        
        if (card) {
            card.style.opacity = '1';
            card.classList.add('animate-fade-in');
            const tier = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
            card.querySelector('.ranked-tier').textContent = `${tier} ${entry.rank}`;
            card.querySelector('.ranked-lp').textContent = `${entry.leaguePoints} LP`;
            card.querySelector('.wins').textContent = `${entry.wins}V`;
            card.querySelector('.losses').textContent = `${entry.losses}D`;
            
            const winrate = Math.round((entry.wins / (entry.wins + entry.losses)) * 100);
            card.querySelector('.winrate-percent').textContent = `${winrate}% Win Rate`;
            
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
    
    data.forEach((m, index) => {
        const champName = RiotAPI.getChampionName(m.championId);
        const html = `
            <div class="champ-item animate-fade-in" style="animation-delay: ${index * 0.1}s">
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
 * Renderiza el historial de partidas premium con Runas y Hechizos dinámicos
 */
function renderMatches(matches, currentPuuid, version) {
    const matchListEl = document.querySelector('.match-list');
    if (!matches || matches.length === 0) {
        matchListEl.innerHTML = '<div class="no-matches">No hay partidas recientes.</div>';
        return;
    }

    matchListEl.innerHTML = '';

    matches.forEach((match, index) => {
        const me = match.info?.participants?.find(p => p.puuid === currentPuuid) || {};
        const isWin = me.win;
        const resultText = isWin ? 'Victoria' : 'Derrota';
        
        const durationMin = Math.floor(match.info.gameDuration / 60);
        const durationSec = match.info.gameDuration % 60;
        
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

        // Obtener Runas y Hechizos dinámicos
        const spell1 = RiotAPI.getSpellName(me.summoner1Id);
        const spell2 = RiotAPI.getSpellName(me.summoner2Id);
        const runeMain = RiotAPI.getRuneIcon(me.perks?.styles[0]?.selections[0]?.perk);
        const runeSec = RiotAPI.getRuneIcon(me.perks?.styles[1]?.style);

        const cardHTML = `
            <div class="match-card ${isWin ? 'win' : 'loss'} animate-fade-in" style="animation-delay: ${index * 0.05}s">
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
                    <div class="player-spells-runes">
                        <div class="spells">
                            <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell1}.png" alt="Spell1">
                            <img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell2}.png" alt="Spell2">
                        </div>
                        <div class="runes">
                            <img src="https://ddragon.leagueoflegends.com/cdn/img/${runeMain}" alt="Main Rune">
                            <img src="https://ddragon.leagueoflegends.com/cdn/img/${runeSec}" alt="Sec Rune">
                        </div>
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

