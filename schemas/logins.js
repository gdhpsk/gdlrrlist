const mongoose = require("mongoose")

var login = new mongoose.Schema({
    name: String,
    password: String,
    discord: String,
    google: String,
    youtube_channels: Array,
    mail_notifs: Boolean,
    full_page_lead: Boolean,
    pc_info: Boolean,
    dm_channel: String,
    message: String,
    subscription: Object
})

module.exports = mongoose.model("login", login)