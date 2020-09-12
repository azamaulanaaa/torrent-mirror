import zippy from './zippy'

let zippyUpload = new zippy();

let filePath = 
// 'C:/Users/azama/Downloads/mirror/index.ts';
'C:/Users/azama/Downloads/go1.15.2.windows-amd64.msi';

zippyUpload.upload(filePath);