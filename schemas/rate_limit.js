const mongoose = require("mongoose")

var login = new mongoose.Schema({
    path: String,
    token: String,
    expire: Number
})

module.exports = mongoose.model("rateLimit", login)