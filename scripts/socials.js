const express = require("express")
const {request} = require("undici")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, leaderboardSchema, getDetails, getCookie, fetchUser, webhook } = obj

  app.route("/add")
    .get(async (req, res) => {
      let approved = await hasAccess(true, req, res); if (!approved) return res.render("404.ejs")
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("../socials/add.ejs", { loggedIn, editing, editable })
    })
    .post(async (req, res) => {
      let response = await request("https://gdlrrlist.com/api/helper/socials", {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: {
          'content-type': 'application/json',
          'authorization': `Helper ${getCookie("token", req)}`
        }
      })
      let body = await response.body.json()
      if(response.statusCode != 200) return res.render("404.ejs", body)
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("added.ejs", { text: "socials", type: "added", loggedIn, editing, editable })
    })

  app.route("/delete")
    .get(async (req, res) => {
      let approved = await hasAccess(true, req, res); if (!approved) return res.render("404.ejs")
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("../socials/delete.ejs", { loggedIn, editing, editable })
    })
    .post(async (req, res) => {
      let response = await request("https://gdlrrlist.com/api/helper/socials", {
        method: "DELETE",
        body: JSON.stringify(req.body),
        headers: {
          'content-type': 'application/json',
          'authorization': `Helper ${getCookie("token", req)}`
        }
      })
      let body = await response.body.json()
      if(response.statusCode != 200) return res.render("404.ejs", body)
      let { loggedIn, editing, editable } = await getDetails(req)
      return res.render("added.ejs", { text: "socials", type: "deleted", loggedIn, editing, editable })
    })

  return app
}