const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, sixtyoneSchema, webhook, leaderboardSchema, getCookie } = obj
  app.route("/edit61hzrecord/:name/:id")
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let level = await sixtyoneSchema.findOne({name: req.params.name})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  let index = level.list.findIndex(e => e._id == req.params.id) 
  if(index == -1) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid Object ID!"})
  for(const key in req.body) {
  level.list[index][key] = req.body[key]
  }
  await level.save()
  res.redirect(req.headers.referer)
})

  app.post("/edit61hzlevel/:name", async(req, res) => {
  let data = {}
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let level = await sixtyoneSchema.findOne({name: req.params.name})
  data.old = level
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
   let message = `The following info on the 61hz+ level ${level.name} has been changed:\n`
   for(const key in req.body) {
     level[key] = req.body[key]
     message += `${key}: ${req.body[key]}\n`
   }
  await level.save()
  data.new = level
  if(req.body.placement != level.position) {
  var everything = await sixtyoneSchema.find().sort({position: 1})
  var index = everything.findIndex(e => e._id == level._id.toString())
    if(req.body.placement == 0 || req.body.placement > everything.length) return res.render("404.ejs", {error: "400 Bad Request", message: `Please input a valid placement between 1 and ${everything.length+1}!`})
    everything[index].position = req.body.placement
   await everything[index].save()
    message += `placement: #${index+1} to #${req.body.placement}`
    let start = index+1 > req.body.placement ? req.body.placement-1 : index
    let end = index+1 < req.body.placement ? index+1 : req.body.placement
  for(let i = start; i < end; i++) {
   await sixtyoneSchema.findOneAndUpdate({name: everything[i].name}, {
     $set: {
       position: i+1
     }
   })
  }
}
  webhook(message, null, {
    event: "61_HERTZ_LEVEL_CHANGE",
    data
  })
  res.redirect(req.headers.referer)
})

app.route("/add61hertzlevel")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../adding/add61hz+level.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
 let {loggedIn, editing, editable} = await getDetails(req)
  var obj = {
    name: req.body.username.trim(),
    link: req.body.link.trim(),
    hertz: req.body.hertz.trim()
  }
  let everything = await sixtyoneSchema.find().sort({position: 1})
  let above = everything.findIndex(e => e.name == req.body.above)
  var newlev = new sixtyoneSchema({name: req.body.name.trim(), ytcode: req.body.ytcode.trim(), ranking: req.body.ranking.trim(), minimumPercent: 57, publisher: req.body.publisher.trim(), list: [obj], progresses: ["none"], position: above})
  if(above == -1) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level 61hz for it to be above!"})
  let player = await leaderboardSchema.findOne({name: obj.name})
  if (!player) {
        await leaderboardSchema.create({ name: obj.name, levels: [], sixtyOneHertz: [newlev.name], progs: ["none"] })
      } else {
        player.sixtyOneHertz.push(newlev.name)
        await player.save()
      }
  await sixtyoneSchema.insertMany([newlev])
  everything = await sixtyoneSchema.find().sort({position: 1})
  for(let i = 0; i < everything.length; i++) {
    await sixtyoneSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A 61hz+ level by the name of ${newlev.name} has been added, and has a difficulty of ${newlev.ranking}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, {
    event: "61_HERTZ_LEVEL_ADD",
    data: {
      name: newlev.name,
      ranking: newlev.ranking,
      completion: obj
    }
  })
  return res.render("added.ejs", {text: "61hertz+ level", type: "added", loggedIn, editing, editable})
})

app.route("/delete61hertz/:name")
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  req.body.name = req.params.name
  var level = await sixtyoneSchema.findOne({name: req.body.name.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  for(const record of level.list) {
  await request("https://gdlrrlist.com/api/helper/records", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "authorization": `Helper ${getCookie("token", req)}`
    },
    body: JSON.stringify({
      username: record.name,
      demon: level.name,
      progress: 100
    })
  })
  }
  await sixtyoneSchema.findOneAndDelete({name: req.body.name.trim()})
  let everything = await sixtyoneSchema.find().sort({position: 1})
  for(let i = level.position-1; i < everything.length; i++) {
    await sixtyoneSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A 61hz+ level by the name of ${req.body.name.trim()} has been deleted.`, null, {
    event: "61_HERTZ_LEVEL_DELETE",
    data: {
      name: req.body.name.trim()
    }
  })
  res.redirect(req.headers.referer)
}) 

app.route("/move61hzlevel/:name")
.post(async (req, res) => {
  let approved = await hasAccess(true, req, res);   
  if(!approved) return res.render("404.ejs")
  
  let level = await sixtyoneSchema.findOne({name: req.params.name})
  if(!level) return res.render("404.ejs", {error: "400 BAD REQUEST", message: "This level does not exist!"})
  let ok = await request("https://gdlrrlist.com/addlevel", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
       name: req.body.name,
      ytcode: level.ytcode,
      minimumPercent: req.body.minimumPercent,
      publisher: level.publisher,
      placement: req.body.placement,
      username: level.list[0].name,
      link: level.list[0].link,
      hertz: level.list[0].hertz
    })
  })
  let text = await ok.text()
  let lol = await request(`https://gdlrrlist.com/delete61hertz/${level.name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  })
  let text2 = await lol.text()
  console.log({text, text2})
  res.redirect(req.headers.referer)
})
  return app
}