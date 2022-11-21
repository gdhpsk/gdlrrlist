const fs = require("fs")
const config = require("./config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const loginSchema = require("../schemas/logins")
const rateLimit = require("express-rate-limit")
const rateLimitSchema = require("../schemas/rate_limit")
const bcrypt = require("bcrypt")
const apiVersions = fs.readdirSync("./api").filter(e => !e.includes("."))
module.exports = (authFunction, webhook, send) => {
  
  const express = require("express")
const router = express.Router()

router.use(express.urlencoded({ extended: true }))
router.use(async (req, res, next) => {
    let path = req.url.split("/")?.[1]
 if(["mods", "leader", "helper", "spectator", "v1"].includes(path)) return next()
  let correct_auth = await authFunction(req, res)
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][0]})
  }
  next()
})

  const ip = (req) => (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(",")[0]

router.use(async (req, res, next) => {
  let rateLimits = await rateLimitSchema.find()
  let isRateLimited = await rateLimits.find(async e => {
    let bool = await bcrypt.compare(req.headers.authorization?.split(" ")?.[1] ?? ip(req), e.token)
    return bool
  })
  if(!!isRateLimited) {
    if(isRateLimited.expire <= Date.now()) {
      try {
        await rateLimitSchema.findByIdAndDelete(isRateLimited._id.toString())
      } catch(_) {
        
      }
      return next()
    } else {
      return res.status(429).send({error: config["429"][0], message: config["429"][1]})
    }
  } else {
   return next()
  }
})

const rate_limit_func = (ms, max_requests) => rateLimit({
	windowMs: ms,
	max: max_requests,
	message: {error: config["429"][0], message: config["429"][1]},
  keyGenerator: (request, response) => request.headers.authorization?.split(" ")?.[1] ?? ip(request),
  handler: async (request, response, next, options) => {
    try {
      let {id} = jwt.verify(request.headers?.authorization?.split(" ")[1], process.env.WEB_TOKEN)
      let {name} = await loginSchema.findById(id)
      let authLevel = {
        "user": 0,
        "spectator": 1,
        "helper": 2,
        "moderator": 3,
        "leader": 4
      }
      let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == name && authLevel[e.tag] > 1)
      
      if(allowed) {
        next()
      } else {
        throw new Error("")
      }
    } catch(_) {
    let hashedToken = await bcrypt.hash(request.headers?.authorization?.split(" ")[1] ?? ip(request), 10)
    await rateLimitSchema.create({
      path: request.url.split("?")[0],
      token: hashedToken,
      expire: response.getHeader("x-ratelimit-reset")*1000
    })
		return response.status(429).send(options.message)
    }
  },
	standardHeaders: true,
	legacyHeaders: true,
})

  router.use("/leader", require("./leader")(authFunction, webhook, rate_limit_func))
  router.use("/mods", require("./mods")(authFunction, webhook, rate_limit_func))
  router.use("/helper", require("./helper")(authFunction, webhook, rate_limit_func))
  router.use("/spectator", require("./spectator")(authFunction, webhook, rate_limit_func));

     for(const key of apiVersions) {
    const apiVersion = fs.readdirSync(`./api/${key}`).filter(file => file.endsWith(".js"));
    for(let key2 of apiVersion) {
      key2 = key2.split(".")[0]
      let file = require(`./${key}/${key2}`)
      router.use(`/${key}/${key2}`, file(authFunction, webhook, rate_limit_func, send))
    }
  }
  router.all("*", (req, res) => {
    return res.status(404).json({error: config["404"][0], message: config["404"][1]})
  })
async function upsertFile(name, data, appendNewTable) {
  try {
    await fs.promises.readFile(name)
  } catch (error) {
    await fs.promises.writeFile(name, data, (err, data) => {
      if(err) return console.log(err)
    })
  }
}
let tableMaker = (json) => {
  let txt = "<table>"
txt += `<tr><th>Name</th><th>Type</th><th>Description</th><th>Optional</th></tr>`
  Object.values(json).forEach(e => txt += `<tr><td>${e.name}</td><td>${e.type}</td><td>${e.description}</td><td>${!!e.optional}</td></tr>`)
  txt += "</table>"
  return txt
}
  
  for(const key in config.documentation) {
    for(const item in config.documentation[key]) {
      if(key == "v1") {
         for(const v1items in config.documentation[key][item]) {
          let txt = "<%- tableMaker %>"
           for(const vals in config.documentation[key][item][v1items]) {
          let exists = config.documentation[key][item][v1items][vals].body_type
          if(!exists) {
            config.documentation[key][item][v1items][vals].body_type = v1items.split(" ")[0] == "GET" ? "query" : "body"
          }
        }
           if(config.documentation[key][item][v1items].require_perm) {
             txt += `
<p>Requires at least a "User" token to use.</p>`
             delete config.documentation[key][item][v1items].require_perm
           }
  upsertFile(`./documentation/api/${key}/${item}/${v1items.replace(" /", "-").replace(/[/]/g, "-").replace(/[:]/g, "=")}.ejs`, txt, process.env.makeTable)
         }
      } else {
        for(const vals in config.documentation[key][item]) {
          let exists = config.documentation[key][item][vals].body_type
          if(!exists) {
            config.documentation[key][item][vals].body_type = item.split(" ")[0] == "GET" ? "query" : "body"
          }
        }
        upsertFile(`./documentation/api/${key}/${item.replace(" /", "-").replace(/[/]/g, "-").replace(/[:]/g, "=")}.ejs`, "<%- tableMaker %>", process.env.makeTable)
      }
    }
  }
  
  return router
}