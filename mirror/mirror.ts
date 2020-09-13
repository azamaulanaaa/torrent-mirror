const WebTorrent = require('webtorrent')
import {basename, extname} from 'path'
const FSChunkStore = require('fs-chunk-store')
const progress = require('progress-stream')

let prog = (size : number = 0, callback : Function) =>{
    return progress({time : 1000, length: size}, (stat) => {callback(stat)});
}

interface IMirrorResult{
    name : string
    uri : Array<string>
}

interface IMirrorStats{
    name : string
    stat : any
}

type TMirrorCallback = (result: Array<IMirrorResult>) => void;
type TMirrorProgress = (stats: Array<IMirrorStats>) => void;

export default async function(sourceTorrent, hosting, callback : TMirrorCallback, progress : TMirrorProgress = ()=>{}){
    const downloadDir = './download/'
    let results : Array<IMirrorResult> = [];
    let stats : Array<IMirrorStats> = [];
    let torrentClient = new WebTorrent();
    let chunk;
    
    torrentClient.on('torrent', function(torrent){
        console.log('Download : ' + torrent.name)
        let uploads = torrent.files.map(function(file){
            return new Promise(async resolve => {
                let result : IMirrorResult = {
                    name : file.name,
                    uri : []
                }
                let fileExt = extname(file.name)
                let fileName = basename(file.name, fileExt)
                if(file.length > hosting.maxSize){
                    for(let i=0;i * hosting.maxSize < file.length;i++){
                        let remainingSize = file.length - (i * hosting.maxSize);
                        let partSize = (hosting.maxSize < remainingSize) ? hosting.maxSize : remainingSize;
                        let partName = fileName + '.' + ('000' + (i+1)).slice(-3) + fileExt
                        let stat = {
                            name : partName,
                            stat : null
                        }
                        stats.push(stat)
                        let statsIndex = stats.indexOf(stat)
                        await hosting.upload({
                            fs : file.createReadStream({
                                start : i * hosting.maxSize,
                                end : (i * hosting.maxSize) + partSize,
                            })
                            .pipe(prog(partSize, (stat)=>{
                                stats[statsIndex].stat = stat;
                                progress(stats)
                            }))
                            ,fileName : partName
                        }).then(url => {
                            result.uri.push(url);
                            console.log(partName + ' : ' + url);
                        });
                    }
                }else{
                    let stat = {
                        name : file.name,
                        stat : null
                    }
                    stats.push(stat)
                    let statsIndex = stats.indexOf(stat)
                    await hosting.upload({
                        fs : file.createReadStream()
                        .pipe(prog(file.length, (stat)=>{
                            stats[statsIndex].stat = stat;
                            progress(stats)
                        }))
                        ,fileName : file.name
                    }).then(url => {
                        result.uri.push(url);
                        console.log(file.name + ' : ' + url);
                    });
                }
                results.push(result);
                resolve();
            })
        })
        Promise.all(uploads).then( function(){   
            torrentClient.destroy((error) =>{
                if(error)
                    return console.log(error)
                chunk.destroy();
                callback(results);
            });         
        });
    });
    torrentClient.add(sourceTorrent, {
        store : function(chunkLength, storeOpts){
            chunk = new FSChunkStore(chunkLength, {
                path : downloadDir + storeOpts.torrent.infoHash,
                length : storeOpts.length
            })
            return chunk;
        }
    });
}