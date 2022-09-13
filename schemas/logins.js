const mongoose = require("mongoose")

var login = new mongoose.Schema({
    name: String,
    password: String,
    discord: String,
    message: String
})

module.exports = mongoose.model("login", login)