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
  req.body.level = req.params.level
    req.body.id = req.params.id
    let response = await request("https://gdlrrlist.com/api/helper/edit/records/comp", {
      method: "PATCH",
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        'authorization': `Helper ${getCookie("token", req)}`
      }
    })
    let body = await response.body.json()
    if(response.statusCode != 203) return res.render("404.ejs", body)
    res.redirect(req.headers.referer)
})

app.post("/editrecordprog/:level/:id", async (req, res) => {
   req.body.level = req.params.level
    req.body.id = req.params.id
    let response = await request("https://gdlrrlist.com/api/helper/edit/records/prog", {
      method: "PATCH",
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        'authorization': `Helper ${getCookie("token", req)}`
      }
    })
    let body = await response.body.json()
    if(response.statusCode != 203) return res.render("404.ejs", body)
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
  let {loggedIn, editing, editable} = await getDetails(req)
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