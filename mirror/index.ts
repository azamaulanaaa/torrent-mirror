const WebTorrent = require('webtorrent')
import {ReadStream} from 'fs'
const FSChunkStore = require('fs-chunk-store')
const progress = require('progress-stream')

let prog = (size : number = 0, callback : Function) =>{
    return progress({time : 1000, length: size}, (stat) => {callback(stat)})
}

interface IMirrorResult{
    name : string
    uri : Array<string>
}

interface IMirrorStats{
    name : string
    stat : any
}

type TMirrorCallback = (result: Array<IMirrorResult>) => void
type TMirrorProgress = (stats: Array<IMirrorStats>) => void

export default async function(sourceTorrent, hosting, callback : TMirrorCallback, progress : TMirrorProgress = ()=>{}){
    const downloadDir = './download/'
    let results : Array<IMirrorResult> = []
    let stats : Array<IMirrorStats> = []
    let torrentClient = new WebTorrent()
    let chunk
    
    torrentClient.on('torrent', function(torrent){
        console.log('Download : ' + torrent.name)
        let uploads = torrent.files.map(function(file){
            return new Promise(async resolve => {
                let result : IMirrorResult = {
                    name : file.name,
                    uri : []
                }

                let uploadFn = async (name:string, stream:ReadStream, length : number) =>{
                    let stat = {
                        name : name,
                        stat : null
                    }
                    stats.push(stat)
                    let statsIndex = stats.indexOf(stat)
                    await hosting.upload({
                        fs : stream
                        .pipe(prog(length, (stat)=>{
                            stats[statsIndex].stat = stat
                            progress(stats)
                        }))
                        ,fileName : stat.name
                    }).then(url => {
                        result.uri.push(url)
                    })
                }

                if(file.length > hosting.maxSize){
                    for(let i=0;i * hosting.maxSize < file.length;i++){
                        let startPos = i * hosting.maxSize
                        let remainingSize = file.length - startPos
                        let partSize = (hosting.maxSize < remainingSize) ? hosting.maxSize : remainingSize
                        let partName = file.name + '.' + ('000' + (i+1)).slice(-3)
                        await uploadFn(partName, file.createReadStream({
                            start : startPos,
                            end : startPos + partSize,
                        }), partSize)
                        
                    }
                }else{
                    let fileStream = file.createReadStream()
                    await uploadFn(file.name, fileStream, file.length)
                }
                resolve()
            })
        })
        Promise.all(uploads).then( function(){   
            torrentClient.destroy((err) =>{
                if (err) throw err
                chunk.destroy()
                callback(results)
            })         
        })
    })
    torrentClient.add(sourceTorrent, {
        store : function(chunkLength, storeOpts){
            chunk = new FSChunkStore(chunkLength, {
                path : downloadDir + storeOpts.torrent.infoHash,
                length : storeOpts.length
            })
            return chunk
        }
    })
}