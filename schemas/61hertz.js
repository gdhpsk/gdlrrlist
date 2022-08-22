const mongoose = require("mongoose")

var completions = new mongoose.Schema({
    name: String,
    link: String,
    hertz: String
})

var levelsSchema = new mongoose.Schema({
    position: Number,
    "name": String,
    "ytcode": String,
    "ranking": String,
    "minimumPercent": Number,
    "publisher": String,
    list: [completions],
    progresses: Array
})

module.exports = mongoose.model("61hertz", levelsSchema)