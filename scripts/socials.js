const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, leaderboardSchema, getDetails, getCookie, fetchUser, webhook } = obj

  app.route("/add")
.get(async(req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../socials/add.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let data = {}
   let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  if(req.body.discordid != "") {
    let user = await fetchUser(req.body.discordid);
    if(user) {
      req.body.discord = `${user.username}#${user.discriminator}` 
        }
  }
  let profile = ""
  for(const key in req.body) {
    profile += `${key}: ${req.body[key]}\n`
  }
  const message = `The socials of ${player.name} has been changed to this:\n\n ${profile}`
  player.socials = req.body
  await player.save()
  webhook(message, null, {
    event: "PROFILE_SOCIALS_EDIT",
    data: {
      new: req.body
    }
  })
  return res.render("added.ejs", {text: "socials", type: "added", loggedIn, editing, editable})
})

app.route("/delete")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../socials/delete.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
   let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  const message = `The socials of ${player.name} has been deleted. (socials: ${JSON.stringify(player.socials)})`
  console.log(player.socials)
  player.socials = undefined
  await player.save()
  webhook(message, null, {
    event: "PROFILE_SOCIALS_DELETE",
    data: {
      name: player.name,
      socials: player.socials
    }
  })
  return res.render("added.ejs", {text: "socials", type: "deleted", loggedIn, editing, editable})
})
  
  return app
}