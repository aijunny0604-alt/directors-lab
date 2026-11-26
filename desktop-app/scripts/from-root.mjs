import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const parent=new URL('../../index.html',import.meta.url);
try{await access(parent);}catch{process.exit(0);}
const source=await readFile(parent,'utf8');
const match=/<script>([\s\S]*?)<\/script>/.exec(source);
if(!match)throw Error('저장소 index.html 스크립트 형식이 바뀌었습니다. Windows 연결 호환성 점검이 필요합니다.');
for(const name of ['invoke30','bridgeUI29','file26','custom25','desk30'])if(!match[1].includes(name))throw Error('원본 연결 계약 변경: '+name);
const html=source.replace(match[0],'<script src="studio.js"></script><script src="desktop-ui.js"></script>').replace('</head>','<link rel="stylesheet" href="desktop.css"></head>');
await writeFile(new URL('../studio.js',import.meta.url),match[1]);await writeFile(new URL('../index.html',import.meta.url),html);
const p={repository:'aijunny0604-alt/directors-lab',source:'../index.html',sha256:createHash('sha256').update(source).digest('hex'),preparedAt:new Date().toISOString(),title:source.match(/<title>(.*?)<\/title>/)?.[1]};
await writeFile(new URL('../upstream.json',import.meta.url),JSON.stringify(p,null,2));console.log('저장소의 최신 index.html을 Windows 앱에 반영했습니다.');
