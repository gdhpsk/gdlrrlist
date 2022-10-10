const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
 let routes = {}

module.exports = (authFunction, webhook, rate_lim) => {
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
  router.use(async (req, res, next) => {
      let path = req.url.split("?")[0]
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
  let correct_auth = await authFunction(req, res, ["leader"])
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
})

  router.route("/settings")
.patch(async (req, res) => {
  let {name, tag} = req.body
  if(!name || !tag) return res.status(400).json({error: config["400"], message: `Please input both a "name" field and a "tag" field in your request!`})
  let data = {
    username: name
  }
  let everything = await allowedPeople.findById("6270b923564c64eb5ed912a4")
  let person = everything.allowed.findIndex(e => e.name == req.body.name)
  if(person == -1) return res.status(400).json({error: config["400"], message: "Please input a valid username or discord ID!"})
  data.old = everything.allowed[person].tag
  everything.allowed[person].tag = req.body.tag
  data.new = req.body.tag
  await everything.save()
  webhook(`The access of the account ${req.body.name} have been changed to ${req.body.tag}`, null, {
    event: "MEMBER_CHANGE",
    data
  });
  res.sendStatus(204)
})
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}