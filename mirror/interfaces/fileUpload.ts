import {ReadStream} from 'fs';

export default interface fileUpload {
    fs : ReadStream;
    fileName : string;
}