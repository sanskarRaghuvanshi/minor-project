const fs=require('fs');const p='D:\\minor project clg\\frontend\\src\\components\\student\\QrScanner.jsx';let c=fs.readFileSync(p,'utf8');c=c.replace(/from '\\''react'\\''/g,\
from
react
\);c=c.replace(/from '\\''jsqr'\\''/g,\from
jsqr
\);fs.writeFileSync(p,c);console.log('Fixed');
