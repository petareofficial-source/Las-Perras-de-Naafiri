// js/api.js
/**
 * Módulo para manejar las comunicaciones con el Proxy de Riot.
 */

export const PROXY_URL = 'http://localhost:3000/api'; 

// Versión por defecto (se actualizará dinámicamente)
let ddragonVersion = '14.8.1';

// Mapas de datos
let championMap = {};
let runeMap = {};
let spellMap = {};

/**
 * Obtiene la última versión de DataDragon de Riot para asegurar que las imágenes carguen.
 */
async function updateDDragonVersion() {
    try {
        const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await response.json();
        ddragonVersion = versions[0];
        console.log(`[API] Usando DataDragon v${ddragonVersion}`);
        
        // Cargar mapas en paralelo
        const [champRes, runeRes, spellRes] = await Promise.all([
            fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/es_ES/champion.json`),
            fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/es_ES/runesReforged.json`),
            fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/es_ES/summoner.json`)
        ]);

        const [champData, runeData, spellData] = await Promise.all([
            champRes.json(), runeRes.json(), spellRes.json()
        ]);

        // Mapear Campeones
        Object.values(champData.data).forEach(champ => {
            championMap[champ.key] = champ.id;
        });

        // Mapear Runas (Primarias y Secundarias)
        runeData.forEach(tree => {
            runeMap[tree.id] = { name: tree.name, icon: tree.icon };
            tree.slots.forEach(slot => {
                slot.runes.forEach(rune => {
                    runeMap[rune.id] = { name: rune.name, icon: rune.icon };
                });
            });
        });

        // Mapear Hechizos
        Object.values(spellData.data).forEach(spell => {
            spellMap[spell.key] = spell.id;
        });

    } catch (error) {
        console.error('[API] Error obteniendo metadatos de DDragon:', error);
    }
}

// Inicializar versión al cargar
updateDDragonVersion();

export const RiotAPI = {
    /**
     * Obtiene el nombre del campeón por su ID numérico
     */
    getChampionName(id) {
        return championMap[id] || "Desconocido";
    },

    /**
     * Obtiene la ruta del icono de la runa o árbol
     */
    getRuneIcon(id) {
        return runeMap[id]?.icon || "";
    },

    /**
     * Obtiene el ID del hechizo (ej: SummonerFlash) por su key
     */
    getSpellName(key) {
        return spellMap[key] || "SummonerEmpty";
    },
    /**
     * Obtiene la versión actual de DDragon.
     */
    getDDragonVersion() {
        return ddragonVersion;
    },

    /**
     * Busca la información de un invocador por su Riot ID (Nombre #Tag)
     * @param {string} gameName 
     * @param {string} tagLine 
     * @param {string} region 
     */
    async getSummonerByRiotId(gameName, tagLine, region) {
        console.log(`[API] Buscando a ${gameName}#${tagLine} en ${region}...`);
        
        try {
            const response = await fetch(`${PROXY_URL}/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
            
            if (!response.ok) {
                throw new Error(`Invocador no encontrado (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('[API] Error buscando invocador:', error);
            throw error;
        }
    },

    /**
     * Obtiene el historial de las últimas 10 partidas
     * @param {string} puuid 
     * @param {string} region 
     */
    async getMatchHistory(puuid, region) {
        console.log(`[API] Obteniendo historial para ${puuid} en ${region}...`);
        
        try {
            const response = await fetch(`${PROXY_URL}/matches/${region}/${encodeURIComponent(puuid)}`);
            
            if (!response.ok) {
                throw new Error(`Error al obtener partidas: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('[API] Error obteniendo historial:', error);
            return [];
        }
    },

    /**
     * Obtiene estadísticas de rango (Solo/Duo y Flex)
     */
    async getRankedStats(puuid, region) {
        try {
            const response = await fetch(`${PROXY_URL}/league/${region}/${encodeURIComponent(puuid)}`);
            if (!response.ok) throw new Error('Error al obtener rangos');
            return await response.json();
        } catch (error) {
            console.error('[API] Error en getRankedStats:', error);
            return [];
        }
    },

    /**
     * Obtiene los 3 campeones con más maestría
     */
    async getChampionMastery(puuid, region) {
        try {
            const response = await fetch(`${PROXY_URL}/mastery/${region}/${encodeURIComponent(puuid)}`);
            if (!response.ok) throw new Error('Error al obtener maestrías');
            return await response.json();
        } catch (error) {
            console.error('[API] Error en getChampionMastery:', error);
            return [];
        }
    },

    /**
     * Obtiene datos de partida en vivo
     */
    async getLiveGame(puuid, region) {
        try {
            const response = await fetch(`${PROXY_URL}/spectator/${region}/${encodeURIComponent(puuid)}`);
            if (!response.ok) throw new Error('Error al obtener partida en vivo');
            return await response.json();
        } catch (error) {
            console.error('[API] Error en getLiveGame:', error);
            return { inGame: false };
        }
    },

    /**
     * Fuerza la actualización de los datos del invocador
     */
    async updateSummoner(puuid, region) {
        console.log(`[API] Solicitando actualización de datos para ${puuid}...`);
        try {
            const response = await fetch(`${PROXY_URL}/summoner/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puuid, region })
            });

            if (!response.ok) throw new Error('Falló la actualización');
            return await response.json();
        } catch (error) {
            console.error('[API] Error en actualización:', error);
            throw error;
        }
    }
};

