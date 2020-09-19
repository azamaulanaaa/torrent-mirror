const WebTorrent = require('webtorrent')
import {ReadStream} from 'fs'
import { callbackify } from 'util'
const FSChunkStore = require('fs-chunk-store')
const progress = require('progress-stream')


interface IMirrorResult{
    name : string
    length : number
    uri : Array<{
        start : number
        end : number
        uri : string
    }>
}

interface IMirrorStats{
    name : string
    stat : any
}


export default class{
    torrentClient
    opt = {
        downloadDir : './download'
    }
    constructor(opt? : object){
        if(!opt) opt = {}
        // this.opt = Object.assign(this.opt, opt)
        this.torrentClient = new WebTorrent()
    }

    private prog(size : number = 0, callback : Function){
        return progress({time : 1000, length: size}, (stat) => {callback(stat)})
    }

    async add(sourceTorrent, hosting, callback? : (result: Array<IMirrorResult>, hash:string) => void, progress? : (stats: Array<IMirrorStats>, hash:string) => void){
        if(!callback) callback = ()=>{}
        if(!progress) progress = ()=>{}
        
        let infoHash : string
        let results : Array<IMirrorResult> = []
        let stats : Array<IMirrorStats> = []
        let chunk
        let chunkStore = (chunkLength: number, storeOpts) => {
            chunk = new FSChunkStore(chunkLength, {
                path : this.opt.downloadDir + '/' + storeOpts.torrent.infoHash,
                length : storeOpts.length
            })
            return chunk
        }
        let prog = this.prog
        
        await new Promise((resolve)=>{
            this.torrentClient.add(sourceTorrent, {
                    store : function(chuckLength, storeOpts){return chunkStore(chuckLength, storeOpts)}
                }, 
                function(torrent){
                    torrent.on('error', (err)=>{
                        console.log(err)
                    })
    
                    infoHash = torrent.infoHash
                    resolve()
                    console.log('Download : ' + infoHash)
                    let uploads = torrent.files.map(function(file){
                        return new Promise(async resolve => {
                            let result : IMirrorResult = {
                                name : file.name,
                                length : file.length,
                                uri : []
                            }
            
                            let uploadFn = async (name:string, stream:ReadStream, start : number, end : number) =>{
                                let stat = {
                                    name : name,
                                    stat : null
                                }
                                stats.push(stat)
                                let statsIndex = stats.indexOf(stat)
                                await hosting.upload({
                                    fs : stream
                                    .pipe(prog(end - start, (stat)=>{
                                        stats[statsIndex].stat = stat
                                        progress(stats, infoHash)
                                    }))
                                    ,fileName : stat.name
                                }).then(url => {
                                    result.uri.push({
                                        start : start,
                                        end : end,
                                        uri : url
                                    })
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
                                    }), startPos, startPos + partSize)
                                    
                                }
                            }else{
                                let fileStream = file.createReadStream()
                                await uploadFn(file.name, fileStream, 0, file.length)
                            }
                            results.push(result)
                            resolve()
                        })
                    })
                    Promise.all(uploads).then(() => {
                        chunk.destroy()
                        console.log('Done : ' + infoHash)
                        callback(results, infoHash)
                    })
                }
            )
        })
        return infoHash
    }

    destroy(callback? : (err) => void){   
        if(!callback) callback = (err) => {throw err}
        this.torrentClient.destroy((err) =>{
            callback(err)
        })         
    }
}
