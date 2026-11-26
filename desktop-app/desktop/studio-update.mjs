import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {atomicWrite} from './vault.mjs';

export const STUDIO_REPOSITORY='aijunny0604-alt/directors-lab';
const hash=s=>createHash('sha256').update(s).digest('hex');
const validSha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
export function prepareStudio(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>4*1024*1024)throw Error('source_size');
  const scripts=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if(scripts.length!==1||scripts[0][1].trim()||!source.includes('</head>')||!source.includes('<html'))throw Error('source_shape');
  const js=scripts[0][2];
  for(const name of ['invoke30','bridgeUI29','file26','custom25','desk30','state28','create39','execute39','journalAdd37','auditDB37','execute34'])if(!js.includes(name))throw Error('bridge_contract');
  new vm.Script(js,{filename:'studio.js'});
  const html=source.replace(scripts[0][0],'<script src="studio.js"></script><script src="desktop-ui.js"></script>').replace('</head>','<link rel="stylesheet" href="desktop.css"></head>');
  return {html,js,title:source.match(/<title>([^<]*)<\/title>/)?.[1]||'Directors Lab'};
}
async function cached(directory){
  const m=JSON.parse(await readFile(join(directory,'active.json'),'utf8'));if(!validSha(m.commit))throw Error('cache_shape');
  const path=join(directory,m.commit),html=await readFile(join(path,'index.html'),'utf8'),js=await readFile(join(path,'studio.js'),'utf8');
  if(hash(html)!==m.htmlHash||hash(js)!==m.jsHash)throw Error('cache_hash');
  return {directory:path,commit:m.commit,title:m.title,updatedAt:m.updatedAt,cached:true};
}
export async function latestStudio(directory,{fetcher=fetch,now=Date.now()}={}){
  await mkdir(directory,{recursive:true});let old=null;try{old=await cached(directory);}catch{}
  // 같은 PC에서 연속 실행할 때는 GitHub 공개 API 요청을 줄인다.
  if(old&&now-new Date(old.updatedAt).getTime()<60000)return {...old,checked:true};
  try{
    const response=await fetcher(`https://api.github.com/repos/${STUDIO_REPOSITORY}/commits?path=index.html&per_page=1`,{redirect:'error',headers:{Accept:'application/vnd.github+json','User-Agent':'Directors-Lab-Desktop'},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('github_unavailable');const rows=await response.json(),commit=rows[0]?.sha;if(!validSha(commit))throw Error('invalid_commit');
    if(old?.commit===commit)return {...old,checked:true};
    const raw=await fetcher(`https://raw.githubusercontent.com/${STUDIO_REPOSITORY}/${commit}/index.html`,{redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!raw.ok||Number(raw.headers.get('content-length'))>4*1024*1024)throw Error('download_failed');
    const {html,js,title}=prepareStudio(await raw.text()),path=join(directory,commit);await mkdir(path,{recursive:true});
    await atomicWrite(join(path,'index.html'),html);await atomicWrite(join(path,'studio.js'),js);
    const metadata={commit,title,htmlHash:hash(html),jsHash:hash(js),updatedAt:new Date(now).toISOString()};
    await atomicWrite(join(directory,'active.json'),JSON.stringify(metadata));
    return {directory:path,commit,title,updatedAt:metadata.updatedAt,cached:false,checked:true};
  }catch{
    return old?{...old,checked:false,message:'업데이트 확인 실패 · 마지막 호환 원본으로 실행'}:{directory:null,commit:'',checked:false,message:'업데이트 확인 실패 · 앱에 포함된 원본으로 실행'};
  }
}
