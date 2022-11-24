const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const rouletteSchema = require("../../schemas/roulette.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const loginSchema = require("../../schemas/logins.js")
const mailSchema = require("../../schemas/mail")
const bcrypt = require("bcrypt")
const {validFields} = require("../functions")
let routes = {}

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


router.put("/start", authenticator, validFields({name: "filters", type: Array, args: ["main", "extended", "legacy"], description: "Levels that you want to include in the LRR roulette.", optional: true}, {name: "redirect", type: String, description: "Connect to another players roulette", optional: true}), async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let exists = await rouletteSchema.findOne({site_user: id})
  if(exists) return res.status(400).json({error: config["400"], message: "This user already has a roulette session!"})
  if(req.body.redirect) {
    try {
      let redirect_exists = await rouletteSchema.findById(req.body.redirect)
      if(!redirect_exists) return res.status(400).json({error: config["400"], message: "The user you are trying to redirect to does not exist!"})
      if(redirect_exists.redirect) return res.status(400).json({error: config["400"], message: "You cannot join a person who is already redirected!"})
    } catch(_) {
      return res.status(400).json({error: config["400"], message: "The user you are trying to redirect to does not exist!"})
    }
    let doc = await rouletteSchema.create({
      site_user: id,
      redirect: req.body.redirect
    })
    return res.json(doc)
  }
  if(!req.body.filters) {
    req.body.filters = ["main", "extended", "legacy"]
  }
  let final_epilogue = await levelsSchema.findOne({name: "Final Epilogue"})
  let obj = {
     main: await levelsSchema.find({position: {$lte: 75, $gte: 1}}),
     extended: await levelsSchema.find({position: {$lte: 150, $gte: 76}}),
    legacy: await levelsSchema.find({position: {$gte: 151, $lte: final_epilogue.position}})
  }
  let levels = []
  let filters = req.body.filters
  filters.forEach(e => levels.push(...obj[e]))
  levels.sort((a, b) => a.position - b.position)
  let random_lev = levels[Math.floor(Math.random()*(levels.length-1))]
  levels.splice(levels.findIndex(e => e == random_lev), 1)
  let { 
        minimumPercent,
        name,
        ytcode,
        publisher,
        position
      } = random_lev
  let doc = {
    site_user: id,
    config: {
      levels: levels.map(e => e = {name: e.name, pos: e.position}),
      options: {
        levels: filters
      }
    },
    levels: [
      { 
        minimumPercent: minimumPercent ?? 100,
        name,
        percent: 1,
        ytcode,
        publisher,
        position
      }
    ]
  }
  doc = await rouletteSchema.create(doc)
  let username = await loginSchema.findById(id)
  doc.username = username.name
  res.json(doc)
})

router.post("/generate", authenticator, validFields({name: "percent", type: Number, description: "The percentage you got on the previous level", optional: true}, {name: "skipped", type: Boolean, description: "Was the level skipped?", optional: true}), async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let exists = await rouletteSchema.findOne({site_user: id})
  if(!exists) return res.status(400).json({error: config["400"], message: "Please start a roulette session first!"})
  if(exists?.redirect) {
    exists = await rouletteSchema.findById(exists.redirect)
  }
  if(req.body.skipped) {
    req.body.percent = undefined
  }
  if(req.body.percent) {
    if(req.body.percent < exists.levels[exists.levels.length-1].percent || req.body.percent > 100) {
      return res.status(400).json({error: config["400"], message: `Input a number greater between ${exists.levels[exists.levels.length-1].percent}% and 100%!`})
    }
  }
  if(req.body.percent == 100 || exists.config.levels.length == 0) {
     let redirects = await rouletteSchema.find({redirect: exists._id.toString()})
  for(const redirect of redirects) {
    try {
      await rouletteSchema.findOneAndDelete({site_user: redirect.site_user})
    } catch(_) {
      
    }
  }
    let doc = await rouletteSchema.findOneAndDelete({site_user: id})
    return res.sendStatus(204)
  }
  let random_lev = exists.config.levels[Math.floor(Math.random()*(exists.config.levels.length-1))]
  const position = random_lev.pos
  exists.config.levels = exists.config.levels.filter(e => e != random_lev)
  random_lev = await levelsSchema.findOne({name: random_lev.name})
  let { 
        minimumPercent,
        name,
        ytcode,
        publisher
      } = random_lev
  if(req.body.skipped) {
    exists.levels[exists.levels.length-1].skipped = true
  } else {
     exists.levels[exists.levels.length-1].skipped = false
  }
  exists.levels.push({ 
        minimumPercent: minimumPercent ?? 100,
        name,
        percent: (parseInt(req.body.percent) || exists.levels[exists.levels.length-1].percent)+1,
        ytcode,
        publisher,
        position
      })
  doc = await exists.save()
  res.json(doc)
})

router.route("/session")
.get(authenticator, async(req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let exists = await rouletteSchema.findOne({site_user: id})
  if(!exists) return res.status(400).json({error: config["400"], message: "Please start a roulette session first!"})
  if(exists?.redirect) {
    exists = await rouletteSchema.findById(exists.redirect)
  }
  res.json(exists)
})
.delete(authenticator, async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let exists = await rouletteSchema.findOne({site_user: id})
  if(!exists) return res.status(400).json({error: config["400"], message: "Please start a roulette session first!"})
  if(exists?.redirect) {
    exists = await rouletteSchema.findById(exists.redirect)
  }
  let redirects = await rouletteSchema.find({redirect: exists._id.toString()})
  for(const redirect of redirects) {
    try {
      await rouletteSchema.findOneAndDelete({site_user: redirect.site_user})
    } catch(_) {
      
    }
  }
  await rouletteSchema.findOneAndDelete({site_user: id})
  res.sendStatus(204)
})
.patch(authenticator, validFields({name: "bindDiscord", type: Boolean, description: "Decide whether or not to bind this roulette to your discord account.", optional: true}, {name: "Leave", type: Boolean, description: "Decide whether or not to leave this redirect roulette session.", optional: true}), async(req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let exists = await rouletteSchema.findOne({site_user: id})
  if(!exists) return res.status(400).json({error: config["400"], message: "Please start a roulette session first!"})
  if(exists?.redirect) {
    exists = await rouletteSchema.findById(exists.redirect)
  }
  if([true, false].includes(req.body.bindDiscord)) {
    if(req.body.bindDiscord) {
    let user = await loginSchema.findById(id)
    if(!user.discord) return res.status(400).json({error: config["400"], message: "You must have a discord account linked to your LRR Login!"})
      let existsTwo = await rouletteSchema.findOne({user: user.discord})
      if(existsTwo) return res.status(400).json({error: config["400"], message: "This user already has another roulette session!"})
    exists.user = user.discord
    await exists.save()
    return res.sendStatus(204)
  } else {
      exists.user = undefined
      await exists.save()
      return res.sendStatus(204)
  }
  }
  if([true, false].includes(req.body.leave)) {
    if(req.body.leave) {
      let redirect = await rouletteSchema.findOne({site_user: id})
      if(!redirect.redirect) return res.status(400).json({error: config["400"], message: "You must be a redirect in order for this to work!"})
    await rouletteSchema.findOneAndDelete({site_user: id})
    return res.sendStatus(204)
  } else {
    return res.sendStatus(204)
  }
}
  return res.status(400).json({error: config["400"], message: "You inputted nothing."})
})

  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.v1.roulette[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.roulette[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    layers = stack?.stack.filter(layers => layers.handle.name == "authenticator")
    if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.roulette[`${layer.method.toUpperCase()} ${stack.path}`].require_perm = true
        }
      } 
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}