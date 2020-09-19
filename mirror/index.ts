const WebTorrent = require('webtorrent')
import {ReadStream} from 'fs'
const FSChunkStore = require('fs-chunk-store')
const progress = require('progress-stream')


interface IMirrorResult{
    name : string
    uri : Array<string>
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

    async add(sourceTorrent, hosting, callback? : (result: Array<IMirrorResult>) => void, progress? : (stats: Array<IMirrorStats>) => void){
        if(!callback) callback = ()=>{}
        if(!progress) progress = ()=>{}

        let results : Array<IMirrorResult> = []
        let stats : Array<IMirrorStats> = []

        let chunkStore = (chunkLength: number, storeOpts) => {
            let chunk = new FSChunkStore(chunkLength, {
                path : this.opt.downloadDir + '/' + storeOpts.torrent.infoHash,
                length : storeOpts.length
            })
            return chunk
        }
        let prog = this.prog
        
        this.torrentClient.add(sourceTorrent, {
                store : function(chuckLength, storeOpts){return chunkStore(chuckLength, storeOpts)}
            }, 
            function(torrent){
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
                Promise.all(uploads).then(() => {
                    torrent.pause()
                    torrent.destroy({destroyStore:true}, ()=>{
                        callback(results)
                    })
                })
            }
        )
    }

    destroy(calbback? : (err) => void){         
        this.torrentClient.destroy((err) =>{
            calbback(err)
        })         
    }
}
