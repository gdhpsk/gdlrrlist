const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../schemas/opinions.js")
const levelsSchema = require("../schemas/levels.js")
const loginSchema = require("../schemas/logins.js")
const sixtyoneSchema = require("../schemas/61hertz")
const leaderboardSchema = require("../schemas/leaderboard.js")
let routes = {}
const dayjs = require("dayjs")
const submitSchema = require("../schemas/submissions.js")
const {request} = require("undici")
const messageSchema = require("../schemas/direct_messages.js")
const {validFields} = require("./functions")
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(process.env.discord_token);
const fetchUser = async id => rest.get(Routes.user(id));

function getCookie(cname, req) {
  return req.cookies[cname] ? req.cookies[cname] : "";
}

module.exports = (authFunction, webhook, rate_lim, send) => {
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
  router.use(async (req, res, next) => {
      let path = req.url.split("?")[0]
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
  let correct_auth = await authFunction(req, res, ["leader", "moderator", "helper"])
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
})

  router.patch("/records/comp", async (req, res) => {
    let data = {}
  let level = await levelsSchema.findOne({name: req.body.level})
    try {
      parseInt(req.body.id)
    } catch(_) {
      return res.status(400).json({error: config["400"], message: "Plese input a valid record ID for the 'id' field!"})
    }
  req.body.id = parseInt(req.body.id)
  if(!level) return res.status(400).json({error: config["400"], message: "Plese input a valid level name in the 'level' field!"})
  let record = level.list[req.body.id]
  if(!record) return res.status(400).json({error: config["400"], message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}\n`
    }
  }
  data.new = record
  level.list.splice(req.body.id, 1)
  level.list.splice(req.body.id, 0, record)
  if(req.body.id != req.body.pos-1) {
    if(req.body.id > req.body.pos-1) {
    level.list.splice(req.body.pos-1, 0, record)
    level.list.splice(req.body.id+1, 1)
  } else {
    level.list.splice(req.body.pos, 0, record)
   level.list.splice(req.body.id, 1) 
  }
    message += `pos: ${req.body.pos}`
  }
  await level.save()
  webhook(message, null, {
    event: "RECORD_EDIT",
    data
  })
  res.sendStatus(204)
})

  router.patch("/records/prog", async (req, res) => {
    let data = {}
  let level = await levelsSchema.findOne({name: req.body.level})
  if(!level) return res.status(400).json({error: config["400"], message: "Plese input a valid level name!"})
    try {
      parseInt(req.body.id)
    } catch(_) {
      return res.status(400).json({error: config["400"], message: "Plese input a valid record ID for the 'id' field!"})
    }
  req.body.id = parseInt(req.body.id)
  let record = level.progresses?.[req.body.id]
  if(!record) return res.status(400).json({error: config["400"], message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}`
    }
  }
  data.new = record
  level.progresses.splice(req.params.id, 1)
  level.progresses.splice(req.params.id, 0, record)
  webhook(message, null, {
    event: "RECORD_DELETE",
    data
  })
  await level.save()
  res.sendStatus(204)
})

  router.route("/sheets")
