const mongoose = require("mongoose")

var leaderboard = new mongoose.Schema({
    nationality: String,
    name: String,
    levels: [],
    sixtyOneHertz: [],
    progs: [],
  socials: Object,
  ban: Boolean,
  ban_time: String,
  ban_reason: String
})

module.exports = mongoose.model("leaderboard", leaderboard)