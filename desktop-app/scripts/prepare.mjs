import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../index.html',import.meta.url);
let html=await readFile(path,'utf8');
if(!html.includes('src="studio.js"')){
  const match=/<script>([\s\S]*?)<\/script>/.exec(html);
  if(!match)throw Error('원본 스크립트를 찾을 수 없습니다.');
  await writeFile(new URL('../studio.js',import.meta.url),match[1]);
  html=html.replace(match[0],'<script src="studio.js"></script><script src="desktop-ui.js"></script>');
  html=html.replace('</head>','<link rel="stylesheet" href="desktop.css"></head>');
  await writeFile(path,html);
}
