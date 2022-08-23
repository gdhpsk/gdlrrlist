const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let {allowedPeople, hasAccess, getDetails, getCookie} = obj
  
 app.route("/")
.get(async (req, res) => {
 let approved = await hasAccess(true, req, res)
  if(!approved) return res.render("404.ejs")
   let everything = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../misc/accessible.ejs", {editable, editing, loggedIn, everything, active: "settings"})
})
.post(async (req, res) => {
   let response = await request("https://gdlrrlist.com/api/mods/settings", {
    method: "POST",
    headers: {
      "authorization": `Moderator ${getCookie("token", req)}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(req.body)
  })
  let body = await response.body.json()
  if(response.statusCode != 201) {
    return res.status(response.statusCode).render("404.ejs", body)
  }
  res.redirect("/settings")
})
  
  return app
}