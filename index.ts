import Zippy from './mirror/hosting/zippy';
import Mirror from './mirror';
const cliProgress = require('cli-progress');

const args = process.argv.slice(2);

args.map((uri)=>{
    const multibar = new cliProgress.MultiBar({
        format : '[{bar}] {statETA}s | {name}',
        clearOnComplete: true,
        autopadding : true,
        hideCursor: true,
        barsize: 10
    }, cliProgress.Presets.shades_classic);
    let bars = []
    Mirror(uri, new Zippy(), (results) =>{
        multibar.stop();
        console.log(results);
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