.delete(async (req, res) => {
  if(!req.body.name) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  let everything = await opinionSchema.findById(req.body.name)
  if(!everything) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  await opinionSchema.findByIdAndDelete(req.body.name)
  webhook(`The level sheet ${req.body.name} has been deleted.`, null, {
    event: "LEVEL_SHEET_DELETE",
    data: {
      name: req.body.name
    }
  })
  res.sendStatus(203)
})
  .put(async (req, res) => {
    if(!req.body.name) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  let everything = await opinionSchema.findById(req.body.name)
  if(!everything) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
    let obj = {tag: "", above: {level: "", index: ""}, below: {level: "", index: ""}, range: ""}
  everything.opinions.push(obj)
  await everything.save()
  res.status(201).json(obj)
})
  .post(async (req, res) => {
    if(!req.body.name) return res.status(400).json({error: config["400"], message: "Please input a 'name' value for this request!"})
  let everything = await opinionSchema.findById(req.body.name)
  if(!everything) {
    let item = await opinionSchema.create({_id: req.body.name, opinions: []})
     webhook(`A new level sheet by the name ${req.body.name} has been added`, null, {
     event: "LEVEL_SHEET_ADD",
     data: {
       name: req.body.name
     }
   })
    return res.status(201).json(item)
  }
 return res.status(200).json(everything)
})

  router.route("/sheets/opinion")
  .patch(async (req, res) => {
    if(!req.body.name || !req.body.outlier || !req.body.above || !req.body.below) return res.status(400).json({error: config["400"], message: "Please input all the following values: name, outlier, above, and below"})
  let everything = await opinionSchema.findById(req.body.name)
  if(!everything) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  let index = everything.opinions.findIndex(e => e._id.toString() == req.body.id)
  if(index == -1) return res.status(400).json({error: config["400"], message: "Please input a valid Object ID!"})
  let everylevel = await levelsSchema.find().sort({position: 1})
  function findsmt(lev) {
            return everylevel.findIndex(e => e.name.toLowerCase() == lev.toLowerCase()) != -1 ? everylevel.findIndex(e => e.name.toLowerCase() == lev.toLowerCase())+1 : "???"
        }
  req.body.above = {
    level: req.body.above,
    index: findsmt(req.body.above || "Sonic Wave")
  }
  req.body.below = {
    level: req.body.below,
    index: findsmt(req.body.below || "Sonic Wave")
  }
  req.body.range = `${req.body.below.index}-${req.body.above.index}`
  req.body.outlier = JSON.parse(req.body.outlier)
  everything.opinions[index] = req.body
  await everything.save()
  res.sendStatus(204)
})
  .delete(async (req, res) => {
  if(!req.body.name || !req.body.id) return res.status(400).json({error: config["400"], message: "Please input the fields 'name' and 'id'!"})
  let everything = await opinionSchema.findById(req.body.name)
  if(!everything) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  let index = everything.opinions.findIndex(e => e._id == req.body.id)
  if(index == -1) return res.status(400).json({error: "400 Bad Request", message: "Please input a valid Object ID!"})
  everything.opinions.splice(index, 1)
  await everything.save()
  res.sendStatus(201)
})

  router.route("/levels")
  .patch(async (req, res) => {
  let data = {}
  let level = await levelsSchema.findOne({name: req.body.name})
  if(!level) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  data.old = level
  let message = `The following info on the level ${level.name} has been changed:\n`
   for(const key in req.body) {
     level[key] = req.body[key]
     if(key != "position") {
     message += `${key}: ${req.body[key]}\n`
     }
   }
  await level.save()
  data.new = level
    data.position = {
      old: req.body.placement,
      new: level.position
    }
  if(req.body.placement != level.position) {
    req.body.placement = parseInt(req.body.placement)
    var everything = await levelsSchema.find().sort({position: 1})
    var index = everything.findIndex(e => e._id == level._id.toString())
    if(req.body.placement == 0 || req.body.placement > everything.length) return res.status(400).json({error: config["400"], message: `Please input a valid placement between 1 and ${everything.length+1}!`})
    let newlev = new levelsSchema(everything[index])
    let add = index+1 > req.body.placement ? 1 : 0
    newlev.position = req.body.placement-add
    await levelsSchema.findByIdAndDelete(everything[index]._id)
   await levelsSchema.insertMany([newlev])
    message += `placement: #${index+1} to #${req.body.placement}`
    // Fix these algs later
    let start = index+1 > req.body.placement ? req.body.placement-1 : index
    let end = req.body.placement
    everything = await levelsSchema.find().sort({position: 1})
    for(let i = 0; i < everything.length; i++) {
      await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
        $set: {
          position: i+1
        }
      })
    }
  }
  webhook(message, null, {
    event: "LEVEL_EDIT",
    data
  })
  res.status(200).send(level)
})

  router.route("/submissions/mod")
  .patch(async (req, res) => {
  if(!req.body.id) return res.status(400).json({error: config["400"], message: `Please input an 'id' value in your body!`})
  try {
    await submitSchema.findById(req.body.id)
  } catch(_) {
     return res.status(400).json({error: config["400"], message: "Please input a valid submission ID!"})
  }
let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let {name} = await loginSchema.findById(id)
  for(const key in req.body) {
    req.body[key] = req.body[key].toString()
  }

if(req.body.video) {
  try {
    new URL(req.body.video)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Please input a valid video URL!"})
  }
}
  req.body.edited = dayjs(Date.now()).format("MMMM D, YYYY h:mm:ss A")
  let dupe = await submitSchema.findOne({video: req.body.video?.trim()})
  if(dupe && hasSubmitted._id.toString() != req.body.id) return res.status(400).json({error: config["400"], message: "The link you inputted is already in this database, so can you PLEASE be patient? Thanks :)"})
  let hasSubmitted = await submitSchema.findOne({demon: {$regex: new RegExp(`\\b${req.body.demon}\\b`, 'i')}, username: {$regex: new RegExp(`\\b${req.body.username}\\b`, 'i')}, progress: req.body.progress})
  if(hasSubmitted && hasSubmitted._id.toString() != req.body.id) return res.status(400).json({error: config["400"], message: "You have already submitted a record for this level! If you have any questions about your record, please contact the staff team."})

    let submission = await submitSchema.findById(req.body.id)
    let data = {
      username: submission.username,
      demon: submission.demon,
      progress: submission.progress,
      hertz: submission.hertz,
      video: submission.video,
      comments: submission.comments,
      old: submission.status,
      status: req.body.status
    }
if(submission.status != req.body.status) {
    if(req.body.status == "accepted") {
        try {
         let exists = await messageSchema.findOne({users: [submission.account, name]}) 
          if(!exists) {
           let makeNew = await request("https://gdlrrlist.com/api/v1/client/dm", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': req.headers.authorization
        },
        body: JSON.stringify({
          users: [submission.account],
          name: "Record Information"
        })
      })
            exists = await makeNew.body.json()
          }
   let alr = await request("https://gdlrrlist.com/api/v1/client/messages", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': req.headers.authorization
        },
        body: JSON.stringify({
          message: `Your submission has been accepted by the LRR List Moderators! Submission: ${submission.demon} ${submission.progress}%`,
          id: exists._id.toString()
        })
      })
      if(alr.statusCode == 429) {
         return res.status(429).send({error: config["429"][0], message: config["429"][1]})
       }
    } catch(_) {
  }
    } else if(req.body.status == "denied") {
     try {
       let exists = await messageSchema.findOne({users: [submission.account, name]}) 
          if(!exists) {
            let request = await request("https://gdlrrlist.com/api/v1/client/dm", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': req.headers.authorization
        },
        body: JSON.stringify({
          users: [submission.account],
          name: "Record Information"
        })
      })
            exists = await makeNew.body.json()
          }
        let alr = await request("https://gdlrrlist.com/api/v1/client/messages", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          authorization: req.headers.authorization
        },
        body: JSON.stringify({
          message: `Your submission (${submission.demon} ${submission.progress}%) has been rejected by the LRR List Moderators. If you have questions about why your record was denied, please DM me.`,
          id: exists._id.toString()
        })
      })
       if(alr.statusCode == 429) {
         return res.status(429).send({error: config["429"][0], message: config["429"][1]})
       }
     } catch(_) {
     }
    }
  webhook(`A submission has been ${req.body.status}!`, [{description: `A submission by ${submission.username} has been ${req.body.status}. (submission: [${submission.demon} ${submission.progress}% on ${submission.hertz}](${submission.video}), comments: ${submission.comments || "none"})`}], {
    event: "STATUS_UPDATE",
    data
  })
}

    for(const key in req.body) {
      if(req.body[key] && key != "_id") {
        submission[key] = req.body[key]
      }
    }
    await submission.save()
    
    return res.json(submission)
})

  router.route("/records")
  .put(validFields({name: "demon", type: String, description: "The name of the demon the person got progress on / beat."}, {name: "username", type: String, description: "The name of the player"}, {name: "hertz", type: String, description: "refresh rate of the player"}, {name: "progress", type: Number, description: "what % the player got on the level"}, {name: "video", type: "URL", description: "The progress / completion video."}, {name: "id", type: String, body_type: "query", description: "", optional: true}), async (req, res) => {
    let arrayType = "levels"
  var level = await sixtyoneSchema.findOne({name: req.body.demon})
      if(level) {
        arrayType = "sixtyOneHertz"
        if(req.body.progress != 100) return res.status(400).json({error: config["400"], message: "The percentage must be 100%, as this is a 61hz+ level!"})
        if(parseInt(req.body.hertz) < 61) return res.status(400).json({error: config["400"], message: "The hertz must be at least 61, as this is a 61hz+ level!"})
      } else {
        level = await levelsSchema.findOne({name: req.body.demon})
      }
  var user = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!level) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
  if(!user) {
   user = await leaderboardSchema.create({name: req.body.username.trim(), levels: [], progs: ["none"]})
  }


    var obj = {
      name: req.body.username.trim(),
      link: req.body.video.trim(),
      hertz: req.body.hertz.trim()
    }
    try {
      new URL(obj.link)
    } catch(_) {
      res.status(400).json({error: config["400"], message: "Please input a valid video URL!"}) 
    }
  if(obj.hertz.toLowerCase() == "mobile") return res.status(400).json({error: config["400"], message: "Did you mean to input 'M'? lol!"}) 
  if(req.body.progress < 100) {
    var everything = await levelsSchema.find().sort({position: 1})
    if(everything.findIndex(e => e.name == level.name) > 74) return res.status(400).json({error: config["400"], message: "This level does not have a listpercent!"})
    obj.percent = req.body.progress
    level.progresses = level.progresses.filter(e => e.name != obj.name)
    if(level.progresses[0] != "none") {
      await level.progresses.push(obj)
    } else {
      level.progresses[0] = obj
    }
    await level.save()
    user.progs = user.progs.filter(e => e.name != level.name)
    if(user.progs[0]) {
      if(user.progs[0] != "none") {
        user.progs.push({name: level.name, percent: obj.percent})
      } else {
        user.progs[0] = {name: level.name, percent: obj.percent}
      }
    } else {
        user.progs.push({name: level.name, percent: obj.percent})
    }
    await user.save()
  } else if(req.body.progress == 100) {
    if(level.list[0] != "none") {
       level.list.push(obj)
    } else {
      level.list[0] = obj
    }
    level.progresses = level.progresses.filter(e => e?.name != obj.name)
    if(!level.progresses[0]) {
      level.progresses[0] == "none"
    }
    await level.save()
    if(user[arrayType][0]) {
      if(user[arrayType][0] != "none") {
        user[arrayType].push(level.name)
      } else {
        user[arrayType][0] = level.name
      }
    } else {
        user[arrayType].push(level.name)
    }
    user.progs = user.progs.filter(e => e.name != level.name)
    if(!user.progs[0]) {
      user.progs[0] == "none"
    }
    await user.save()
  } else {
    return res.status(400).json({error: config["400"], message: "Percentage out of range."})
  }
  webhook(`A completion / progress has been added on the level ${level.name}. (submission: [${req.body.progress}% by ${obj.name} on ${obj.hertz}](${obj.link}))`, null, {
    event: "RECORD_ADD",
    data: {
      name: obj.name,
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: obj.link,
      hertz: obj.hertz
    }
  })
  if(req.body.record) {
    try {
      let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let {name} = await loginSchema.findById(id)
      let something = await submitSchema.findById(req.body.record)
  if(something) {
   await request("https://gdlrrlist.com/api/helper/submissions/mod", {
        method: "PATCH",
        headers: {
          'content-type': 'application/json',
          'authorization': req.headers.authorization
        },
        body: JSON.stringify({
          id: something._id.toString(),
          status: "accepted"
        })
      })
  }
    } catch(_) {
      
    }
  }
  return res.status(201).json({
      name: obj.name,
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: obj.link,
      hertz: obj.hertz
    })
})
  .delete(validFields({name: "username", type: String, description: "The name of the player who holds this record."}, {name: "demon", type: String, description: "The name of the level you want to remove this record from."}, {name: "progress", type: Number, description: "The progress the player got on this level."}), async (req, res) => {
  let message;
  let arrayType = "levels";
  var level = await sixtyoneSchema.findOne({name: req.body.demon})
      if(level) {
        arrayType = "sixtyOneHertz"
        if(req.body.progress != 100) return res.status(400).json({error: config["400"], message: "The percentage must be 100%, as this is a 61hz+ level!"})
      } else {
        level = await levelsSchema.findOne({name: req.body.demon})
      }
  if(!level) return res.status(400).json({error: config["400"], message: "Please input a valid level name!"})
    let dataTwo = {
      name: req.body.username.trim(),
      level: req.body.demon.trim(),
      progress: req.body.progress
    }
  if(req.body.progress < 100) {
    let record = level.progresses.findIndex(e => e.name == req.body.username.trim() && e.percent == req.body.progress)
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(record == -1) res.status(400).json({error: config["400"], message: "This record does not exist!"})
    dataTwo.link = level.progresses[record]?.link
    dataTwo.hertz = level.progresses[record]?.hertz
    message = `A progess on the level ${level?.name} by [${player?.name}](${level?.progresses?.[record]?.link}) has been deleted. (Progress: ${level?.progresses?.[record]?.percent}%)`
    level.progresses = level.progresses.filter(e => e.name != req.body.username.trim() || e.percent != req.body.progress)
    if(level.progresses.length == 0) {
      level.progresses = ["none"]
    }
    if(!player) return res.status(400).json({error: config["400"], message: "Please input a valid player name!"})
    player.progs = player.progs.filter(e => e.name != level.name || e.percent != req.body.progress)
    if(player.progs.length == 0) {
      player.progs = ["none"]
    }
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length + player.sixtyOneHertz.length == 0 || !player.levels[0] && !player.sixtyOneHertz[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  } else if(req.body.progress == 100) {
    let record = level.list.findIndex(e => e.name == req.body.username.trim())
    if(record == -1) res.status(400).json({error: config["400"], message: "This record doesn't exist!"})
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!player) return res.status(400).json({error: config["400"], message: "Please input a valid player name!"})
    dataTwo.link = level.list[record]?.link
    dataTwo.hertz = level.list[record]?.hertz
    message = `A completion of the level ${level?.name} by [${player?.name}](${level?.list?.[record]?.link}) has been deleted. `
    level.list = level.list.filter(e => e.name != req.body.username.trim())
    if(level.list.length == 0) {
      level.list = ["none"]
    }
    player[arrayType] = player[arrayType].filter(e => e != level.name)
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length + player.sixtyOneHertz.length == 0 || !player.levels[0] && !player.sixtyOneHertz[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  }
  webhook(message, null, {
    event: "RECORD_DELETE",
    data: dataTwo
  })
  return res.sendStatus(203)
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
          name: player.name
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
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.helper[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.helper[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}