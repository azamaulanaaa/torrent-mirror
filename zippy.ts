const formData = require('form-data')
const progress = require('progress-stream')
import Axios from 'axios'
import {basename, extname} from 'path'
import {createReadStream, statSync, ReadStream} from 'fs'


interface iFile {
    fs : ReadStream;
    fileName : string;
}

export default class{

    private config = {
        maxSize : 500 * 1024 * 1024
    };

    private client : any;

    constructor(){
        this.client = Axios.create({
            headers : {
                'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 Edg/85.0.564.51'
            },
            maxBodyLength: 512 * 1024 * 1024,
            maxContentLength: 512 * 1024 * 1024
        });
    }

    private async prepUpload(){
        let regexp, uploadId, serverId;
        await this.client.get('https://zippyshare.com')
            .then(function(response){
                regexp = /var uploadId = \'([\w\d]+)\'\;/;
                uploadId = regexp.exec(response.data)[1];

                regexp = /var server = \'([\w\d]+)\'\;/;
                serverId = regexp.exec(response.data)[1];
            }).catch(function(error){
                console.log(error);
            });
        return {uploadId, serverId};
    }

    private prog(size){
        return progress(
            {
                time: 1000,
                length: size
            },
            function(progress){
                console.log(progress);
            }
        );
    }

    private fsSplitFiles(filePath){
        let fileSize = statSync(filePath).size;
        let fileExt = extname(filePath);
        let fileName = basename(filePath, fileExt);
        let files : Array<iFile> = [];
        
        if(fileSize < this.config.maxSize){
            let uploadProg = this.prog(fileSize);
            files.push({
                fs : createReadStream(filePath)
                    // .pipe(uploadProg)
                    // .on('conviction', function(length){
                    //         uploadProg.setLength(length); 
                    //     })
                ,fileName : fileName + fileExt
            });
            return files;
        }

        for(let i=0;i * this.config.maxSize < fileSize;i++){
            let remainingSize = fileSize - (i * this.config.maxSize);
            let partSize = (this.config.maxSize < remainingSize) ? this.config.maxSize : remainingSize;
            let uploadProg = this.prog(partSize);
            files.push({
                fs : createReadStream(
                        filePath,
                        {
                            start : i * this.config.maxSize,
                            end : (i * this.config.maxSize) + partSize,
                        }
                    )
                    // .pipe(uploadProg)
                    // .on('conviction', function(length){
                    //         uploadProg.setLength(length); 
                    //     })
                ,fileName : fileName + '.' + ('000' + (i+1)).slice(-3) + fileExt
            });
        }
        return files;
    }

    async upload(filePath){
        if(typeof filePath === 'string'){
            let files = this.fsSplitFiles(filePath);
            files.forEach(file => {
                this.upload(file);
            });
        }else{
            let session = await this.prepUpload();
            let dataDefault = {
                'uploadid': session.uploadId,
                'notprivate': 'false',
                'zipname': '',
                'ziphash': '',
                'embPlayerValues': 'false'
            };
            
            let data = new formData();
            Object.keys(dataDefault).forEach(key =>{
                data.append(key, dataDefault[key]);
            });
            data.append('file', filePath.fs, filePath.fileName);
            
            this.client.post('https://' + session.serverId + '.zippyshare.com/upload', data, {headers : data.getHeaders()})
            .then(function(response){
                let regexp = /\[url\=([^\]]+)\]([^\]]+)\[\/url\]/g
                let info = regexp.exec(response.data);
                console.log(info[2] + " : " + info[1]);
            }).catch(function(error){
                console.log(error);
            });
        }
    }
}