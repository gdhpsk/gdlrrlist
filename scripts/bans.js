const express = require("express")
const app = express.Router()
let cron = require("node-cron")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, dateToCron, leaderboardSchema, webhook } = obj
  app.route("/ban")
.get(async (req, res) => {
   let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../bans/addban.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {

  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  let ban_times = {
    "1": 7776000000,
    "2": 15552000000,
    "3": 31536000000,
    "4": "permanent"
  }
  let user = await leaderboardSchema.findOne({name: req.body.username})
  if(!user) return res.render("404.ejs", {error: "400 Bad Request", message: "Invalid user provided!"})
  req.body.ban_time = ban_times[req.body.ban_time]
  user.ban = true
  user.ban_reason = req.body.reason ?? "A reason was not provided"
  if(req.body.ban_time != "permanent") {
  user.ban_time = new Date(Date.now()+req.body.ban_time).toISOString()
  let actual_time = dateToCron(new Date(user.ban_time))
  let task = cron.schedule(actual_time, async () => {
    try {
		user.ban = undefined
    user.ban_time = undefined
    user.ban_reason = undefined
    await user.save()
    task.stop()
    } catch(_) {
      
    }
	});
  } else {
    user.ban_time = "permanent"
  }
  await user.save()
  webhook(`A leaderboard profile by the name of ${req.body.username} has been banned ${!isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently"}`, null, {
    event: "PROFILE_BAN_ADD",
    data: {
      name: req.body.username,
      reason: req.body.reason ?? "A reason was not provided",
      time: !isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently",
    }
  })
    return res.render("added.ejs", {text: "user", type: "banned", loggedIn, editing, editable})
})

app.route("/ban/:id")
.get(async (req, res) => {
   let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let everything = await leaderboardSchema.find({ban: true})
  if(isNaN(req.params.id)) return res.render("404.ejs", {error: "400 Bad Request", message: "Please include a valid ban number!"})
  if(!everything[parseInt(req.params.id)-1]) return res.render("404.ejs", {error: "400 Bad Request", message: "Ban number out of range!"})
  return res.render("../bans/viewban.ejs", everything[parseInt(req.params.id)-1])
})

app.get("/bans", async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
   let {loggedIn, editing, editable} = await getDetails(req)
  let everything = await leaderboardSchema.find({ban: true})
  let obj = []
  for(let i = 0; i < everything.length; i++) {
    obj.push(everything[i].name)
  }
   return res.render("../bans/viewbans.ejs", {amount: everything.length, text: obj, loggedIn, editing, editable, active: "bans" })
})

app.get("/bans/delete/:id", async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  try {
    let person = await leaderboardSchema.findById(req.params.id)
    if(!person) return res.render("404.ejs", {error: "400 Bad Request", message: "Invalid Object ID provided!"})
    person.ban = undefined
    person.ban_time = undefined
    person.ban_reason = undefined
    await person.save()
    webhook(`A leaderboard profile by the name of ${person.name} has been unbanned`, null, {
      event: "PROFILE_BAN_REMOVE",
      data: {
        name: person.name
      }
    })
  } catch(_) {
    return res.render("404.ejs", {error: "400 Bad Request", message: "Invalid Object ID provided!"})
  }
   return res.redirect("/bans")
})
  return app
}