const WebTorrent = require('webtorrent')
import {basename, extname, resolve} from 'path'
const FSChunkStore = require('fs-chunk-store')
const progress = require('progress-stream')

let prog = (size : number = 0) =>{
    return progress({time : 1000, length: size}, function(stat){console.log(stat);});
}

export default async function(sourceTorrent, hosting){
    const downloadDir = './download/'
    let infos = [];
    let torrentClient = new WebTorrent();
    let chunk;
    
    torrentClient.on('torrent', function(torrent){
        console.log('Download : ' + torrent.name + '\n' + torrent.path)
        let uploads = torrent.files.map(function(file){
            return new Promise(async resolve => {
                let fileExt = extname(file.name)
                let fileName = basename(file.name, fileExt)
                if(file.length > hosting.maxSize){
                    for(let i=0;i * hosting.maxSize < file.length;i++){
                        let remainingSize = file.length - (i * hosting.maxSize);
                        let partSize = (hosting.maxSize < remainingSize) ? hosting.maxSize : remainingSize;
                        let partName = fileName + '.' + ('000' + (i+1)).slice(-3) + fileExt
                        await hosting.upload({
                            fs : file.createReadStream({
                                start : i * hosting.maxSize,
                                end : (i * hosting.maxSize) + partSize,
                            })
                            .pipe(prog(partSize))
                            ,fileName : partName
                        }).then(url => {
                            infos.push({name : partName, url : url});
                            console.log(partName + ' : ' + url);
                        });
                    }
                }else{
                    await hosting.upload({
                        fs : file.createReadStream()
                        .pipe(prog(file.length))
                        ,fileName : file.name
                    }).then(url => {
                        infos.push({name : file.name, url : url});
                        console.log(file.name + ' : ' + url);
                    });
                }
                resolve();
            })
        })
        Promise.all(uploads).then( function(){   
            torrentClient.destroy((error) =>{
                if(error)
                    return console.log(error)

                chunk.destroy();
            });         
        });
    });
    torrentClient.add(sourceTorrent, {
        store : function(chunkLength, storeOpts){
            chunk = new FSChunkStore(chunkLength, {
                path : downloadDir + storeOpts.torrent.name,
                length : storeOpts.length
            })
            return chunk;
        }
    });
    // return infos; still does not works
}