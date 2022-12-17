const mongoose = require("mongoose")

let schema = new mongoose.Schema({
  removed: Boolean,
  raw: String,
  username: String,
  demon: String,
  hertz: String,
  progress: Number,
  status: String,
  video: String,
  comments: String,
  date: {
      type: String,
      immutable: true
    },
  account: {
      type: String,
      immutable: true
    },
  edited: String,
  deletable: Boolean,
  editable: Boolean
})

module.exports = mongoose.model("submissions", schema)