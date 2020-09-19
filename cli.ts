import Zippy from './mirror/hosting/zippy';
import Mirror from './mirror';
const cliProgress = require('cli-progress');

const args = process.argv.slice(2);

let mirror = new Mirror();

let uploads = args.map((uri)=>{
    return new Promise(resolve => {
        const multibar = new cliProgress.MultiBar({
            format : '[{bar}] {statETA}s | {name}',
            clearOnComplete: true,
            autopadding : true,
            hideCursor: true,
            barsize: 10
        }, cliProgress.Presets.shades_classic);
        let bars = []
        mirror.add(uri, new Zippy(), (results) =>{
            multibar.stop();
            console.log(results)
            resolve();
        },(stats) =>{
            stats.forEach((stat, index)=>{
                if(!stat.stat)
                    return 0
                if(!bars[index])
                    bars[index] = multibar.create(100,0,{name: stat.name});
                bars[index].update(stat.stat.percentage, {statETA : stat.stat.eta});
            })
        })
    })
})

Promise.all(uploads).then(()=>{
    mirror.destroy(()=>{});
})