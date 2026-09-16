const fs = require('node:fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path,'utf8').replace(/^\uFEFF/,'');
let mockup = fs.readFileSync('artifacts/mockup-styles.txt','utf8');
const colors = {'#d9d1e9':'#dbe8ff','#453d5c':'#355688','#dae7bb':'#dcebf4','#394b29':'#355d77','#f2efdf':'#edf3fa','#b9c887':'#91b4ec','#748959':'#527dbd','#6c7e38':'#416a9f','#292b25':'#26364f','#919286':'#6b7c94','#fcfcfa':'#ffffff','#e9e9e3':'#e3eaf3'};
for (const [before,after] of Object.entries(colors)) mockup=mockup.split(before).join(after);
css += '\n/* Decorative project interfaces. */\n' + mockup + '\n';
fs.writeFileSync(path,css);
