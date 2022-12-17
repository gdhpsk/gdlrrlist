const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { getDetails, getCookie } = obj


app.get("/archive", async (req, res) => {
  const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions`, {
    headers: {
      authorization: `Helper ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  json = json.filter(e => e.status != "pending")
  return res.render("../submissions/submissions.ejs", {amount: json.length, text: json.map(e => e = e.username), loggedIn, editing, editable })
})

app.get("/archive/:num", async (req, res) => {
   const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions`, {
    headers: {
      authorization: `Helper ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  let obj = json.filter(e => e.status != "pending")[req.params.num-1]
  if(!obj) return res.render("404.ejs", {error: "400 BAD REQUEST", message: "Submission number out of range."})

  obj.number = req.params.num
  obj.loggedIn = loggedIn
  obj.editable = editable
  obj.editing = editing
  let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  obj.embed = obj.video.trim().match(reg) ? `https://www.youtube.com/embed/${reg.exec(obj.video.trim())[1]}`: obj.video
  return res.render("../submissions/each.ejs", obj)
})

app.get("/user", async (req, res) => {
  const submissions = await request('https://gdlrrlist.com/api/v1/client/submissions', {
    headers: {
      authorization: `User ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../submissions/users/submissions.ejs", {amount: json.length, text: json, loggedIn, editing, editable, active: "user_submissions" })
})

  app.get("/user/:num", async (req, res) => {
  const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions?num=${req.params.num}`, {
    headers: {
      authorization: `User ${getCookie("token", req)}`
    }
  })
  let obj = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", obj)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  obj.number = req.params.num
  obj.loggedIn = loggedIn
  obj.editable = editable
  obj.editing = editing
  let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  obj.embed = obj.video.trim().match(reg) ? `https://www.youtube.com/embed/${reg.exec(obj.video.trim())[1]}`: obj.video
  return res.render("../submissions/users/edit.ejs", obj)
})

app.get("/:num", async (req, res) => {
  const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions?num=${req.params.num}`, {
    headers: {
      authorization: `Spectator ${getCookie("token", req)}`
    }
  })
  let obj = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", obj)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  obj.number = req.params.num
  obj.loggedIn = loggedIn
  obj.editable = editable
  obj.editing = editing
  let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  obj.embed = obj.video.trim().match(reg) ? `https://www.youtube.com/embed/${reg.exec(obj.video.trim())[1]}`: obj.video
  return res.render("../submissions/each.ejs", obj)
})

  app.get("/", async (req, res) => {
  const submissions = await request('https://gdlrrlist.com/api/v1/client/submissions', {
    headers: {
      authorization: `Spectator ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../submissions/submissions.ejs", {amount: json.length, text: json.map(e => e = e.username), loggedIn, editing, editable, active: "submissions" })
})

app.post("/status",async (req, res) => {
  let submit = await request("https://gdlrrlist.com/api/helper/submissions/mod", {
    headers: {
      'content-type': "application/json",
      authorization: `Helper ${getCookie("token", req)}`
    },
    method: "PATCH",
    body: JSON.stringify(req.body),
  })
  let body = await submit.body.json()
  if(submit.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  return res.redirect("/submissions")
})
  
  return app
}