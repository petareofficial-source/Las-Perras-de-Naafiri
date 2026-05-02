const mongoose = require('mongoose');

const SummonerSchema = new mongoose.Schema({
    puuid: { type: String, required: true, unique: true },
    gameName: { type: String, required: true },
    tagLine: { type: String, required: true },
    region: { type: String, required: true },
    summonerLevel: Number,
    profileIconId: Number,
    lastUpdated: { type: Date, default: Date.now }
});

// Índice para búsquedas rápidas por nombre y tag (insensible a mayúsculas)
SummonerSchema.index({ gameName: 1, tagLine: 1, region: 1 });

module.exports = mongoose.model('Summoner', SummonerSchema);
