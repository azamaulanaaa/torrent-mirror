const express = require('express')
const app = express()
const port = process.env.PORT || 3000
import Mirror from './mirror'
import Zippy from './mirror/hosting/zippy'

let mirror, results = {}, stats = {}
app.use(express.json()) 

function error(status, msg) {
    return new class extends Error{
        status : number
        constructor(status, message){
            super(message)
            this.status = status
        }
    }(status, msg)
}

app.use('/api', function(req, res, next){
    var key = req.query['api-key']
    if (!key) return next(error(400, 'api key required'))
    if (!~apiKeys.indexOf(key)) return next(error(401, 'invalid api key'))
    req.key = key
    next()
})

var apiKeys = ['foo', 'bar', 'baz']

app.post('/api/torrent/start', (req, res, next) =>{
    if(!req.body.uri)
        next()

    mirror.add(req.body.uri, new Zippy(), (result, hash) =>{
        results[hash] = result
        stats[hash] = {status : 'finish'}
    },(stat, hash) =>{
        stats[hash] = {status : 'mirror', statistic : stat}
    }).then((hash)=> {
        stats[hash] = {status : 'prepare'}
        res.send({hash : hash})
    })
})

app.get('/api/torrent/status', (req, res, next) =>{
    if(!req.query.hash)
        next()

    let stat = stats[req.query.hash]
    res.send(stat)
})

app.get('/api/torrent/result', (req, res, next) =>{
    if(!req.query.hash)
        next()

    let result = results[req.query.hash] || []
    res.send(result)
})


app.use(function(err, req, res, next){
    res.status(err.status || 500)
    res.send({ error: err.message })
})

app.use(function(req, res){
    res.status(404)
    res.send({ error: "Lame, can't find that" })
})

app.listen(port, ()=>{
    mirror = new Mirror()
    console.log(`listening at http://localhost:${port}`)
})