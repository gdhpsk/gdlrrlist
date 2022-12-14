const config = require("./config")

exports.validFields = (...args) => {
    let type = (arg) => arg == "URL" ? "URL" : typeof arg
    function validator(req, res, next) {
      if(Object.keys(req.query).length != 0) {
        try {
          req.query = Object.fromEntries(Object.entries(req.query).map(e => ["true", "false"].includes(e[1]) ? [e[0], JSON.parse(e[1])] : !isNaN(e[1]) ? [e[0], parseInt(e[1])] : e))
          //console.log(obj)
        } catch(e) {
          //console.log(e)
        }
      }
      if(Object.keys(req.params).length != 0) {
        try {
          req.params = Object.fromEntries(Object.entries(req.params).map(e => ["true", "false"].includes(e[1]) ? [e[0], JSON.parse(e[1])] : !isNaN(e[1]) ? [e[0], parseInt(e[1])] : e))
          //console.log(obj)
        } catch(e) {
          //console.log(e)
        }
      }
      let obj = {
        ...req.params ?? {},
        ...req.query ?? {},
        ...req.body ?? {}
      }
    let errors = []
    obj = Object.entries(obj).filter(e => !args.find(e => e.name == e[0]))
      obj = Object.fromEntries(obj)
    let object = Object.fromEntries(args.map(k => {
      if(k.type == Array) {
          if(!Array.isArray(obj[k.name])) return [k.name, obj[k.name] === undefined && k.optional ? "" : obj[k.name] == undefined ? undefined : null]
        if(k.args) {
          obj[k.name] = obj[k.name].filter(e => k.args.includes(e))
          req.body[k.name] = obj[k.name]
        }
          return [k.name, obj[k.name]]
        }
        if(k.type == 'URL') {
          k.type = () => "URL"
          try {
            new URL(obj[k.name])
            return [k.name, obj[k.name]]
          } catch(_) {
            
            return [k.name, obj[k.name] === undefined && k.optional ? "" : obj[k.name] == undefined ? undefined : null]
          }
        }
        if(k.type == Number) {
          obj[k.name] = isNaN(obj[k.name]) ? obj[k.name] : parseInt(obj[k.name])
        }
        if(typeof obj[k.name] === typeof k.type()) return [k.name, obj[k.name]]
    
        if(obj[k.name] === undefined && !k.optional) return [k.name, undefined]
        if(k.optional && obj[k.name] !== undefined) return [k.name, null]
        if(k.optional) return [k.name, ""]
          return [k.name, null]
        }))
    if(Object.values(object).includes(undefined)) {
        let all = Object.entries(object).filter(e => e[1] === undefined)
        all = args.filter(e => all.find(x => x[0] == e.name))
        all.forEach(e => {
            errors.push(`Field '${e.name}' type '${type(e.type())}' missing.`)
        })
    }
    if(Object.values(object).includes(null)) {
        let all = Object.entries(object).filter(e => e[1] === null)
        all = args.filter(e => all.find(x => x[0] == e.name))
        all.forEach(e => {
            errors.push(`Please input type '${type(e.type())}' for property value '${e.name}'!`)
        })
    }
      if(errors.length != 0) return res.status(400).send({error: "400 BAD REQUEST", message: errors.join(" ")})
    return next()
    }
  try {
    validator.functionArgs = args.map(item => item = [item.name, {name: item.name, type: typeof item.type == "string" ? "URL" : item.type() == "URL" ? "URL" : (typeof item.type()).toUpperCase(), description: item.description, optional: !!item.optional, body_type: item.body_type}])
  } catch(_) {
    
  }
    return validator
}
