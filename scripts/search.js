const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, levelsSchema, leaderboardSchema } = obj
  app.get("/leaderboard", async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
    return res.render("../misc/search.ejs", {script: "https://gdlrrlist.com/extrascripts/searchlevel.js?v=3-7-22", loggedIn, editing, editable})
})

app.get("/nationalities", async  (req, res) => {
   let {loggedIn, editing, editable} = await getDetails(req)
    return res.render("../misc/search.ejs", {script: "https://gdlrrlist.com/extrascripts/searchnations.js?v=4-7-22", loggedIn, editing, editable})
})

app.get("/levels", async (req, res) => {
  let {loggedIn, editing, editable} = await getDetails(req)
    return res.render("../misc/search.ejs", {script: "https://gdlrrlist.com/extrascripts/searchleaderboard.js?v=3-5-22", loggedIn, editing, editable})
})

  app.get("/:type/:name", async (req, res) => {
  if(req.params.type == "level") {
    var level = await levelsSchema.findOne({name: req.params.name})
    if(!level) return res.render("404.ejs")
    res.json(level)
  } else if(req.params.type == "leaderboard") {
    var level = await leaderboardSchema.findOne({name: req.params.name})
    if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
    res.json(level)
  } else {
    return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid type!"})
  }
})
  return app
}