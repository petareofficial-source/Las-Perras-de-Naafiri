const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const Summoner = require('./models/Summoner');
require('dotenv').config();

const app = express();
const PORT = 3000;

// CONFIGURACIÓN MONGODB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('[DB] Conectado a MongoDB (Nube/Local)'))
    .catch(err => console.error('[DB] Error de conexión a MongoDB. Revisa tu archivo .env:', err.message));

// API KEY DE RIOT (Desde .env)
const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
    console.error('[Error] No se encontró la RIOT_API_KEY en el archivo .env');
    process.exit(1);
}

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
 * ENDPOINT: Obtener datos básicos del Invocador por Riot ID
 */
app.get('/api/summoner/:region/:name/:tag', async (req, res) => {
    const { region, name, tag } = req.params;
    const routingUrl = getRegionUrl(region);
    const platformUrl = getPlatformUrl(region);

    try {
        // 1. Intentar buscar en la Base de Datos primero
        const cachedSummoner = await Summoner.findOne({ 
            gameName: new RegExp(`^${name}$`, 'i'), 
            tagLine: new RegExp(`^${tag}$`, 'i'), 
            region 
        });

        const now = new Date();
        const cacheTime = 10 * 60 * 1000; // 10 minutos

        if (cachedSummoner && (now - cachedSummoner.lastUpdated < cacheTime)) {
            console.log(`[Proxy] Sirviendo desde Caché (DB): ${name}#${tag}`);
            return res.json(cachedSummoner);
        }

        // 2. Si no está en DB o es viejo, pedir a Riot Account-V1
        console.log(`[Proxy] Pidiendo a Riot API: ${name}#${tag}`);
        const accountUrl = `https://${routingUrl}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_API_KEY}`;
        const accountResponse = await axios.get(accountUrl);
        const { puuid, gameName, tagLine } = accountResponse.data;

        // 3. Obtener datos de nivel e icono de Summoner-V4
        const summonerUrl = `https://${platformUrl}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerResponse = await axios.get(summonerUrl);
        const { summonerLevel, profileIconId } = summonerResponse.data;

        const finalData = { puuid, gameName, tagLine, summonerLevel, profileIconId, region, lastUpdated: new Date() };

        // 4. Guardar o Actualizar en la Base de Datos
        await Summoner.findOneAndUpdate(
            { puuid },
            finalData,
            { upsert: true, new: true }
        );

        res.json(finalData);
    } catch (error) {
        console.error('Error en /summoner:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'No se encontró al invocador' });
        }
        res.status(500).json({ error: 'Error al obtener datos del invocador' });
    }
});

/**
 * ENDPOINT: Obtener búsquedas recientes
 */
app.get('/api/recent', async (req, res) => {
    try {
        const recent = await Summoner.find().sort({ lastUpdated: -1 }).limit(6);
        res.json(recent);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener recientes' });
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
