const express = require("express")
const app = express.Router()
let cron = require("node-cron")
let {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, getCookie, dateToCron, leaderboardSchema, webhook } = obj
  app.route("/ban")
.get(async (req, res) => {
   let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../bans/addban.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let {loggedIn, editing, editable} = await getDetails(req)
  let response = await request("https://gdlrrlist.com/api/mods/bans", {
      method: "POST",
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        'authorization': `Moderator ${getCookie("token", req)}`
      }
    })
    let body = await response.body.json()
    if(response.statusCode != 201) return res.render("404.ejs", body)
    return res.render("added.ejs", {text: "user", type: "banned", loggedIn, editing, editable})
})

app.route("/ban/:id")
.get(async (req, res) => {
  let response = await request("https://gdlrrlist.com/api/mods/bans", {
      method: "GET",
      headers: {
        'content-type': 'application/json',
        'authorization': `Moderator ${getCookie("token", req)}`
      }
    })
    let everything = await response.body.json()
    if(response.statusCode != 200) return res.render("404.ejs", everything)
  if(isNaN(req.params.id)) return res.render("404.ejs", {error: "400 Bad Request", message: "Please include a valid ban number!"})
  if(!everything[parseInt(req.params.id)-1]) return res.render("404.ejs", {error: "400 Bad Request", message: "Ban number out of range!"})
  return res.render("../bans/viewban.ejs", everything[parseInt(req.params.id)-1])
})

app.get("/bans", async (req, res) => {
   let {loggedIn, editing, editable} = await getDetails(req)
  let response = await request("https://gdlrrlist.com/api/mods/bans", {
      method: "GET",
      headers: {
        'content-type': 'application/json',
        'authorization': `Moderator ${getCookie("token", req)}`
      }
    })
    let everything = await response.body.json()
    if(response.statusCode != 200) return res.render("404.ejs", everything)
  let obj = []
  for(let i = 0; i < everything.length; i++) {
    obj.push(everything[i].name)
  }
   return res.render("../bans/viewbans.ejs", {amount: everything.length, text: obj, loggedIn, editing, editable, active: "bans" })
})

app.get("/bans/delete/:id", async (req, res) => {
  req.body.id = req.params.id
  let response = await request("https://gdlrrlist.com/api/mods/bans", {
      method: "DELETE",
     body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json',
        'authorization': `Moderator ${getCookie("token", req)}`
      }
    })
    try {
    let body = await response.body.json()
   return res.render("404.ejs", body)
    } catch(_) {
    return res.redirect("/bans")
    }
})
  return app
}