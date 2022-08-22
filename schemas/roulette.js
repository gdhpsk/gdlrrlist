var mongoose = require("mongoose")

let rouletteLevelSchema = new mongoose.Schema({
    _id: Number,
    minimumPercent: Number,
    name: String,
    percent: Number,
    skipped: Boolean,
    ytcode: String,
    publisher: String
})

var rouletteSchema = new mongoose.Schema({
    levels: [rouletteLevelSchema],
    user: String,
    config: Object,
    redirect: String
})

module.exports = mongoose.model("roulette", rouletteSchema)