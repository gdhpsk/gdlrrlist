const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, getCookie } = obj

  app.route("/deletesub")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../deleting/deletesub.ejs", {editing, loggedIn, editable})
})
.post(async (req, res) => {
  let response = await request("https://gdlrrlist.com/api/helper/records", {
    method: "DELETE",
    headers: {
      'authorization': `Helper ${getCookie("token", req)}`
    }
  })
  if(response.statusCode != 203) {
    let body = await response.body.json()
    return res.render("404.ejs", body)
  } else {
    let {loggedIn, editing, editable} = await getDetails(req)
    return res.render("added.ejs", {text: "submission", type: "deleted", editing, loggedIn, editable})
  }
})

app.route("/add")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  if(req.query.record) {
    try {
     const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions`, {
    headers: {
      authorization: `Helper ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode == 200) {
    let info = json.find(e => e._id == req.query.record)
    if(info) {
        return res.render("../adding/addsub.ejs", {loggedIn, editing, editable, info})
      }
  }
    } catch(_) {
      
    }
  }
  return res.render("../adding/addsub.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let response = await request("https://gdlrrlist.com/api/helper/records", {
    method: "PUT",
    headers: {
      'authorization': `Helper ${getCookie("token", req)}`
    }
  })
  let body = await response.body.json()
  if(response.statusCode != 201) return res.render("404.ejs", body)
  let {loggedIn, editing, editable} = await getDetails(req)
  let addedRecord = true
  return res.render("added.ejs", {text: "submission", type: "added", loggedIn, editing, editable, addedRecord})
})
  
  return app
}