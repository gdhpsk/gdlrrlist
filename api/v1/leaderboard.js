const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const mod_log = require("../../schemas/mod_log.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const leaderboardSchema = require("../../schemas/leaderboard.js")
const {request} = require("undici")
const bcrypt = require("bcrypt")
let routes = {}
const {validFields} = require("../functions")


module.exports = (authFunction, webhook, rate_lim, send) => {
  let authenticator = async (req, res, next) => {
      let path = req.url.split("?")[0]
    if(Object.keys(req.params).length) {
      for(const key in req.params) {
        path = path.replace(req.params[key], ":"+key)
      }
    }
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
    let correct_auth = await authFunction(req, res)
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
}
  const express = require("express")
const router = express.Router()

router.use(express.urlencoded({ extended: true }))


router.get("/nations", async (req, res) => {
  let countries = await request("https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/index.json")
      let country_codes = await countries.body.json()
  country_codes.sort((a, b) => (a.name.toLowerCase()> b.name.toLowerCase())*2-1)
  var obj = {
    "International": "International"
  }
  for(let i = 0; i < country_codes.length; i++) {
    obj[country_codes[i].name.toLowerCase()] = country_codes[i].code.toLowerCase()
  }
  obj["england"] = "gb-eng"
  obj["scotland"] = "gb-sct"
  obj["wales"] = "gb-wls"
  res.json(obj)
})

router.get("/nationsemotes", async (req, res) => {
  let countries = await request("https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/index.json")
      let country_codes = await countries.body.json()
  var obj = {}
  for(let i = 0; i < country_codes.length; i++) {
    obj[country_codes[i].name.toLowerCase()] = country_codes[i].emoji.toLowerCase()
  }
  res.json(obj)
})

router.get("/", async (req, res) => {
var everything = await leaderboardSchema.find()
     var obj = everything.reduce(function(acc, cur, i) {
         acc[everything[i].name] = cur;
         return acc;
       }, {});
     res.json(obj)
 })

router.get("/nationalities", async (req, res) => {
  var everything = await leaderboardSchema.find()
    var obj = {}
  for(let i = 0; i < everything.length; i++) {
    if(everything[i].nationality) {
      obj[everything[i].name] = everything[i].nationality
    }
  }
    res.json(obj)
})

  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    stack?.stack.forEach(layers => {
      if(layers.handle.name == validFields({}).name) {
          config.documentation.v1.leaderboard[`${layers.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layers.handle.functionArgs)
        
      }
    })
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}