// const express = require("express")
// // const levelsSchema = require("./schemas/levels.js")
// // const leaderboardSchema = require("./schemas/leaderboard.js")
// // const sixtyoneSchema = require("./schemas/61hertz.js")
// const router = express.Router()
// router.use(express.urlencoded({ extended: true }))
// // const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// // let rouletteSchema = require("./schemas/roulette")



// router.get("/test", (req, res) => {
//   res.json({
//     status: "200 OK"
//   })
// })

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
  let correct_auth = await authFunction(req, res, ["leader", "moderator"])
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
})

  router.route("/settings")
.post(rate_lim(60000, 1), async (req, res) => {
  let {name, tag} = req.body
  if(!name || !tag) return res.status(400).json({error: config["400"], message: `Please input both a "name" field and a "tag" field in your request!`})
  let token = jwt.verify(req.headers.authorization.split(" ")[1],  process.env.WEB_TOKEN)
  let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username)
  if(user.tag == "moderator") {
    if(tag != "spectator") return res.status(401).json({error: config["401"][0], message: config["401"[1]]})
  }
  req.body._id = new mongoose.Types.ObjectId()
  await allowedPeople.findByIdAndUpdate("6270b923564c64eb5ed912a4", {
    $push: {
      allowed: req.body
    }
  })
  webhook(`The user ${req.body.name} has been given ${req.body.tag} access.`, null, {
    event: "MEMBER_ADD",
    data: {
      name: req.body.name,
      access_level: req.body.tag
    }
  })
  return res.status(201).send(req.body)
})
  .delete(async (req, res) => {
    let everything = await allowedPeople.findById("6270b923564c64eb5ed912a4")
  let person = everything.allowed.findIndex(e => e.name == req.body.name && e.tag == req.body.tag)
    if(person == -1) return res.status(400).json({error: config["400"], message: "Please input a valid name / Discord ID!"})
    
let token = jwt.verify(req.headers.authorization.split(" ")[1],  process.env.WEB_TOKEN)
  let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username)
    
     if(user.tag == "moderator") {
    if(everything.allowed[person].tag != "spectator") return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
    
  everything.allowed.splice(person, 1)
  await everything.save()
  webhook(`User ${req.body.name} has been deleted, and no longer has access to any editing.`, null, {
    event: "MEMBER_DELETE",
    data: {
      name: req.body.name
    }
  })
  return res.sendStatus(204)
})
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
}
  
  return router
}