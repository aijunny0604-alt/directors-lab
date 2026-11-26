import { readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { atomicWrite } from './vault.mjs';
import { ServiceError } from './errors.mjs';

export const STORAGE_KEYS=['directors-lab-v1','dl30-advanced','dl-board-display-v312','dl-desktop-preferred-model'];
export const digest=value=>createHash('sha256').update(value).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function problem(message='동기화 파일을 읽을 수 없습니다. Google Drive의 다운로드 완료 여부를 확인하세요.') {return new ServiceError(message,'sync_file_error');}
export function validateBundle(b){
  if(b?.schema!=='dl-desktop-sync-1'||!b.storage||typeof b.storage!=='object'||Array.isArray(b.storage)||!Array.isArray(b.files)||b.files.length>5000)throw problem('올바른 Directors Lab 동기화 자료가 아닙니다.');
  if(Object.keys(b.storage).some(k=>!STORAGE_KEYS.includes(k))||typeof b.storage['directors-lab-v1']!=='string')throw problem();
  for(const v of Object.values(b.storage))if(typeof v!=='string'||v.length>16*1024*1024)throw problem();
  const s=JSON.parse(b.storage['directors-lab-v1']);
  if(!s||typeof s!=='object'||!Array.isArray(s.records)||!s.done||!s.notes||!s.checks)throw problem();
  const ids=new Set();let size=0;
  for(const f of b.files){
    if(typeof f.id!=='string'||f.id.length>200||ids.has(f.id)||typeof f.mime!=='string'||f.mime.length>150||typeof f.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data))throw problem();
    ids.add(f.id);size+=f.data.length;
  }
  if(size>112*1024*1024)throw problem('첨부파일 전체가 80MB를 초과합니다. 큰 원본은 Drive에 따로 보관하세요.');
  if(b.audit!==undefined&&(!Array.isArray(b.audit)||b.audit.length>30000||JSON.stringify(b.audit).length>20*1024*1024||b.audit.some(x=>!x||typeof x.id!=='string'||typeof x.run!=='string')))throw problem('AI 실행 로그가 동기화 한도를 초과했거나 형식이 올바르지 않습니다.');
  return b;
}
export class FolderSync {
  constructor(directory){this.directory=directory;this.config={folder:'',head:null,hash:null};this.pending=null;}
  async init(){await mkdir(this.directory,{recursive:true});try{this.config=JSON.parse(await readFile(join(this.directory,'sync-settings.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw problem();}return this;}
  async save(){await atomicWrite(join(this.directory,'sync-settings.json'),JSON.stringify(this.config));}
  status(){return {folder:this.config.folder,enabled:!!this.config.folder};}
  async attach(folder){
    const root=basename(folder)==='DirectorsLab-sync'?folder:join(folder,'DirectorsLab-sync');await mkdir(join(root,'revisions'),{recursive:true});await mkdir(join(root,'blobs'),{recursive:true});
    const marker=join(root,'format.json');try{if(JSON.parse(await readFile(marker,'utf8')).schema!=='dl-desktop-folder-1')throw problem();}catch(e){if(e.code!=='ENOENT')throw e;await atomicWrite(marker,JSON.stringify({schema:'dl-desktop-folder-1'}));}
    this.config={folder:root,head:null,hash:null};this.pending=null;await this.save();return this.status();
  }
  async disconnect(){this.config={folder:'',head:null,hash:null};this.pending=null;await this.save();return this.status();}
  async revisions(){
    const root=this.config.folder,list=[];const files=await readdir(join(root,'revisions'));
    if(files.length>10000)throw problem('동기화 이력이 많습니다. 새 공유 폴더로 백업을 옮겨 연결하세요.');
    for(const name of files.filter(x=>/^[a-f0-9]{64}\.json$/.test(x))){
      const path=join(root,'revisions',name);if((await stat(path)).size>20*1024*1024)throw problem();
      const text=await readFile(path,'utf8');if(digest(text)!==name.slice(0,-5))throw problem();
      const r=JSON.parse(text);if(r.schema!=='dl-folder-revision-1'||!Array.isArray(r.parents)||!r.parents.every(hex)||!Array.isArray(r.files)||!r.storage||typeof r.device!=='string'||typeof r.date!=='string')throw problem();
      list.push({...r,id:name.slice(0,-5)});
    }
    const map=new Map(list.map(r=>[r.id,r]));
    if(list.some(r=>r.parents.some(p=>!map.has(p))))throw problem('다른 PC의 동기화 파일이 아직 다운로드 중입니다. 잠시 후 다시 확인합니다.');
    const parents=new Set(list.flatMap(r=>r.parents));return {list,heads:list.filter(r=>!parents.has(r.id))};
  }
  async manifest(bundle){
    validateBundle(bundle);const files=[];
    for(const f of bundle.files){
      const bytes=Buffer.from(f.data,'base64'),hash=digest(bytes),path=join(this.config.folder,'blobs',hash);
      let exists=false;try{exists=digest(await readFile(path))===hash;}catch(e){if(e.code!=='ENOENT')throw e;}
      if(!exists)await atomicWrite(path,bytes);
      files.push({id:f.id,mime:f.mime,hash});
    }
    files.sort((a,b)=>a.id.localeCompare(b.id));
    const result={storage:Object.fromEntries(Object.entries(bundle.storage).sort(([a],[b])=>a.localeCompare(b))),files,audit:(bundle.audit||[]).slice().sort((a,b)=>a.id.localeCompare(b.id))};
    if(JSON.stringify(result).length>18*1024*1024)throw problem('프로젝트와 실행 로그의 합계가 18MB를 초과합니다. 별도 백업 후 새 동기화 폴더를 사용하세요.');
    return result;
  }
  async publish(manifest,parents,advance=true){
    const revision={schema:'dl-folder-revision-1',nonce:randomUUID(),date:new Date().toISOString(),device:hostname(),parents,...manifest};
    const text=JSON.stringify(revision),id=digest(text);await atomicWrite(join(this.config.folder,'revisions',id+'.json'),text);
    if(advance){this.config.head=id;this.config.hash=digest(JSON.stringify(manifest));await this.save();}return {...revision,id};
  }
  async bundle(r){
    const files=[];let total=0;
    for(const f of r.files){
      if(!hex(f.hash))throw problem();const path=join(this.config.folder,'blobs',f.hash);const info=await stat(path);total+=info.size;if(total>80*1024*1024)throw problem('첨부파일 전체가 80MB를 초과합니다.');
      const bytes=await readFile(path);if(digest(bytes)!==f.hash)throw problem();files.push({id:f.id,mime:f.mime,data:bytes.toString('base64')});
    }
    return validateBundle({schema:'dl-desktop-sync-1',storage:r.storage,files,audit:r.audit||[]});
  }
  async backup(bundle){validateBundle(bundle);const folder=join(this.directory,'recovery');await mkdir(folder,{recursive:true});await atomicWrite(join(folder,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.json`),JSON.stringify(bundle));}
  conflict(heads){return {kind:'conflict',heads:heads.map(r=>({id:r.id,date:r.date,device:r.device,local:r.id===this.config.head}))};}
  async cycle(bundle){
    if(!this.config.folder)return {kind:'disabled'};
    const local=await this.manifest(bundle),hash=digest(JSON.stringify(local));
    if(this.pending){
      if(hash===this.pending.localHash)return {kind:'pull',...this.pending};
      // 원격 자료 적용 대기 중 이 PC의 입력이 바뀌었으면 독립 버전으로 보존한다.
      this.pending=null;await this.publish(local,this.config.head?[this.config.head]:[]);
    }
    let {list,heads}=await this.revisions();
    if(!list.length){if(this.config.head)throw problem('공유 폴더의 이력을 찾을 수 없습니다. Drive 연결을 확인하세요.');await this.publish(local,[]);return {kind:'pushed',date:new Date().toISOString()};}
    if(this.config.head&&!list.some(r=>r.id===this.config.head))throw problem('이 PC의 기준 버전이 아직 Drive에 도착하지 않았습니다.');
    const changed=this.config.hash!==null&&hash!==this.config.hash;
    if(heads.length===1&&heads[0].id===this.config.head){if(changed)await this.publish(local,[this.config.head]);return {kind:changed?'pushed':'current',date:new Date().toISOString()};}
    if(changed){await this.publish(local,[this.config.head]);({heads}=await this.revisions());}
    if(heads.length!==1)return this.conflict(heads);
    await this.backup(bundle);const remote=await this.bundle(heads[0]);
    this.pending={revision:heads[0].id,bundle:remote,hash:digest(JSON.stringify({storage:heads[0].storage,files:heads[0].files,audit:heads[0].audit||[]})),localHash:hash};
    return {kind:'pull',...this.pending};
  }
  async acknowledge(id){
    if(this.pending?.revision!==id)throw problem('적용한 동기화 버전이 일치하지 않습니다.');
    this.config.head=id;this.config.hash=this.pending.hash;await this.save();this.pending=null;return true;
  }
  async resolve(id,localBundle){
    if(this.pending)throw problem('자료 적용이 끝난 후 다시 선택하세요.');
    const {heads}=await this.revisions(),selected=heads.find(r=>r.id===id);if(!selected)throw problem('다른 PC에서 새 버전을 만들었습니다. 다시 확인하세요.');
    await this.backup(localBundle);const bundle=await this.bundle(selected);
    // 사용자 선택본으로 분기를 합치되 모든 이전 제출본은 revisions에 보존한다.
    const r=await this.publish({storage:selected.storage,files:selected.files,audit:selected.audit||[]},heads.map(r=>r.id),false);
    // 디스크의 기준은 실제 화면 적용 확인 전까지 이전 버전을 가리킨다.
    this.pending={revision:r.id,bundle,hash:digest(JSON.stringify({storage:selected.storage,files:selected.files,audit:selected.audit||[]})),localHash:digest(JSON.stringify(await this.manifest(localBundle)))};
    return {kind:'pull',...this.pending};
  }
}
