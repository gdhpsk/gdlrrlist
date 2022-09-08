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
let arr_of_yt_ids = []


  let all_pointer_demons = []
    let count = 0
while(true) {
  let level_i = await request(`https://pointercrate.com/api/v2/demons/listed?limit=100&after=${count*100}`)  
  let levels = await level_i.body.json()
  all_pointer_demons.push(...levels)
  if(levels.length != 100) break
  count++
}
  
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
    
let level_id = all_pointer_demons.find(e => e.name == g.name)
if(level_id) {
  g.pointercrateID = level_id.id
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
  arr_of_yt_ids.push(reg.exec(recordarr[x].link)[1])
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

  let count2 = 0
  let arr_of_yt_results = []
  while(true) {
    let daafast = await request(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${arr_of_yt_ids.slice(count2, count2+50)}&key=${process.env.ytkey}`)
    let datafast = await daafast.body.json()
    arr_of_yt_results.push(...datafast.items)
    if(arr_of_yt_ids.slice(count2, count2+50).length != 50) break;
    count2 += 50
  }
  Object.values(obj).forEach(item => {
    item.records.forEach(e => {
      try {
      let data = arr_of_yt_results.find(o => o.id == reg.exec(e.link)[1])
      
      if(!data) {
    e.uploadDate = dayjs().format("M/D/YYYY")
  } else {
    e.uploadDate = dayjs(Date.parse(data.snippet.publishedAt)).format("M/D/YYYY")
  }
        } catch(_) {
        
      }
    })
  })

  res.json(obj)
})

router.get("/MLL", async (req, res) => {
  let list = await request("https://gdlrrlist.com/api/v1/demons/ML")
  let array = await list.body.json()
  let obj = {}
  for(let item of array) {
    for(let record of item.records) {
      if(!obj[record.name]) {
        obj[record.name] = {
          levels: [
            {
              name: item.name,
              hertz: record.hertz,
              link: record.link
            }
          ]
        }
      } else {
        obj[record.name].levels.push({
              name: item.name,
              hertz: record.hertz,
              link: record.link
            })
      }
    }
  }
  res.json(obj)
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