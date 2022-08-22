const mongoose = require("mongoose")

var levelsSchema = new mongoose.Schema({
  position: Number,
    "name": String,
    "ytcode": String,
    "formerRank": Number,
    "removalDate": String,
    "minimumPercent": Number,
    "publisher": String,
    list: [{name: String, link: String, hertz: String}],
    progresses: []
})

module.exports = mongoose.model("levels", levelsSchema)