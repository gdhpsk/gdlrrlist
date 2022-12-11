const express = require("express")
const app = express.Router()
const jwt = require("jsonwebtoken")
const loginSchema = require("../schemas/logins.js")
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { getDetails, getCookie, submitSchema } = obj
  app.route("/")
.get(async (req, res) => {
  let mail = await request("https://gdlrrlist.com/api/v1/client/dm", {
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

  let mail2 = await request("https://gdlrrlist.com/api/v1/client/unread", {
    method: "GET",
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body2 = await mail2.body.json()
  if(mail2.statusCode != 200) {
    return res.render("404.ejs", body2)
  }

  let everyone = await request(`https://gdlrrlist.com/api/v1/client/login`, {
    method: "GET",
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body3 = await everyone.body.json()
  
  body = {
    messages: body,
    unread: body2.map(e => e = e.dmID),
    everyone: body3
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  body.loggedIn = loggedIn
  body.editing = editing
  body.editable = editable
  body.active = "notifications"
  return res.render("notifications.ejs", body)
})

app.route("/:id")
.get(async (req, res) => {
  let mail = await request(`https://gdlrrlist.com/api/v1/client/messages?id=${req.params.id}`, {
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
  let everyone = await request(`https://gdlrrlist.com/api/v1/client/login`, {
    method: "GET",
    headers: {
      'content-type': "application/json",
      'authorization': `User ${getCookie("token", req)}`
    }
  })
  let body2 = await everyone.body.json()
  body = {
    messages: body,
    everyone: body2
  }
  let {id} = jwt.verify(getCookie("token", req), process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
  let {loggedIn, editing, editable} = await getDetails(req)
  body.loggedIn = loggedIn
  body.editing = editing
  body.editable = editable
  body.active = "notifications"
  body.profile = name
  return res.render("notification.ejs", body)
})
  return app
}