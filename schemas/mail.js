var mongoose = require("mongoose")

let mailSchema = new mongoose.Schema({
    subject: String,
    message: String,
    from: {
      type: String,
      immutable: true
    },
    date: {
      type: String,
      immutable: true
    },
    to: {
      type: String,
      immutable: true
    },
    read: Boolean,
    hide: Boolean
})

module.exports = mongoose.model("mail", mailSchema)