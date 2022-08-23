const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, leaderboardSchema, levelsSchema, webhook } = obj
  app.route("/addlevel")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../adding/addlevel.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  var obj = {
    name: req.body.username.trim(),
    link: req.body.link.trim(),
    hertz: req.body.hertz.trim()
  }
  req.body.list = [obj]
  req.body.progresses = ["none"]
  if(!req.body.minimumPercent) {
    delete req.body.minimumPercent
  }
  if(req.body.placement < 76 && !req.body.minimumPercent) return res.render("404.ejs", {error: "400 Bad Request", message: "This placement requires a minimum percent to be included!"})
  req.body.name = req.body.name.trim()
  req.body.ytcode = req.body.ytcode.trim()
  req.body.publisher = req.body.publisher.trim()
  req.body.position = req.body.placement-1
  var newlev = new levelsSchema(req.body)
  var player = await leaderboardSchema.findOne({name: obj.name})
    if(!player) {
      await leaderboardSchema.create({name: obj.name, levels: [newlev.name], progs: ["none"]})
    } else {
      player.levels.push(newlev.name)
    await  player.save()
    }
 await levelsSchema.insertMany([newlev])
  let everything = await levelsSchema.find().sort({position: 1})
  for(let i = 0; i < everything.length; i++) {
    await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A new level by the name of ${newlev.name} has been added at #${req.body.placement}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, null, {
    event: "LEVEL_ADD",
    data: {
      name: newlev.name,
      placement: req.body.placement,
      completion: {
        name: obj.name,
        link: obj.link,
        hertz: obj.hertz
      }
    }
  })
  return res.render("added.ejs", {text: "level", type: "added", loggedIn, editing, editable})
})

app.route("/deletelevel/:name") 
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  req.body.name = req.params.name
  var level = await levelsSchema.findOne({name: req.body.name.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  for(let i = 0; i < level.list.length; i++) {
    var player = await leaderboardSchema.findOne({name: level.list[i].name})
    if(player) {
      player.levels = player.levels.filter(e => e != level.name)
      await player.save()
      if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
    } else {
      console.log(level.list[i].name)
    }
  }
  if(level.progresses) {
    if(level.progresses[0] != "none") {
      for(let i = 0; i < level.progresses.length; i++) {
    var player = await leaderboardSchema.findOne({name: level.progresses[i].name})
    if(player) {
      player.progs = player.progs.filter(e => e.name != level.name)
      if(player.progs.length == 0) {
        player.progs[0] = "none"
      }
      await player.save()
      if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
    } else {
      console.log(level.progresses[i].name)
    }
  }
    }
  }
  if(req.body.reason != "") {
    var everything = await levelsSchema.find().sort({position: 1})
    let obj4 = {
      position: everything.length+1,
      name: level.name,
      ytcode: level.ytcode,
      removalDate: dayjs(Date.now()).format("MMMM D, YYYY"),
      formerRank: level.position,
      publisher: level.publisher,
      list: [
      {
          "name": "Removed",
          "link": ` ${req.body.reason.trim()}`,
          "hertz": "60"
      }
    ]
  }
     await levelsSchema.create(obj4)
    await levelsSchema.findByIdAndDelete(level._id.toString())
  } else {
    await levelsSchema.findOneAndDelete({name: req.body.name.trim()})
  }
  var everything = await levelsSchema.find().sort({position: 1})
  for(let i = level.position-1; i < everything.length; i++) {
    await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A level by the name of ${req.body.name.trim()} has been deleted. (reason: ${req.body.reason ? req.body.reason.trim() : "not provided"})`, {
    event: "LEVEL_DELETE",
    data: {
      name: req.body.name.trim(),
      reason: req.body.reason ? req.body.reason.trim() : "not provided"
    }
  })
  res.redirect(req.headers.referer)
})
  return app
}