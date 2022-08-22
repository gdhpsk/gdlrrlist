const express = require("express")
const app = express.Router()
const jwt = require("jsonwebtoken")
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { getDetails, getCookie, mailSchema, submitSchema } = obj
  app.route("/")
.get(async (req, res) => {
  let mail = await request("https://gdlrrlist.com/api/v1/client/notifications", {
    method: "GET",
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body = await mail.body.json()
  if(mail.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  let {username} = jwt.verify(getCookie("token", req), process.env.WEB_TOKEN)
 let everything = await mailSchema.find({to: username, read: {$exists: false}})
  for(const item of everything) {
    item.read = true
    await item.save()
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  body.loggedIn = loggedIn
  body.editing = editing
  body.editable = editable
  body.active = "notifications"
  return res.render("notifications.ejs", body)
})
.post(async (req, res) => {
  let mail = await request("https://gdlrrlist.com/api/v1/client/notifications", {
    method: "POST",
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    },
    body: JSON.stringify(req.body)
  })
  let body = await mail.body.json()
  if(mail.statusCode != 201) {
    return res.render("404.ejs", body)
  }
  
  return res.redirect("/notifications")
})

app.get("/compose", async (req, res) => {
  let {loggedIn, editing, editable} = await getDetails(req)
  if(!loggedIn) return res.render("404.ejs", {error: "401 UNAUTHORIZED", message: "Please login if you want to access this page!"})
  let getEvery = await request("https://gdlrrlist.com/api/v1/client/login", {
    method: "GET",
    headers: {
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let everyone = await getEvery.body.json()
  if(req.query.record) {
    try {
      let record = await submitSchema.findById(req.query.record)
      if(record) {
        return res.render("compose.ejs", {record, loggedIn, editing, editable, everyone})
      }
    } catch(_) {
      
    }
  }
  let to;
  if(req.query.to) {
    to = {
      username: req.query.to
    }
  }
  return res.render("compose.ejs", {loggedIn, editing, editable, everyone, record: to})
})

app.route("/hide")
.get(async (req, res) => {
  let mail = await request(`https://gdlrrlist.com/api/v1/client/notifications`, {
    method: 'PATCH',
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    },
    body: JSON.stringify({
      id: req.query.id,
      hide: true
    })
  })
  let body = await mail.body.json()
  if(mail.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  return res.redirect("/notifications")
})
.post(async (req, res) => {
  let mail = await request(`https://gdlrrlist.com/api/v1/client/notifications`, {
    method: 'DELETE',
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    },
    body: JSON.stringify({
      id: req.body.id
    })
  })
  let body = await mail.body.json()
  if(mail.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  return res.redirect("/notifications")
})

app.get("/from/:id", async (req, res) => {
  let mail = await request(`https://gdlrrlist.com/api/v1/client/notifications?fromUser=true&toUser=false&number=${req.params.id}`, {
    method: 'GET',
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body = await mail.body.json()
  if(mail.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  let obj = {}
  for(const key in body.mail) {
    obj[key] = body.mail[key]
  }
  obj.number = req.params.id
  obj.loggedIn = loggedIn
   obj.editing = editing
   obj.editable = editable
  obj.active = "notifications-from"
  return res.render("notification.ejs", obj)
})

app.get("/to/:id", async (req, res) => {
  let mail = await request(`https://gdlrrlist.com/api/v1/client/notifications?fromUser=false&toUser=true`, {
    method: 'GET',
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body = await mail.body.json()
  if(mail.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  body.mail = body.mail.filter(e => !e.hide)[req.params.id-1]
if(body?.mail?.hide || !body?.mail) {
    return res.render("404.ejs", {error: "400 BAD REQUEST", message: "Please input a valid mail number!"})
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  let obj = {}
  for(const key in body.mail) {
    obj[key] = body.mail[key]
  }
   obj.loggedIn = loggedIn
   obj.editing = editing
   obj.editable = editable
  obj.number = req.params.id
  return res.render("notification.ejs", obj)
})
  return app
}