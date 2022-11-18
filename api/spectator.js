const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const {validFields} = require("./functions")
let routes = {}

module.exports = (authFunction, webhook, rate_lim) => {
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
  router.use(async (req, res, next) => {
      let path = req.url.split("?")[0]
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
  let correct_auth = await authFunction(req, res, ["leader", "moderator", "helper", "spectator"])
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
})

  router.route("/settings")
.get(async (req, res) => {
  let everything = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  res.json(everything)
})
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    stack?.stack.forEach(layers => {
      if(layers.handle.name == validFields({}).name) {
          config.documentation.spectator[`${layers.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layers.handle.functionArgs)
        
      }
    })
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}