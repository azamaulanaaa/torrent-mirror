import Zippy from './mirror/hosting/zippy';
import Mirror from './mirror/mirror';

const args = process.argv.slice(2);

args.map((uri)=>{
    Mirror(uri, new Zippy(), (results) =>{
        console.log(results);
    })
})