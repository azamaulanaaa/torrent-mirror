import {basename, extname} from 'path'
import {createReadStream, statSync} from 'fs'
import fileUpload from '../interfaces/fileUpload'

export function splitStream(filePath : string, maxSize : number){
    let fileSize = statSync(filePath).size;
    let fileExt = extname(filePath);
    let fileName = basename(filePath, fileExt);
    let files : Array<fileUpload> = [];
    
    if(fileSize < maxSize){
        files.push({
            fs : createReadStream(filePath,)
            ,fileName : fileName + fileExt
        });
        return files;
    }

    for(let i=0;i * maxSize < fileSize;i++){
        let remainingSize = fileSize - (i * maxSize);
        let partSize = (maxSize < remainingSize) ? maxSize : remainingSize;
        files.push({
            fs : createReadStream(
                    filePath,
                    {
                        start : i * maxSize,
                        end : (i * maxSize) + partSize,
                    }
                )
            ,fileName : fileName + '.' + ('000' + (i+1)).slice(-3) + fileExt
        });
    }
    return files;

}