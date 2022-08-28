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
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(process.env.discord_token);
const fetchUser = async id => rest.get(Routes.user(id));
const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const levelsSchema = require("../schemas/levels.js")
const leaderboardSchema = require("../schemas/leaderboard.js")
const jwt = require("jsonwebtoken")
let routes = {}

module.exports = (authFunction, webhook, rate_lim) => {
  const express = require("express")
  const router = express.Router()
  router.use(express.urlencoded({ extended: true }))
  router.use(async (req, res, next) => {
    let path = req.url.split("?")[0]
    if (!routes[path]) return next()
    if (!routes[path][req.method.toLowerCase()]) return res.status(405).json({ error: config["405"][0], message: config["405"][1] })
    let correct_auth = await authFunction(req, res, ["leader", "moderator"])
    if (!correct_auth) {
      return res.status(401).json({ error: config["401"][0], message: config["401"][1] })
    }
    next()
  })

  router.route("/settings")
    .post(rate_lim(60000, 1), async (req, res) => {
      let { name, tag } = req.body
      if (!name || !tag) return res.status(400).json({ error: config["400"], message: `Please input both a "name" field and a "tag" field in your request!` })
      let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
      let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username)
      if (user.tag == "moderator") {
        if (tag != "spectator") return res.status(401).json({ error: config["401"][0], message: config["401"[1]] })
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
      if (person == -1) return res.status(400).json({ error: config["400"], message: "Please input a valid name / Discord ID!" })

      let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
      let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username)

      if (user.tag == "moderator") {
        if (everything.allowed[person].tag != "spectator") return res.status(401).json({ error: config["401"][0], message: config["401"][1] })
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
      var obj = {
        name: req.body.username.trim(),
        link: req.body.link.trim(),
        hertz: req.body.hertz.trim()
      }
      req.body.list = [obj]
      req.body.progresses = ["none"]
      if (!req.body.minimumPercent) {
        delete req.body.minimumPercent
      }
      if (req.body.placement < 76 && !req.body.minimumPercent) return res.status(400).json({ error: config["400"], message: "This placement requires a minimum percent to be included!" })
      req.body.name = req.body.name.trim()
      req.body.ytcode = req.body.ytcode.trim()
      req.body.publisher = req.body.publisher.trim()
      req.body.position = req.body.placement - 1
      var newlev = new levelsSchema(req.body)
      var player = await leaderboardSchema.findOne({ name: obj.name })
      if (!player) {
        await leaderboardSchema.create({ name: obj.name, levels: [newlev.name], progs: ["none"] })
      } else {
        player.levels.push(newlev.name)
        await player.save()
      }
      await levelsSchema.insertMany([newlev])
      let everything = await levelsSchema.find().sort({ position: 1 })
      for (let i = 0; i < everything.length; i++) {
        await levelsSchema.findOneAndUpdate({ name: everything[i].name }, {
          $set: {
            position: i + 1
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
      return res.status(200).send(newlev)
    })
    .delete(async (req, res) => {
      var level = await levelsSchema.findOne({ name: req.body.name.trim() })
      if (!level) return res.status(400).json({ error: config["400"], message: "Please input a valid level name!" })
      for (let i = 0; i < level.list.length; i++) {
        var player = await leaderboardSchema.findOne({ name: level.list[i].name })
        if (player) {
          player.levels = player.levels.filter(e => e != level.name)
          await player.save()
          if (player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
            await leaderboardSchema.findByIdAndDelete(player._id.toString())
          }
        } else {
          console.log(level.list[i].name)
        }
      }
      if (level.progresses) {
        if (level.progresses[0] != "none") {
          for (let i = 0; i < level.progresses.length; i++) {
            var player = await leaderboardSchema.findOne({ name: level.progresses[i].name })
            if (player) {
              player.progs = player.progs.filter(e => e.name != level.name)
              if (player.progs.length == 0) {
                player.progs[0] = "none"
              }
              await player.save()
              if (player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
                await leaderboardSchema.findByIdAndDelete(player._id.toString())
              }
            } else {
              console.log(level.progresses[i].name)
            }
          }
        }
      }
      if (req.body.reason != "") {
        var everything = await levelsSchema.find().sort({ position: 1 })
        let obj4 = {
          position: everything.length + 1,
          name: level.name,
          ytcode: level.ytcode,
          removalDate: dayjs(Date.now()).format("MMMM D, YYYY"),
          formerRank: level.position,
          publisher: level.publisher,
          list: [
            {
              "name": "Removed",
              "link": ` ${req.body.reason.trim()}`,
              "hertz": "60"
            }
          ]
        }
        await levelsSchema.create(obj4)
        await levelsSchema.findByIdAndDelete(level._id.toString())
      } else {
        await levelsSchema.findOneAndDelete({ name: req.body.name.trim() })
      }
      var everything = await levelsSchema.find().sort({ position: 1 })
      for (let i = level.position - 1; i < everything.length; i++) {
        await levelsSchema.findOneAndUpdate({ name: everything[i].name }, {
          $set: {
            position: i + 1
          }
        })
      }
      webhook(`A level by the name of ${req.body.name.trim()} has been deleted. (reason: ${req.body.reason ? req.body.reason.trim() : "not provided"})`, {
        event: "LEVEL_DELETE",
        data: {
          name: req.body.name.trim(),
          reason: req.body.reason ? req.body.reason.trim() : "not provided"
        }
      })
      return res.status(200).send(level)
    })
  router.route("/nationalities")
    .post(async (req, res) => {
      var player = await leaderboardSchema.findOne({ name: req.body.name.trim() })
      if (!player) return res.status(400).json({ error: config["400"], message: "Please input a valid player name!" })
      const message = `The nationality of ${player.name} has been changed from ${!player.nationality ? "nothing" : player.nationality.trim()} to ${req.body.nationality.trim()}`
      webhook(message, null, {
        event: "PROFILE_NATIONALITY_ADD",
        data: {
          name: player.name,
          nationality: {
            previously: !player.nationality ? "nothing" : player.nationality.trim(),
            now: req.body.nationality.trim()
          }
        }
      })
      player.nationality = req.body.nationality.trim()
      await player.save()
      return res.status(200).send(player)
    })
    .delete(async (req, res) => {
      var player = await leaderboardSchema.findOne({ name: req.body.name.trim() })
      if (!player) return res.status(400).json({ error: config["400"], message: "Please input a valid player name!" })
      const message = `The nationality of ${player.name} has been deleted. (nationality: ${player.nationality.trim()})`
      console.log(player.nationality.trim())
      player.nationality = undefined
      await player.save()
      webhook(message, null, {
        event: "PROFILE_NATIONALITY_DELETE",
        data: {
          name: player.name,
          nationality: "nothing"
        }
      })
      return res.status(200).send(player)
    })
  router.route("/socials")
    .post(async (req, res) => {
      var player = await leaderboardSchema.findOne({ name: req.body.name.trim() })
      if (!player) return res.status(400).json({ error: config["400"], message: "Please input a valid player name!" })
      if (req.body.discordid != "") {
        let user = await fetchUser(req.body.discordid);
        if (user) {
          req.body.discord = `${user.username}#${user.discriminator}`
        }
      }
      let profile = ""
      for (const key in req.body) {
        profile += `${key}: ${req.body[key]}\n`
      }
      const message = `The socials of ${player.name} has been changed to this:\n\n ${profile}`
      player.socials = req.body
      await player.save()
      webhook(message, null, {
        event: "PROFILE_SOCIALS_EDIT",
        data: {
          new: req.body
        }
      })
      res.status(200).send(player)
    })
    .delete(async (req, res) => {
      var player = await leaderboardSchema.findOne({ name: req.body.name.trim() })
      if (!player) return res.status(400).json({ error: config["400"], message: "Please input a valid player name!" })
      const message = `The socials of ${player.name} has been deleted. (socials: ${JSON.stringify(player.socials)})`
      console.log(player.socials)
      player.socials = undefined
      await player.save()
      webhook(message, null, {
        event: "PROFILE_SOCIALS_DELETE",
        data: {
          name: player.name,
          socials: player.socials
        }
      })
      res.status(200).send(player)
    })
  for (let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if (stack?.path) {
      routes[stack.path] = stack.methods
    }
  }

  return router
}