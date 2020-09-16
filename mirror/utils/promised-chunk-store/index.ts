export default class{
    private getRequest : Array<Function> = []
    private cancelPromises : Array<Function> = []
    private chunkBuffers : Array<Buffer> = []
    private errInfo : Array<string> = [
        'buffer length not equal',
        'chunk closed',
        'chunk destroyed',
        'chunk deleted'
    ]
    private opt = {
        immidiateDelete : false
    }

    public close(cb? : Function){
        if (!cb) cb = ()=>{}
        this.cancelPromises.forEach(reject => {
            reject(this.errInfo[1])
        })
        cb(null)
    }

    public destroy(cb? : Function){
        if (!cb) cb = ()=>{}
        this.cancelPromises.forEach(reject => {
            reject(this.errInfo[2])
        })
        this.chunkBuffers = []
        cb(null)
    }

    readonly chunkLength : number

    constructor(chunkLength : number, opt? : object){
        this.chunkLength = chunkLength
        Object.assign(this.opt, opt)
    }

    public put(index: number, chunkBuffer : Buffer, cb? : Function){
        if (!cb) cb = ()=>{}
        if(chunkBuffer.length != this.chunkLength)
            return cb(Error(this.errInfo[0]))
        this.chunkBuffers[index] = chunkBuffer
        if(index in this.getRequest){
            let done = async ()=>{
                this.getRequest.splice(index, 1)[0]()
                return cb(null)
            }
            return done()
        }else return cb(null)
    }

    public get(index : number, opt, cb? : Function){
        if (!cb) cb = ()=>{}
        if (typeof opt === 'function') return this.get(index, null, opt)
        let start : number = 0
        let end : number = this.chunkLength
        if(opt){
            if(opt.offset) start = opt.offset
            if(opt.length) end = start + opt.length
        }
        if(!(index in this.chunkBuffers)){
            return new Promise((resolve, reject) =>{
                this.cancelPromises.push(reject)
                this.getRequest[index] = () =>{
                    resolve(this.get(index, opt, cb))
                }
            }).then(null, err =>{
                cb(Error(err))
            })
        }else
        if(this.chunkBuffers[index]){
            let chunkBuffer = this.chunkBuffers[index].slice(start, end)
            this.chunkLength[index] = null
            return cb(null, chunkBuffer)
        }else
            return cb(Error(this.errInfo[3]))
    }
    
}