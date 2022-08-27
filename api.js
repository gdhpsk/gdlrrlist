const express = require("express")
const levelsSchema = require("./schemas/levels.js")
const leaderboardSchema = require("./schemas/leaderboard.js")
const sixtyoneSchema = require("./schemas/61hertz.js")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
let rouletteSchema = require("./schemas/roulette")
const {request} = require("undici")

router.get("/", async (req, res) => {
    var everything = await levelsSchema.find().sort({position: 0})
    res.json(everything)
})

router.get("/random", async (req, res) => {
    var everything = await levelsSchema.find()
   everything.sort((a, b) => a._id - b._id)
  let excludedLevels = []
  if(req.query.exclude) {
    try {
      let exclusions = JSON.parse(req.query.exclude)
      excludedLevels.push(exclusions)
    }catch(_) {

}
  }
  if(req.query.filter) {
    try {
      let newarr = []
      let filters = JSON.parse(req.query.filter)
      if(filters.includes("main")) {
        for(let i = 0; i < 75; i++) {
          newarr.push(everything[i])
        }
      }
      if(filters.includes("extended")) {
        for(let i = 75; i < 150; i++) {
          newarr.push(everything[i])
        }
      }
      if(filters.includes("legacy")) {
        for(let i = 150; i < everything.findIndex(e => e.name == "Final Epilogue")+1; i++) {
          newarr.push(everything[i])
        }
      }
      newarr = newarr.filter(e => !excludedLevels[0].includes(e.name))
      let randomNum = Math.floor(Math.random() * (newarr.length-1))
      let randomLev = newarr[randomNum]
  if(req.query.appendTo) {
    try {
      let user = await rouletteSchema.findById(req.query.appendTo)
      let lev = user.config.levels[randomNum]
      user.config.levels = user.config.levels.filter(e => e.name != lev.name)
      console.log(lev)
      randomLev._id = lev.pos
      user.levels.push(randomLev)
      await user.save()
    }catch(e) {
      //console.log(e)
    }
  }
      return res.send(randomLev)
    } catch(e) {
      //console.log(e)
    }
  }
      everything = everything.filter(e => !excludedLevels[0].includes(e.name))
  let randomNum = Math.floor(Math.random() * (everything.length-1))
   let randomLev = everything[randomNum]
  if(req.query.appendTo) {
    try {
      let user = await rouletteSchema.findById(req.query.appendTo)
      randomNum = Math.floor(Math.random() * (user.config.levels.length-1))
      let lev = user.config.levels[randomNum]
      user.config.levels = user.config.levels.filter(e => e.name != lev.name)
      console.log(lev)
      randomLev._id = lev.pos
      user.levels.push(randomLev)
      await user.save()
    }catch(e) {
      //console.log(e)
    }
  }
    res.json(randomLev)
})

router.get("/raw", async (req, res) => {
    var everything = await levelsSchema.find()
   everything.sort((a, b) => a._id - b._id)
    res.json(JSON.stringify(everything[0].list[0]))
})

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

router.get("/leaderboard", async (req, res) => {
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

module.exports = router