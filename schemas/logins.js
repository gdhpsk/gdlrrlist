const mongoose = require("mongoose")

var login = new mongoose.Schema({
    name: String,
    password: String,
    discord: String,
    google: String,
    youtube_channels: Array,
    mail_notifs: Boolean,
    dm_channel: String,
    message: String 
})

module.exports = mongoose.model("login", login)