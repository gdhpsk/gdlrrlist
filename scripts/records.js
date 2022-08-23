const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, levelsSchema, leaderboardSchema, webhook, submitSchema } = obj

  app.route("/deletesub")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../deleting/deletesub.ejs", {editing, loggedIn, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  let message;
  let level = await levelsSchema.findOne({name: req.body.demon.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  if(req.body.progress < 100) {
    let record = level.progresses.findIndex(e => e.name == req.body.username.trim() && e.percent == req.body.progress)
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(record == -1) return res.render("404.ejs", {message: "This record does not exist!"})
    message = `A progess of the level ${level.name} by [${player.name}](${level.progresses[record].link}) has been deleted. (Progress: ${level.progresses[record].percent}%)`
    level.progresses = level.progresses.filter(e => e.name != req.body.username.trim() || e.percent != req.body.progress)
    if(level.progresses.length == 0) {
      level.progresses = ["none"]
    }
    if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
    player.progs = player.progs.filter(e => e.name != level.name || e.percent != req.body.progress)
    if(player.progs.length == 0) {
      player.progs = ["none"]
    }
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  } else if(req.body.progress == 100) {
    let record = level.list.findIndex(e => e.name == req.body.username.trim())
    if(record == -1) return res.render("404.ejs", {message: "This record doesn't exist!"})
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
    message = `A completion of the level ${level.name} by [${player.name}](${level.list[record].link}) has been deleted. `
    level.list = level.list.filter(e => e.name != req.body.username.trim())
    if(level.list.length == 0) {
      level.list = ["none"]
    }
    player.levels = player.levels.filter(e => e != level.name)
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  }
  webhook(message, null, {
    event: "RECORD_DELETE",
    data: {
      name: req.body.username.trim(),
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: req.body.video.trim(),
      hertz: req.body.hertz.trim()
    }
  })
  return res.render("added.ejs", {text: "submission", type: "deleted", editing, loggedIn, editable})
})

app.route("/add")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  if(req.query.record) {
    try {
      let info = await submitSchema.findById(req.query.record)
      if(info) {
        return res.render("../adding/addsub.ejs", {loggedIn, editing, editable, info})
      }
    } catch(_) {
      
    }
  }
  return res.render("../adding/addsub.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var level = await levelsSchema.findOne({name: req.body.demon})
  var user = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  if(!user) {
   user = await leaderboardSchema.create({name: req.body.username.trim(), levels: [], progs: ["none"]})
  }


    var obj = {
      name: req.body.username.trim(),
      link: req.body.video.trim(),
      hertz: req.body.hertz.trim()
    }
  if(obj.hertz.toLowerCase() == "mobile") return res.render("404.ejs", {error: "400 Bad Request", message: "Did you mean to input 'M'? lol!"}) 
  if(req.body.progress < 100) {
    var everything = await levelsSchema.find().sort({position: 1})
    if(everything.findIndex(e => e.name == level.name) > 74) return res.render("404.ejs", {error: "400 Bad Request", message: "This level does not have a listpercent!"})
    obj.percent = req.body.progress
    level.progresses = level.progresses.filter(e => e.name != obj.name)
    if(level.progresses[0] != "none") {
      await level.progresses.push(obj)
    } else {
      level.progresses[0] = obj
    }
    await level.save()
    user.progs = user.progs.filter(e => e.name != level.name)
    if(user.progs[0]) {
      if(user.progs[0] != "none") {
        user.progs.push({name: level.name, percent: obj.percent})
      } else {
        user.progs[0] = {name: level.name, percent: obj.percent}
      }
    } else {
        user.progs.push({name: level.name, percent: obj.percent})
    }
    await user.save()
  } else if(req.body.progress == 100) {
    if(level.list[0] != "none") {
       level.list.push(obj)
    } else {
      level.list[0] = obj
    }
    level.progresses = level.progresses.filter(e => e?.name != obj.name)
    if(!level.progresses[0]) {
      level.progresses[0] == "none"
    }
    await level.save()
    if(user.levels[0]) {
      if(user.levels[0] != "none") {
        user.levels.push(level.name)
      } else {
        user.levels[0] = level.name
      }
    } else {
        user.levels.push(level.name)
    }
    user.progs = user.progs.filter(e => e.name != level.name)
    if(!user.progs[0]) {
      user.progs[0] == "none"
    }
    await user.save()
  } else {
    return res.render("404.ejs", {error: "400 Bad Request", message: "Percentage out of range."})
  }
  webhook(`A completion / progress has been added on the level ${level.name}. (submission: [${req.body.progress}% by ${obj.name} on ${obj.hertz}](${obj.link}))`, null, {
    event: "RECORD_ADD",
    data: {
      name: obj.name,
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: obj.link,
      hertz: obj.hertz
    }
  })
  if(req.query.record) {
    try {
      let something = await submitSchema.findById(req.query.record)
  if(something) {
  webhook("A submission has been archived!", [{description: `A submission by ${something.username} has been archived. (submission: [${something.demon} ${something.progress}% on ${something.hertz}](${something.video}), comments: ${something.comments || "none"})`}], {
    event: "SUBMISSION_ARCHIVE",
    data: something
  })
  something.status = "accepted"
    await something.save()

      await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': `User ${getCookie("token", req)}`
        },
        body: JSON.stringify({
          subject: `Information about your ${something.demon} ${something.progress}% submission`,
          message: `Your submission has been accepted by the LRR List Moderators! Submission: ${something.demon} ${something.progress}%`,
          to: something.account
        })
      })
  }
    } catch(_) {
      
    }
  }
  let addedRecord = true
  return res.render("added.ejs", {text: "submission", type: "added", loggedIn, editing, editable, addedRecord})
})
  
  return app
}