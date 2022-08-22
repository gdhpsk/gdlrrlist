const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
let routes = {}

module.exports = (authFunction, webhook, rate_lim) => {
  let authenticator = async (req, res, next) => {
      let path = req.url.split("?")[0]
    if(Object.keys(req.params).length) {
      for(const key in req.params) {
        path = path.replace(req.params[key], ":"+key)
      }
    }
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
  next()
}
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
  router.use(authenticator)


router.get("/", async (req, res) => {
  let config = {
    position: {
      $gt: isNaN(req.query.start) ? 0 : req.query.start-1,
      $lt: isNaN(req.query.end) ? undefined : req.query.end
    }
  }
   if(config.position["$lt"] === undefined) {
     delete config.position["$lt"]
   }
  let everything = await levelsSchema.find(config).sort({position: 1})
  res.json(everything)
})

router.get("/:id", authenticator, async (req, res) => {
  if(isNaN(req.params.id)) return res.status(400).json({error: config["400"], message: "Please input a valid level position!"})
  let level = await levelsSchema.findOne({position: req.params.id})
  if(!level) return res.status(400).json({error: config["400"], message: "Please input a valid level position!"})
  res.json(level)
})



  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}