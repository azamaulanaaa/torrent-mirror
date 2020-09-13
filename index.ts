import Zippy from './mirror/hosting/zippy';
import Mirror from './mirror/mirror';
const cliProgress = require('cli-progress');

const args = process.argv.slice(2);
const multibar = new cliProgress.MultiBar({
    format : '{name} | {bar} | {eta_formatted}',
    clearOnComplete: false,
    hideCursor: true
}, cliProgress.Presets.shades_grey);
let bars = []

args.map((uri)=>{
    Mirror(uri, new Zippy(), (results) =>{
        multibar.stop();
        console.log(results);
    },(stats) =>{
        stats.forEach((stat, index)=>{
            if(!bars[index])
                bars[index] = multibar.create(100,0,{name: stat.name});
            bars[index].update(stat.stat.percentage);
        })
    })
})