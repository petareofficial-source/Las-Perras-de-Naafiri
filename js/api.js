// js/api.js
/**
 * Módulo para manejar las comunicaciones con el Proxy de Riot y MongoDB.
 */

// Define la URL base de tu backend / proxy de Riot.
// Si tu backend usa otro puerto o dominio, cámbialo aquí.
export const PROXY_URL = 'http://localhost:3000/api'; 

export const RiotAPI = {
    /**
     * Busca la información de un invocador por su Riot ID (GameName #TagLine)
     * @param {string} gameName 
     * @param {string} tagLine 
     * @param {string} region 
     * @returns {Promise<Object>}
     */
    async getSummonerByRiotId(gameName, tagLine, region) {
        console.log(`[API] Buscando a ${gameName}#${tagLine} en ${region}...`);
        
        try {
            // Ejemplo de ruta: http://localhost:3000/api/summoner/LAS/LasPerrasDeNaafiri/LAS
            const response = await fetch(`${PROXY_URL}/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
            
            if (!response.ok) {
                throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[API] Error buscando invocador:', error);
            throw error; // Propaga el error para que la UI pueda mostrar un mensaje
        }
    },

    /**
     * Obtiene el historial de partidas
     * @param {string} puuid 
     * @param {string} region 
     * @returns {Promise<Array>}
     */
    async getMatchHistory(puuid, region) {
        console.log(`[API] Obteniendo historial para ${puuid} en ${region}...`);
        
        try {
            // Ejemplo de ruta: http://localhost:3000/api/matches/LAS/un-puuid-largo
            const response = await fetch(`${PROXY_URL}/matches/${region}/${encodeURIComponent(puuid)}`);
            
            if (!response.ok) {
                throw new Error(`Error al obtener partidas: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[API] Error obteniendo historial:', error);
            return []; // Retorna array vacío en caso de error para no romper la UI
        }
    },

    /**
     * Actualiza los datos de un invocador (fuerza fetch al proxy real en vez de leer caché)
     * @param {string} puuid 
     * @param {string} region 
     * @returns {Promise<Object>}
     */
    async updateSummoner(puuid, region) {
        console.log(`[API] Actualizando datos de ${puuid}...`);
        try {
            // Ejemplo de ruta de actualización POST
            const response = await fetch(`${PROXY_URL}/summoner/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ puuid, region })
            });

            if (!response.ok) throw new Error('Falló la actualización');
            return await response.json();
        } catch (error) {
            console.error('[API] Error actualizando:', error);
            throw error;
        }
    }
};
