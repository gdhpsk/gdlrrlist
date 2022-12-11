var mongoose = require("mongoose")

let messages = new mongoose.Schema({
    message: String,
    dmID: String,
    from: {
      type: String,
      immutable: true
    },
    date: {
      type: String,
      immutable: true
    },
    read: [String]
})

let conversation = new mongoose.Schema({
  users: [String],
  name: String,
  messages: [messages]
})

module.exports = mongoose.model("messages", conversation)