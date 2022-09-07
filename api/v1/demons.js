const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const {request} = require("undici")
const { JSDOM } = require("jsdom");
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
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

router.get("/ML", async (req, res) => {
  let ok = await request("https://sites.google.com/view/gd-mobile-lists/top-100-demons-completed")
  let html = await ok.body.text()
  const dom = new JSDOM(html);
  let obj = []
  for(let j = 2; j < dom.window.document.getElementsByClassName("oKdM2c Kzv0Me").length; j++) {
    let txt = ""
  let level = dom.window.document.getElementsByClassName("oKdM2c Kzv0Me")[j].getElementsByClassName("CDt4Ke zfr3Q").item(0)
  for(let i = 0; i < level.getElementsByTagName("span").length; i++) {
    let item = level.getElementsByTagName("span").item(i)
    txt += item.innerHTML
  }
 txt = JSDOM.fragment(txt).textContent.split("(~")[0]
let g = {}
g.name = txt.split(`"`)[1].trim()
let level_i = await request(`https://pointercrate.com/api/v2/demons/?name=${g.name}`)
let level_id = await level_i.body.json()
if(level_id.length != 0) {
  g.pointercrateID = level_id[0].id
}
g.creators =  {
  host: txt.split("(")[0].split("by")[1].trim()
}
let recordarr = []
let records = dom.window.document.getElementsByClassName("tyJCtd mGzaTb baZpAe")[(j*2)-1].getElementsByClassName("CDt4Ke zfr3Q")
for(let x = 0; x < records.length; x++) {
  let parts = JSDOM.fragment(records.item(x).innerHTML).textContent.trim().split(" ").filter(e => e != "")
  let name = parts.filter(e => !e.toLowerCase().startsWith("https://") && e != "-" && !e.toLowerCase().includes("hz)") && !e.toLowerCase().includes("youtu.be")).reduce(
    (previousValue, currentValue) => previousValue + " " + currentValue
  ).replace("-", "").trim()
  recordarr.push({
    name,
    link: parts.find(e => e.toLowerCase().includes("youtu") || e.toLowerCase().startsWith("https://"))
  })
  let daa = await request(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${reg.exec(recordarr[x].link)}&key=${process.env.ytkey}`)
  let data = await daa.body.json()
  if(data.items.length == 0) {
    recordarr[x].uploadDate = dayjs().format("M/D/YYYY")
  } else {
    recordarr[x].uploadDate = dayjs(Date.parse(data.items[0].snippet.publishedAt)).format("M/D/YYYY")
  }
  if(!recordarr[x].link.startsWith("https://")) {
    recordarr[x].link = `https://${recordarr[x].link}`
  }
  if(parts.find(e => e.toLowerCase().includes("hz)"))) {
    recordarr[x].hertz =  parseInt(parts.find(e => e.toLowerCase().includes("hz)")).replace("(", ""))
  } else {
    recordarr[x].hertz = 60
  }
}
g.records = recordarr
obj.push(g)
}
  res.json(obj)
// fs.writeFile("./smt.json", JSON.stringify(obj), function(e, d) {

// })
})

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