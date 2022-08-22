const mongoose = require("mongoose")

var rolesSchema = new mongoose.Schema({
   "Level Packs": Object
})

module.exports = mongoose.model("misc", rolesSchema)