const mongoose = require("mongoose")

var login = new mongoose.Schema({
    name: String,
    password: String,
    discord: String,
    google: String,
    youtube_channels: Array,
    record_notifs: Boolean,
    mail_notifs: Boolean,
    message: String 
})

module.exports = mongoose.model("login", login)