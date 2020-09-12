import Zippy from './hosting/zippy'
const WebTorrent = require('webtorrent')
import {basename, extname, resolve} from 'path'
const progress = require('progress-stream')
const FSChunkStore = require('fs-chunk-store')

let hosting = new Zippy();

let prog = (size : number = 0) =>{
    return progress({time : 1000, length: size}, function(stat){console.log(stat);});
}


let mirror = (sourceTorrent, hosting) => {
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
    return infos;
}

let magnetUri = 'magnet:?xt=urn:btih:9BE5638EF78E7F385569CFF71094EEBDC1FD9107&dn=Minecraft%3A%20Pocket%20Edition%20v0.14.1%20Android&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2920%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce';

mirror(magnetUri, hosting)
// .then(infos => console.log(infos))