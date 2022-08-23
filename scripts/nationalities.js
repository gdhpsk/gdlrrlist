const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, webhook, leaderboardSchema } = obj

app.route("/add")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../nationalities/add.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
   let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  const message = `The nationality of ${player.name} has been changed from ${!player.nationality ? "nothing" : player.nationality.trim()} to ${req.body.nationality.trim()}`
  webhook(message, null, {
    event: "PROFILE_NATIONALITY_ADD",
    data: {
      name: player.name,
      nationality: {
        previously: !player.nationality ? "nothing" : player.nationality.trim(),
        now: req.body.nationality.trim()
      }
    }
  })
  player.nationality = req.body.nationality.trim()
  await player.save()
  return res.render("added.ejs", {text: "nationality", type: "added", loggedIn, editing, editable})
})

app.route("/delete")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../nationalities/delete.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
   let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  const message = `The nationality of ${player.name} has been deleted. (nationality: ${player.nationality.trim()})`
  console.log(player.nationality.trim())
  player.nationality = undefined
  await player.save()
  webhook(message, null, {
    event: "PROFILE_NATIONALITY_DELETE",
    data: {
      name: player.name,
      nationality: "nothing"
    }
  })
  return res.render("added.ejs", {text: "nationality", type: "deleted", loggedIn, editing, editable})
})
  
  return app
}