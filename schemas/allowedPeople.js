const mongoose = require("mongoose")

var allowed = new mongoose.Schema({
  allowed: [{name: String, id: String, tag: String, level: String, spectator: Boolean}],
})

module.exports = mongoose.model("allowedpeoples", allowed)