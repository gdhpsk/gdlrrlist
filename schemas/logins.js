const mongoose = require("mongoose")

var login = new mongoose.Schema({
    name: String,
    password: String
})

module.exports = mongoose.model("login", login)