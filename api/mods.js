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

router.route("/levels")
  .post(async (req, res) => {
    let {loggedIn, editing, editable} = await getDetails(req)
    var obj = {
      name: req.body.username.trim(),
      link: req.body.link.trim(),
      hertz: req.body.hertz.trim()
    }
    req.body.list = [obj]
    req.body.progresses = ["none"]
    if(!req.body.minimumPercent) {
      delete req.body.minimumPercent
    }
    if(req.body.placement < 76 && !req.body.minimumPercent) return res.status(400).json({error: config["400"], message: "This placement requires a minimum percent to be included!"})
    req.body.name = req.body.name.trim()
    req.body.ytcode = req.body.ytcode.trim()
    req.body.publisher = req.body.publisher.trim()
    req.body.position = req.body.placement-1
    var newlev = new levelsSchema(req.body)
    var player = await leaderboardSchema.findOne({name: obj.name})
    if(!player) {
      await leaderboardSchema.create({name: obj.name, levels: [newlev.name], progs: ["none"]})
    } else {
      player.levels.push(newlev.name)
    await  player.save()
    }
    await levelsSchema.insertMany([newlev])
    let everything = await levelsSchema.find().sort({position: 1})
    for(let i = 0; i < everything.length; i++) {
      await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
       $set: {
         position: i+1
       }
     })
    }
    webhook(`A new level by the name of ${newlev.name} has been added at #${req.body.placement}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, null, {
      event: "LEVEL_ADD",
      data: {
        name: newlev.name,
        placement: req.body.placement,
        completion: {
          name: obj.name,
          link: obj.link,
          hertz: obj.hertz
        }
      }
    })
    res.status(200).send(newlev)
  })
  
for(let i = 0; i < router.stack.length; i++) {
  let stack = router.stack[i].route
  if(stack?.path) {
    routes[stack.path] = stack.methods
  }
}
  
  return router
}