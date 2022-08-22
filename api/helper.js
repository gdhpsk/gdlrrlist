const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../schemas/opinions.js")
const levelsSchema = require("../schemas/levels.js")
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
    return res.status(201).send(item)
  }
 return res.status(200).send(everything)
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
}

    for(const key in req.body) {
      if(req.body[key]) {
        submission[key] = req.body[key]
      }
    }
    await submission.save()
    return res.json(submission)
})
  
  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}