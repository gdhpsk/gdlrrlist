const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, leaderboardSchema, levelsSchema, webhook, getCookie } = obj

  app.post("/editlevel/:name", async(req, res) => {
    req.body.name = req.params.name
    let response = await request("https://gdlrrlist.com/api/helper/levels", {
      method: "PATCH",
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        'authorization': `Helper ${getCookie("token", req)}`
      }
    })
    let body = await response.body.json()
    if(response.statusCode != 200) return res.render("404.ejs", body)
    res.redirect(req.headers.referer)
  })

  app.post("/editrecordcomp/:level/:id", async (req, res) => {
  let data = {}
  let approved = await hasAccess(false, req, res, true)
  if(!approved) return res.render("404.ejs")
  let level = await levelsSchema.findOne({name: req.params.level})
  req.params.id = parseInt(req.params.id)
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Plese input a valid level name!"})
  let record = level.list[req.params.id]
  if(!record) return res.render("404.ejs", {error: "400 Bad Request", message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}\n`
    }
  }
  data.new = record
  level.list.splice(req.params.id, 1)
  level.list.splice(req.params.id, 0, record)
  if(req.params.id != req.body.pos-1) {
    if(req.params.id > req.body.pos-1) {
    level.list.splice(req.body.pos-1, 0, record)
    level.list.splice(req.params.id+1, 1)
  } else {
    level.list.splice(req.body.pos, 0, record)
   level.list.splice(req.params.id, 1) 
  }
    message += `pos: ${req.body.pos}`
  }
  await level.save()
  webhook(message, null, {
    event: "RECORD_EDIT",
    data
  })
  res.redirect(req.headers.referer)
})

app.post("/editrecordprog/:level/:id", async (req, res) => {
  let data = {}
   let approved = await hasAccess(false, req, res, true)
  if(!approved) return res.render("404.ejs")
  let level = await levelsSchema.findOne({name: req.params.level})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Plese input a valid level name!"})
  let record = level.progresses[req.params.id]
  if(!record) return res.render("404.ejs", {error: "400 Bad Request", message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}`
    }
  }
  data.new = record
  level.progresses.splice(req.params.id, 1)
  level.progresses.splice(req.params.id, 0, record)
  webhook(message, null, {
    event: "RECORD_DELETE",
    data
  })
  await level.save()
  res.redirect(req.headers.referer)
})
  
  app.route("/addlevel")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../adding/addlevel.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let response = await request("https://gdlrrlist.com/api/mods/levels", {
    method: "POST",
    body: JSON.stringify(req.body),
    headers: {
      'content-type': 'application/json',
      'authorization': `Moderator ${getCookie("token", req)}`
    }
  })
  let body = await response.body.json()
  if(response.statusCode != 200) {return res.render("404.ejs", body)}
  return res.render("added.ejs", {text: "level", type: "added", loggedIn, editing, editable})
})

app.route("/deletelevel/:name") 
.post(async (req, res) => {
  req.body.name = req.params.name
  let response = await request("https://gdlrrlist.com/api/mods/levels", {
    method: "DELETE",
    body: JSON.stringify(req.body),
    headers: {
      'content-type': 'application/json',
      'authorization': `Moderator ${getCookie("token", req)}`
    }
  })
  let body = await response.body.json()
  if(response.statusCode != 200) {return res.render("404.ejs", body)}
  res.redirect(req.headers.referer)
})
  return app
}