const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const mod_log = require("../../schemas/mod_log.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const loginSchema = require("../../schemas/logins.js")
const mailSchema = require("../../schemas/mail")
const bcrypt = require("bcrypt")
const {validFields} = require("../functions")
let routes = {}

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


router.get("/", async (req, res) => {
  let logs = await mod_log.find()
  res.json(logs)
})

  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    stack?.stack.forEach(layers => {
      if(layers.handle.name == validFields({}).name) {
          config.documentation.v1.logs[`${layers.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layers.handle.functionArgs)
        
      }
    })
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}