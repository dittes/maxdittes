import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});for(const name of ['index.html','styles.css','tokens.css','engine.js','game.js'])await copyFile(name,'dist/'+name);await cp('assets','dist/assets',{recursive:true});console.log('Built static game in dist/');
