var mongoose = require("mongoose")

let rouletteLevelSchema = new mongoose.Schema({
    position: Number,
    minimumPercent: Number,
    name: String,
    percent: Number,
    skipped: Boolean,
    ytcode: String,
    publisher: String
})

let configSchema = new mongoose.Schema({
    levels: [],
    options: Object
})

var rouletteSchema = new mongoose.Schema({
    levels: [rouletteLevelSchema],
    user: String,
    site_user: String,
    config: configSchema,
    redirect: String,
  username: String
})

module.exports = mongoose.model("roulette", rouletteSchema)