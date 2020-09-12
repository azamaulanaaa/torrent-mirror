const formData = require('form-data')
import Axios from 'axios'
import fileUpload from '../interfaces/fileUpload'

export default class{

    readonly maxSize = 500 * 1024 * 1024;

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

    async upload(file : fileUpload){        
        let url : string = 'failed';
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
        data.append('file', file.fs, file.fileName);
        
        await this.client.post('https://' + session.serverId + '.zippyshare.com/upload', data, {headers : data.getHeaders()})
        .then(function(response){
            if(response.status != 200)
                return 0;
            let regexp = /\[url\=([^\]]+)\]/g
            let info;
            if((info = regexp.exec(response.data)) !== null)
                url = info[1];
        }).catch(function(error){
            console.log(error);
        });
        return url;
    }
}