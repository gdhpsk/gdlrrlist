const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../schemas/opinions.js")
const levelsSchema = require("../schemas/levels.js")
const leaderboardSchema = require("../schemas/leaderboard.js")
let routes = {}
const dayjs = require("dayjs")
const submitSchema = require("../schemas/submissions.js")
const {request} = require("undici")

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
  if(req.body.placement != level.position) {
    req.body.placement = parseInt(req.body.placement)
    var everything = await levelsSchema.find().sort({position: 1})
    var index = everything.findIndex(e => e._id == level._id.toString())
    if(req.body.placement == 0 || req.body.placement > everything.length) return res.status(400).json({error: config["400"], message: `Please input a valid placement between 1 and ${everything.length+1}!`})
    everything[index].position = req.body.placement
    await everything[index].save()
    message += `placement: #${index+1} to #${req.body.placement}`
    let start = index+1 > req.body.placement ? req.body.placement-1 : index
    let end = index+1 < req.body.placement ? index+1 : req.body.placement
    for(let i = start; i < end; i++) {
      await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
        $set: {
          position: i+2
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

  if(!req.body.id) return res.status(400).json({error: config["400"], message: `Please input a 'id' value in your body!`})
  try {
    await submitSchema.findById(req.body.id)
  } catch(_) {
     return res.status(400).json({error: config["400"], message: "Please input a valid submission ID!"})
  }

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
      old: submission.status,
      status: req.body.status
    }
if(submission.status != req.body.status) {
    if(req.body.status == "accepted") {
        try {
   let alr = await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': req.headers.authorization
        },
        body: JSON.stringify({
          subject: `Information about your ${submission.demon} ${submission.progress}% submission`,
          message: `Your submission has been accepted by the LRR List Moderators! Submission: ${submission.demon} ${submission.progress}%`,
          to: submission.account
        })
      })
      if(alr.statusCode == 429) {
         return res.status(429).send({error: config["429"][0], message: config["429"][1]})
       }
    } catch(_) {
    
  }
    } else if(req.body.status == "denied") {
     try {
        let alr = await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          authorization: req.headers.authorization
        },
        body: JSON.stringify({
          subject: `Information about your ${submission.demon} ${submission.progress}% submission`,
          message: `Your submission (${submission.demon} ${submission.progress}%) has been rejected by the LRR List Moderators. If you have questions about why your record was denied, please email me.`,
          to: submission.account
        })
      })
       if(alr.statusCode == 429) {
         return res.status(429).send({error: config["429"][0], message: config["429"][1]})
       }
     } catch(_) {
       
     }
    }
  webhook(`A submissions status has been ${req.body.status}!`, [{description: `A submission by ${submission.username} has been ${submission.status}. (submission: [${submission.demon} ${submission.progress}% on ${submission.hertz}](${submission.video}), comments: ${submission.comments || "none"})`}], {
    event: "STATUS_UPDATE",
    data
  })
}

    for(const key in req.body) {
      if(req.body[key]) {
        submission[key] = req.body[key]
      }
    }
    await submission.save()
    
    return res.json(submission)
})

  router.route("/records")
  .put(async (req, res) => {
    if(!req.body.demon || !req.body.username || !req.body.hertz || !req.body.progress || !req.body.video) return res.status(400).json({error: config["400"], message: "Please input ALL the following arguments: 'demon', 'username', 'hertz', 'progress', and 'video'."})
  var level = await levelsSchema.findOne({name: req.body.demon})
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
    if(user.levels[0]) {
      if(user.levels[0] != "none") {
        user.levels.push(level.name)
      } else {
        user.levels[0] = level.name
      }
    } else {
        user.levels.push(level.name)
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
  if(req.query.record) {
    try {
      let something = await submitSchema.findById(req.query.record)
  if(something) {
  webhook("A submission has been archived!", [{description: `A submission by ${something.username} has been archived. (submission: [${something.demon} ${something.progress}% on ${something.hertz}](${something.video}), comments: ${something.comments || "none"})`}], {
    event: "SUBMISSION_ARCHIVE",
    data: something
  })
  something.status = "accepted"
    await something.save()

      await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': `User ${getCookie("token", req)}`
        },
        body: JSON.stringify({
          subject: `Information about your ${something.demon} ${something.progress}% submission`,
          message: `Your submission has been accepted by the LRR List Moderators! Submission: ${something.demon} ${something.progress}%`,
          to: something.account
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
  .delete(async (req, res) => {
  let message;
  let level = await levelsSchema.findOne({name: req.body.demon.trim()})
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
    
    message = `A progess of the level ${level.name} by [${player.name}](${level.progresses[record].link}) has been deleted. (Progress: ${level.progresses[record].percent}%)`
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
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  } else if(req.body.progress == 100) {
    let record = level.list.findIndex(e => e.name == req.body.username.trim())
    if(record == -1) res.status(400).json({error: config["400"], message: "This record doesn't exist!"})
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!player) return res.status(400).json({error: config["400"], message: "Please input a valid player name!"})
    message = `A completion of the level ${level.name} by [${player.name}](${level.list[record].link}) has been deleted. `
    level.list = level.list.filter(e => e.name != req.body.username.trim())
    if(level.list.length == 0) {
      level.list = ["none"]
    }
    player.levels = player.levels.filter(e => e != level.name)
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  }
  webhook(message, null, {
    event: "RECORD_DELETE",
    data: dataTwo
  })
  return res.sendStatus(203)
})
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}