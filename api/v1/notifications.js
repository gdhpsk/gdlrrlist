const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const webpush = require('web-push')
const {validFields, docMaker} = require("../functions")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const loginSchema = require("../../schemas/logins.js")
const messagesSchema = require("../../schemas/direct_messages.js")
const bcrypt = require("bcrypt")
const path = require("path")
let routes = {}
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(process.env.discord_token);

webpush.setVapidDetails(
  'https://gdlrrlist.com',
  process.env.vapid_public,
  process.env.vapid_private
)

module.exports = (authFunction, webhook, rate_lim, send) => {
  async function authenticator(req, res, next) {
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

router.route("/subscribe")
.post(authenticator, async (req, res) => {
  const subscription = req.body
  let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  await loginSchema.findByIdAndUpdate(token.id, {
    $set: {
      subscription
    }
  })
  res.sendStatus(204)
})
.delete(authenticator, async (req, res) => {
  let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  await loginSchema.findByIdAndUpdate(token.id, {
    $unset: {
      subscription: {}
    }
  })
  res.sendStatus(204)
})



  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.v1.notifications[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.notifications[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    layers = stack?.stack.filter(layers => layers.handle.name == "authenticator")
    if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.notifications[`${layer.method.toUpperCase()} ${stack.path}`].require_perm = true
        }
      } 
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  return router
}