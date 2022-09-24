const mongoose = require("mongoose")

let schema = new mongoose.Schema({
  message_data: Object,
  event: String,
  date: Number,
  data: Object
})

module.exports = mongoose.model("mod_log", schema)