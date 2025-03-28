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
const {validFields} = require("./functions")
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(process.env.discord_token);
const fetchUser = async id => rest.get(Routes.user(id));
const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const levelsSchema = require("../schemas/levels.js")
const sixtyoneSchema = require("../schemas/61hertz.js")
const loginSchema = require("../schemas/logins")
const leaderboardSchema = require("../schemas/leaderboard.js")
const jwt = require("jsonwebtoken")
const cron = require("node-cron")
const dayjs = require("dayjs")
let routes = {}

const dateToCron = (date) => {
  const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const days = date.getDate();
    const months = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return `${seconds} ${minutes} ${hours} ${days} ${months} ${dayOfWeek}`;
};

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
router.route("/bans")
.get(async (req, res) => {
  let everything = await leaderboardSchema.find({ban: true})
  res.json(everything)
})
.post(validFields({name: "username", type: String, description: ""}), async (req, res) => {
  let ban_times = {
    "1": 7776000000,
    "2": 15552000000,
    "3": 31536000000,
    "4": "permanent"
  }
  let user = await leaderboardSchema.findOne({name: req.body.username})
  if(!user) return res.status(400).json({error: config["400"], message: "Invalid user provided!"})
  req.body.ban_time = ban_times[req.body.ban_time]
  user.ban = true
  user.ban_reason = req.body.reason ?? "A reason was not provided"
  if(req.body.ban_time != "permanent") {
  user.ban_time = new Date(Date.now()+req.body.ban_time).toISOString()
  let actual_time = dateToCron(new Date(user.ban_time))
  let task = cron.schedule(actual_time, async () => {
    try {
		user.ban = undefined
    user.ban_time = undefined
    user.ban_reason = undefined
    await user.save()
    task.stop()
    } catch(_) {
      
    }
	});
  } else {
    user.ban_time = "permanent"
  }
  await user.save()
  webhook(`A leaderboard profile by the name of ${req.body.username} has been banned ${!isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently"}`, null, {
    event: "PROFILE_BAN_ADD",
    data: {
      name: req.body.username,
      reason: req.body.reason ?? "A reason was not provided",
      time: !isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently",
    }
  })
    return res.status(201).json({
      name: req.body.username,
      reason: req.body.reason ?? "A reason was not provided",
      time: !isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently",
    })
})
.delete(async (req, res) => {
  try {
    let person = await leaderboardSchema.findById(req.body.id)
    if(!person) return res.status(400).json({error: config["400"], message: "Invalid Object ID provided!"})
    person.ban = undefined
    person.ban_time = undefined
    person.ban_reason = undefined
    await person.save()
    webhook(`A leaderboard profile by the name of ${person.name} has been unbanned`, null, {
      event: "PROFILE_BAN_REMOVE",
      data: {
        name: person.name
      }
    })
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Invalid Object ID provided!"})
  }
   return res.sendStatus(204)
})
  
  router.route("/settings")
    .post(rate_lim(60000, 1), async (req, res) => {
      let { name, tag } = req.body
      if (!name || !tag) return res.status(400).json({ error: config["400"], message: `Please input both a "name" field and a "tag" field in your request!` })
      let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
      let userinfo = await loginSchema.findById(token.id)
      let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == userinfo.name)
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
      let userinfo = await loginSchema.findById(token.id)
      let user = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == userinfo.name)

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
      let obj = req.body.completion
      req.body.list = [obj]
      req.body.progresses = ["none"]
      if (!req.body.minimumPercent) {
        delete req.body.minimumPercent
      }
      if (req.body.position < 76 && !req.body.minimumPercent) return res.status(400).json({ error: config["400"], message: "This placement requires a minimum percent to be included!" })
      req.body.name = req.body.name.trim()
      req.body.ytcode = req.body.ytcode.trim()
      req.body.publisher = req.body.publisher.trim()
      let length = await levelsSchema.count()
      if(length+1 < req.body.position || req.body.position <= 0) return res.status(400).json({ error: config["400"], message: "Not a valid position number" })
      var newlev = new levelsSchema(req.body)
      await levelsSchema.updateMany({position: {$gte: req.body.position}}, {
          $inc: {
            position: 1
          }
        })
      await leaderboardSchema.updateOne({name: obj.name}, {
        $push: {
          levels: newlev.name
        }
      }, {upsert: true})
      await levelsSchema.insertMany([newlev])
      webhook(`A new level by the name of ${newlev.name} has been added at #${req.body.position}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, null, {
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
      let level = await levelsSchema.findById(req.body._id)
      if (!level) return res.status(400).json({ error: config["400"], message: "Please input a valid level name!" })
      await leaderboardSchema.updateMany({name: {$in: level.list.map(e => e.name)}}, [{
          $set: {
            levels: {
              $filter: {
                input: "$levels",
                cond: {
                  $ne: [level.name, "$$this"]
                }
              }
            },
            progs: {
              $filter: {
                input: "$progs",
                cond: {
                  $ne: [level.name, "$$this.name"]
                }
              }
            }
          }
      }])
      if (req.body.reason != "") {
        var everything = await levelsSchema.count()
        let obj4 = {
          position: everything + 1,
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
        await levelsSchema.findByIdAndDelete(level._id.toString())
      }
      await levelsSchema.updateMany({position: {$gt: level.position}}, {
        $inc: {
          position: -1
        }
      })
      webhook(`A level by the name of ${level.name} has been deleted. (reason: ${req.body.reason ? req.body.reason.trim() : "not provided"})`, null, {
        event: "LEVEL_DELETE",
        data: {
          name: level.name.trim(),
          reason: req.body.reason ? req.body.reason.trim() : "not provided"
        }
      })
      return res.status(200).send(level)
    })

    router.route("/levels/61hertz")
    .post(async (req, res) => {
      let obj = req.body.completion
      req.body.list = [obj]
      req.body.progresses = ["none"]
      req.body.minimumPercent = 57
      req.body.name = req.body.name.trim()
      req.body.ytcode = req.body.ytcode.trim()
      req.body.publisher = req.body.publisher.trim()
      let length = await sixtyoneSchema.count()
      if(length+1 < req.body.position || req.body.position <= 0) return res.status(400).json({ error: config["400"], message: "Not a valid position number" })
      var newlev = new sixtyoneSchema(req.body)
      await sixtyoneSchema.updateMany({position: {$gte: req.body.position}}, {
          $inc: {
            position: 1
          }
        })
        await leaderboardSchema.updateOne({name: obj.name}, {
          $push: {
            sixtyOneHertz: newlev.name
          }
        }, {upsert: true})
        await sixtyoneSchema.insertMany([newlev])
      webhook(`A new 61hz level by the name of ${newlev.name} has been added at #${req.body.position}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, null, {
        event: "61HERTZ_LEVEL_ADD",
        data: {
          name: newlev.name,
          placement: req.body.position,
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
      var level = await sixtyoneSchema.findById(req.body._id)
      if (!level) return res.status(400).json({ error: config["400"], message: "Please input a valid level name!" })
      await leaderboardSchema.updateMany({name: {$in: level.list.map(e => e.name)}}, [{
          $set: {
            sixtyOneHertz: {
              $filter: {
                input: "$sixtyOneHertz",
                cond: {
                  $ne: [level.name, "$$this"]
                }
              }
            }
          }
      }])
        await sixtyoneSchema.findByIdAndDelete(level._id.toString())
      await sixtyoneSchema.updateMany({position: {$gt: level.position}}, {
        $inc: {
          position: -1
        }
      })
      webhook(`A 61hz level by the name of ${level.name.trim()} has been deleted. (reason: ${req.body.reason ? req.body.reason.trim() : "not provided"})`, null, {
        event: "61HERTZ_LEVEL_DELETE",
        data: {
          name: level.name.trim(),
          reason: req.body.reason ? req.body.reason?.trim() : "not provided"
        }
      })
      return res.status(200).send(level)
    })
  
  for (let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.mods[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.mods[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    if (stack?.path) {
      routes[stack.path] = stack.methods
    }
  }

  return router
}