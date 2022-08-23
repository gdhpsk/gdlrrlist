const express = require("express")
const app = express.Router()
const {request} = require("undici")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { hasAccess, getDetails, getCookie, opinionSchema, levelsSchema } = obj

  app.get("/", async (req, res) => {
 let approved = await hasAccess(true, req, res, true)
  if(!approved) return res.render("404.ejs")
  let {loggedIn, editing, editable} = await getDetails(req)
  let everything2 = await opinionSchema.find()
  return res.render("sheets.ejs", {everything: everything2, loggedIn, editable, editing, active: "sheets"})
})
app.post("/:id/:op", async (req, res) => {
  req.body.name = req.params.id
  req.body.id = req.params.op
 let response = await request("https://gdlrrlist.com/api/helper/sheets/opinion", {
    method: "PATCH",
    headers: {
      "authorization": `Helper ${getCookie("token", req)}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(req.body)
  })
  try {
    let body = await response.body.json()
    return res.status(response.statusCode).render("404.ejs", body)
  } catch(_) {
    res.redirect(`/sheets/${req.params.id}`)
  }
})

app.route("/:name")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let everything = await opinionSchema.findById(req.params.name)
  if(!everything) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  let levels = await levelsSchema.find().sort({position: 1})
  
  everything.index = levels.findIndex(e => e.name.toLowerCase() == req.params.name.toLowerCase()) != -1 ? levels.findIndex(e => e.name.toLowerCase() == req.params.name.toLowerCase())+1 : "TBD"
  return res.render("sheettemps.ejs", {everything: everything})
})
  
  return app
}