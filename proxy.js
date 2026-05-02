const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// CONFIGURACIÓN: Pega aquí tu API Key de Riot Games
const RIOT_API_KEY = process.env.RIOT_API_KEY || "RGAPI-2d49451d-667e-4ca4-80c2-4f8e4f968db6";

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

/**
 * Utilidad para obtener la URL de ruteo de Riot (Regional)
 */
const getRegionUrl = (region) => {
    const r = region.toUpperCase();
    const routing = {
        'NA': 'americas', 'NA1': 'americas',
        'BR': 'americas', 'BR1': 'americas',
        'LAN': 'americas', 'LA1': 'americas',
        'LAS': 'americas', 'LA2': 'americas',
        'KR': 'asia',
        'JP': 'asia', 'JP1': 'asia',
        'EUW': 'europe', 'EUW1': 'europe',
        'EUNE': 'europe', 'EUN1': 'europe',
        'TR': 'europe', 'TR1': 'europe',
        'RU': 'europe',
        'OCE': 'sea', 'OC1': 'sea',
        'PH': 'sea', 'PH2': 'sea',
        'SG': 'sea', 'SG2': 'sea',
        'TH': 'sea', 'TH2': 'sea',
        'TW': 'sea', 'TW2': 'sea',
        'VN': 'sea', 'VN2': 'sea'
    };
    return routing[r] || 'americas';
};

/**
 * Utilidad para obtener el ID de plataforma de Riot
 */
const getPlatformUrl = (region) => {
    const r = region.toUpperCase();
    const platforms = {
        'NA': 'na1', 'NA1': 'na1',
        'BR': 'br1', 'BR1': 'br1',
        'LAN': 'la1', 'LA1': 'la1',
        'LAS': 'la2', 'LA2': 'la2',
        'KR': 'kr',
        'JP': 'jp1', 'JP1': 'jp1',
        'EUW': 'euw1', 'EUW1': 'euw1',
        'EUNE': 'eun1', 'EUN1': 'eun1',
        'TR': 'tr1', 'TR1': 'tr1',
        'RU': 'ru',
        'OCE': 'oc1', 'OC1': 'oc1',
        'PH': 'ph2', 'PH2': 'ph2',
        'SG': 'sg2', 'SG2': 'sg2',
        'TH': 'th2', 'TH2': 'th2',
        'TW': 'tw2', 'TW2': 'tw2',
        'VN': 'vn2', 'VN2': 'vn2'
    };
    return platforms[r] || 'la2';
};

/**
 * ENDPOINT: Obtener invocador por Riot ID (Name #Tag)
 */
app.get('/api/summoner/:region/:name/:tag', async (req, res) => {
    const { region, name, tag } = req.params;
    const regionUrl = getRegionUrl(region);
    const platformUrl = getPlatformUrl(region);

    try {
        // 1. Obtener PUUID desde Riot ID (Account-V1)
        const accountUrl = `https://${regionUrl}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await axios.get(accountUrl);
        const { puuid, gameName, tagLine } = accountRes.data;

        // 2. Obtener datos de Summoner (Summoner-V4) para el nivel e icono
        const summonerUrl = `https://${platformUrl}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await axios.get(summonerUrl);

        res.json({
            puuid,
            gameName,
            tagLine,
            summonerLevel: summonerRes.data.summonerLevel,
            profileIconId: summonerRes.data.profileIconId,
            id: summonerRes.data.id
        });
    } catch (error) {
        console.error('Error en /summoner:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: 'No se encontró al invocador' });
    }
});

/**
 * ENDPOINT: Obtener estadísticas de liga (Ranked Solo/Flex)
 */
app.get('/api/league/:region/:puuid', async (req, res) => {
    const { region, puuid } = req.params;
    const platformUrl = getPlatformUrl(region);

    try {
        const leagueUrl = `https://${platformUrl}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const response = await axios.get(leagueUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error en /league:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al obtener ligas' });
    }
});

/**
 * ENDPOINT: Obtener maestría de campeones (Top 3)
 */
app.get('/api/mastery/:region/:puuid', async (req, res) => {
    const { region, puuid } = req.params;
    const platformUrl = getPlatformUrl(region);

    try {
        const masteryUrl = `https://${platformUrl}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3&api_key=${RIOT_API_KEY}`;
        const response = await axios.get(masteryUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error en /mastery:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al obtener maestrías' });
    }
});

/**
 * ENDPOINT: Obtener partida en vivo (Spectator-V5)
 */
app.get('/api/spectator/:region/:puuid', async (req, res) => {
    const { region, puuid } = req.params;
    const platformUrl = getPlatformUrl(region);

    try {
        const spectatorUrl = `https://${platformUrl}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${RIOT_API_KEY}`;
        const response = await axios.get(spectatorUrl);
        res.json(response.data);
    } catch (error) {
        // 404 significa que no está en partida, no es un error crítico
        if (error.response?.status === 404) {
            return res.json({ inGame: false });
        }
        console.error('Error en /spectator:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al obtener partida en vivo' });
    }
});

/**
 * ENDPOINT: Obtener historial de partidas (Match-V5)
 */
app.get('/api/matches/:region/:puuid', async (req, res) => {
    const { region, puuid } = req.params;
    const regionUrl = getRegionUrl(region);

    try {
        // 1. Obtener lista de IDs de partidas
        const matchListUrl = `https://${regionUrl}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10&api_key=${RIOT_API_KEY}`;
        const matchListRes = await axios.get(matchListUrl);
        const matchIds = matchListRes.data;

        // 2. Obtener detalles de cada partida
        const matchPromises = matchIds.map(id => 
            axios.get(`https://${regionUrl}.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${RIOT_API_KEY}`)
        );
        
        const matchesRes = await Promise.all(matchPromises);
        const matchesData = matchesRes.map(m => m.data);

        res.json(matchesData);
    } catch (error) {
        console.error('Error en /matches:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al obtener partidas' });
    }
});

app.listen(PORT, () => {
    console.log(`[Proxy] Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[Proxy] Recuerda configurar tu RIOT_API_KEY`);
});
