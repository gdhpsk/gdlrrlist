const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))
const {request} = require("undici")

module.exports = (obj) => {
  let { hasAccess, getDetails, webhook, leaderboardSchema, getCookie } = obj

  app.route("/add")
    .get(async (req, res) => {
      let approved = await hasAccess(true, req, res); if (!approved) return res.render("404.ejs")
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("../nationalities/add.ejs", { loggedIn, editing, editable })
    })
    .post(async (req, res) => {
      let response = await request("https://gdlrrlist.com/api/mods/nationalities", {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: {
          'content-type': 'application/json',
          'authorization': `Moderator ${getCookie("token", req)}`
        }
      })
      let body = await response.body.json()
      if(response.statusCode != 200) return res.render("404.ejs", body)
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("added.ejs", { text: "nationality", type: "added", loggedIn, editing, editable })
    })

  app.route("/delete")
    .get(async (req, res) => {
      let approved = await hasAccess(true, req, res); if (!approved) return res.render("404.ejs")
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("../nationalities/delete.ejs", { loggedIn, editing, editable })
    })
    .post(async (req, res) => {
      let response = await request("https://gdlrrlist.com/api/mods/nationalities", {
        method: "DELETE",
        body: JSON.stringify(req.body),
        headers: {
          'content-type': 'application/json',
          'authorization': `Moderator ${getCookie("token", req)}`
        }
      })
      let body = await response.body.json()
      if(response.statusCode != 200) return res.render("404.ejs", body)
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("added.ejs", { text: "nationality", type: "deleted", loggedIn, editing, editable })
    })

  return app
}