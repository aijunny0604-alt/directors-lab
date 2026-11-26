/* 이 파일은 원본 스튜디오와 같은 로컬 문서에서 실행된다. 자격증명은 preload에 노출하지 않는다. */
const DESKTOP_SYNC_PAGE='기기 동기화';
let desktopSyncState={enabled:false,folder:'',message:'Google Drive 폴더를 연결하면 다른 PC에서 이어서 작업할 수 있습니다.',heads:[]};
let desktopSyncBusy=false,desktopApplying=false,desktopSyncTimer,desktopDirty=false,desktopGeneration=0;
let desktopFilesCache=null,desktopAuditCache=null,desktopAckPending=null;
const desktopKeys=['directors-lab-v1','dl30-advanced','dl-board-display-v312'];
const desktopNav=nav;
nav=function(){desktopNav();const el=$v('nav');if(el&&!el.querySelector('[data-desktop-sync]')){const b=document.createElement('button');b.dataset.desktopSync='1';b.textContent='기기 동기화';b.classList.toggle('active',page===DESKTOP_SYNC_PAGE);b.onclick=()=>open(DESKTOP_SYNC_PAGE);el.append(b);}};
const desktopBridge=bridgeUI29;
bridgeUI29=function(){
  desktopBridge();
  const card=Array.from(view.querySelectorAll('.card')).find(c=>c.textContent.includes('웹사이트 직접 계정 연동: 미구현'));
  if(card)card.innerHTML='<h3>다른 PC에서도 같은 계정으로</h3><p>집 PC에도 이 앱을 설치하고 ChatGPT에 로그인하세요. 각 PC의 로그인 정보는 Windows 암호화 저장소로 보호합니다.</p><p>프로젝트는 Google Drive로 동기화하며 ChatGPT 대화 기록과는 별개입니다.</p><button id="desktopGoSync">Google Drive 동기화 설정</button>';
  $v('desktopGoSync')?.addEventListener('click',()=>open(DESKTOP_SYNC_PAGE));
  view.querySelectorAll('a[href*="chatgpt.com/#settings"]').forEach(a=>a.href='https://chatgpt.com/settings/usage');
  const p=document.createElement('p');p.className='muted';p.textContent='계정 로그인 정보는 이 PC에만 저장합니다. AI 작업에는 현재 선택한 ChatGPT 플랜과 한도가 적용됩니다.';view.prepend(p);
  const test=document.createElement('section');test.className='card';test.innerHTML='<h3>실제 AI 협업 점검</h3><p>별도 점검 프로젝트를 만들어 기획팀 → 기획 감독 → 작가팀 → 작가 감독을 최대 4회 실제 호출합니다. 앞 팀 결과 전달, 검수, 저장, 응답 ID와 사용량을 확인합니다. 수정 필요 판정이면 해당 단계에서 멈춥니다.</p><button id="desktopLiveCheck" class="primary">선택한 모델로 실제 협업 점검</button><p class="muted">모의 응답을 사용하지 않습니다. ChatGPT 플랜의 사용량을 소비합니다. 원래 프로젝트는 유지됩니다.</p>';view.append(test);$v('desktopLiveCheck').onclick=()=>void desktopRealTest();
};custom25[BRIDGE29]=bridgeUI29;
async function desktopRealTest(){
  try{
    if(!desk30.status?.sharing||!desk30.model)throw Error('먼저 ChatGPT에 로그인하고 모델을 선택하세요.');
    if(desktopAIActive())throw Error('현재 AI 작업을 마친 뒤 점검하세요.');
    if(!confirm('별도 테스트 프로젝트에서 최신 원본의 실제 제작 흐름을 최대 4회 호출합니다. ChatGPT 플랜 사용량을 소비합니다. 진행할까요?'))return;
    const previous=S.v2.active,name='AI 협업 점검 '+new Date().toISOString().replace(/[:.]/g,'-');S.v2.active=name;project();const s=state28();
    Object.assign(s.h.brief,{concept:'반송 편지 한 통을 발견한 성인 우체부 지안이 퇴근을 미루고 편지를 발신인에게 돌려주기로 결심하는 30초 무성 단편.',format:'개인 단편 영화 기획',audience:'성인 일반 관객',durationPlan:'30초, 16:9, 세 장면 8초/12초/10초',storyOutline:'폐점 직전 작은 우체국. 1) 지안이 반송 편지를 발견한다. 2) 편지의 낡은 주소와 자신의 어린 시절 주소가 같음을 알아본다. 3) 가방을 다시 메고 문을 나선다. 발신인 정체는 열린 결말로 남긴다.',visual:'늦은 오후의 따뜻한 빛, 단정한 우체국, 절제된 카메라 이동.',constraints:'배우는 성인 지안 한 명. 우체국 내부와 문 앞만 사용. 대사·음성 내레이션 없음. 원본 영상·이미지는 아직 없는 기획 점검이며 미정 세부는 제안으로 구분한다.',deliverablePlan:'텍스트 기획안과 검수 기록. 실제 영상·이미지 생성 및 원본 변경은 하지 않는다.'});
    const f=flowState28(s);f.goal='연결 점검: 부서별 독립 호출과 직전 결과의 인수인계, 원본 대조 검수를 실제로 수행한다. 실무 산출물과 선행 결정의 연결을 구체적으로 기록한다.';
    const r=createRun34(s);r.desktopDiagnostic={started:new Date().toISOString(),previousProject:previous};save();advanced30=false;open(FLOW28);await execute34(s,r,4);
    const tasks=tasks28(r),stored=tasks.filter(t=>latest28(r,t.id)),logs=await journalRead37(r.id);
    const rows=stored.map(t=>{const v=latest28(r,t.id);return {task:t.id,label:t.label,trace:v.trace37,responseId:v.responseId37,model:v.model37,usage:v.usage37,verdict:v.data.verdict||'초안',saved:logs.some(x=>x.trace===v.trace37&&x.kind==='committed')};});
    const handoffs=stored.slice(1).map((t,i)=>{const previous=latest28(r,stored[i].id),request=logs.find(x=>x.task===t.id&&x.kind==='request');return {from:stored[i].id,to:t.id,included:!!request?.payload?.includes(JSON.stringify(previous.data.summary).slice(1,-1))};});
    const proof=rows.length>=3&&rows.every(x=>x.responseId&&x.saved)&&new Set(rows.map(x=>x.responseId)).size===rows.length&&handoffs.every(x=>x.included);
    s.p.desktopDiagnosticReport={date:new Date().toISOString(),run:r.id,project:name,previousProject:previous,status:proof?'실제 호출·선행 결과 전달·저장 확인':next28(r)?.blocked?'실제 검수에서 수정 필요로 중단':'점검 미완료',calls:logs.filter(x=>x.kind==='dispatch').length,rows,handoffs,limitations:'동일 계정의 선택한 모델을 역할별로 별도 호출한 순차 협업. 최대 4단계의 점검이며 전체 제작·회의·집 PC 실동기화 검증을 뜻하지 않음.'};save();open('실제 협업 점검 결과');
  }catch(e){notify(e.message);}
}
custom25['실제 협업 점검 결과']=function(){const report=project().desktopDiagnosticReport;view.innerHTML='<section class="simplePaper30"><h2>실제 협업 점검 결과</h2>'+(report?'<p><b>'+E(report.status)+'</b></p><p>'+E(report.project)+' · 실제 요청 '+report.calls+'회</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+E(JSON.stringify(report,null,2))+'</pre><button id="desktopProofDownload">점검 보고서 JSON</button>':'<p>아직 실제 점검을 실행하지 않았습니다.</p>')+'</section>';if(report)$v('desktopProofDownload').onclick=()=>download22('directors-lab-live-check.json',JSON.stringify(report,null,2));};
function desktopChanged(){if(desktopApplying)return;desktopDirty=true;desktopGeneration++;clearTimeout(desktopSyncTimer);desktopSyncTimer=setTimeout(()=>void desktopTick(),1800);}
const desktopSave=save;
save=function(){const ok=desktopSave();if(ok)desktopChanged();return ok;};
const desktopFile=file26;
file26=async function(mode,id,value){const result=await desktopFile(mode,id,value);if(mode!=='get'){desktopFilesCache=null;desktopChanged();}return result;};
const desktopJournal=journalAdd37;journalAdd37=async function(row){const result=await desktopJournal(row);desktopAuditCache=null;desktopChanged();return result;};
async function desktopAudit(){if(desktopAuditCache)return desktopAuditCache;const db=await auditDB37();const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('events','readonly'),q=tx.objectStore('events').getAll();tx.oncomplete=()=>resolve(q.result);tx.onerror=()=>reject(tx.error);});desktopAuditCache=rows;return rows;}
async function desktopFiles(){
  if(desktopFilesCache)return desktopFilesCache;
  const db=await db26();
  const entries=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),store=tx.objectStore('files'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>resolve(keys.result.map((id,i)=>({id,blob:values.result[i]})));tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  let size=0;const files=[];
  for(const {id,blob} of entries){if(!(blob instanceof Blob))throw Error('첨부파일 형식을 확인하세요.');size+=blob.size;if(size>80*1024*1024)throw Error('첨부파일 전체가 80MB를 초과합니다. 큰 원본은 Drive에 따로 보관하세요.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.slice(r.result.indexOf(',')+1));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});files.push({id:String(id),mime:blob.type,data});}
  desktopFilesCache=files;return files;
}
async function desktopBundle(){
  const storage={};for(const k of desktopKeys){const value=localStorage.getItem(k);if(value!==null)storage[k]=value;}
  storage['directors-lab-v1']=JSON.stringify(S);
  return {schema:'dl-desktop-sync-1',storage,files:await desktopFiles(),audit:await desktopAudit()};
}
function desktopAIActive(){return !!(desk30.running||runBusy28||busy28||live34.active||(typeof room39!=='undefined'&&room39.busy)||(typeof meetingLive38!=='undefined'&&meetingLive38.busy));}
async function desktopApply(pull){
  const bundle=pull.bundle,gen=desktopGeneration;
  const next=JSON.parse(bundle.storage['directors-lab-v1']);
  if(!next||!Array.isArray(next.records)||!next.done||!next.notes||!next.checks)throw Error('동기화 프로젝트 형식을 확인하세요.');
  if(desktopAIActive()||document.activeElement?.matches('input,textarea,select'))throw Error('입력 또는 AI 작업이 끝난 후 다른 PC 자료를 적용합니다.');
  const blobs=bundle.files.map(f=>{const bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));return {id:f.id,blob:new Blob([bytes],{type:f.mime})};});
  const db=await db26();if(gen!==desktopGeneration)throw Error('현재 PC에서 새로 입력한 자료가 있어 동기화 적용을 보류했습니다.');
  desktopApplying=true;
  // 적용 중 새 입력을 막고, IDB 트랜잭션 실패 시 기존 localStorage를 복원한다.
  document.body.inert=true;
  const old=Object.fromEntries(desktopKeys.map(k=>[k,localStorage.getItem(k)]));
  let committed=false;
  try{
    for(const k of desktopKeys){if(bundle.storage[k]!==undefined)localStorage.setItem(k,bundle.storage[k]);else localStorage.removeItem(k);}
    await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');store.clear();for(const f of blobs)store.put(f.blob,f.id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    committed=true;S=next;advanced30=localStorage.getItem('dl30-advanced')==='1';desktopFilesCache=bundle.files;
    if(bundle.audit?.length){const adb=await auditDB37();await new Promise((resolve,reject)=>{const tx=adb.transaction('events','readwrite'),store=tx.objectStore('events');for(const row of bundle.audit)store.put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});desktopAuditCache=null;}
    desktopAckPending=pull.revision;
    await invoke30('syncAck',pull.revision);desktopAckPending=null;desktopDirty=false;desktopSyncState.heads=[];desktopSyncState.message='다른 PC의 최신 작업을 가져왔습니다. '+new Date().toLocaleTimeString('ko-KR');render();
  }catch(e){if(!committed){for(const [k,v] of Object.entries(old)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}}else render();throw e;}
  finally{document.body.inert=false;desktopApplying=false;}
}
function desktopStatus(){
  let bar=$v('desktopStatusBar');if(!bar){bar=document.createElement('div');bar.id='desktopStatusBar';bar.className='desktop-status';bar.innerHTML='<strong>WINDOWS STUDIO</strong><span id="desktopSyncMessage"></span><button id="desktopSyncButton">기기 동기화</button>';document.body.prepend(bar);$v('desktopSyncButton').onclick=()=>open(DESKTOP_SYNC_PAGE);}
  $v('desktopSyncMessage').textContent=desktopSyncState.message;
  if(page===DESKTOP_SYNC_PAGE){const status=$v('desktopSyncDetail');if(status)status.textContent=desktopSyncState.message;const conflicts=$v('desktopConflicts');if(conflicts){conflicts.innerHTML=desktopSyncState.heads.length?'<div class="sync-conflict"><h3>두 PC의 수정이 겹쳤습니다</h3><p>각 버전을 보존했습니다. 이어서 사용할 버전을 선택하세요.</p>'+desktopSyncState.heads.map(h=>`<p>${E(h.device)} · ${E(new Date(h.date).toLocaleString('ko-KR'))} ${h.local?'· 현재 PC 기준':''}<br><button data-sync-pick="${E(h.id)}">이 버전으로 이어가기</button></p>`).join('')+'</div>':'';conflicts.querySelectorAll('[data-sync-pick]').forEach(b=>b.onclick=()=>void desktopResolve(b.dataset.syncPick));}}
}
async function desktopTick(){
  if(desktopSyncBusy||desktopApplying||!desktopSyncState.enabled)return;
  if(desktopAIActive()||document.activeElement?.matches('input,textarea,select'))return;
  desktopSyncBusy=true;
  try{
    if(desktopAckPending){await invoke30('syncAck',desktopAckPending);desktopAckPending=null;}
    const gen=desktopGeneration,bundle=await desktopBundle();if(gen!==desktopGeneration)return;
    const result=await invoke30('syncCycle',bundle);
    if(result.kind==='pull'){
      if(gen!==desktopGeneration||desktopAIActive()||document.activeElement?.matches('input,textarea,select')){desktopSyncState.message='다른 PC의 작업이 도착했습니다. 입력을 마치면 반영합니다.';return;}
      await desktopApply(result);
    }else if(result.kind==='conflict'){desktopSyncState.heads=result.heads;desktopSyncState.message='동시에 수정된 버전이 있습니다. 기기 동기화에서 사용할 버전을 선택하세요.';}
    else if(result.kind==='pushed'||result.kind==='current'){desktopSyncState.message=(result.kind==='pushed'?'이 PC 자료를 공유 폴더에 저장했습니다. ':'공유 폴더 확인 완료. ')+new Date().toLocaleTimeString('ko-KR')+' · 다른 PC 도착은 Drive 상태에 따라 달라집니다.';desktopDirty=false;desktopSyncState.heads=[];}
  }catch(e){desktopSyncState.message=e.message;}
  finally{desktopSyncBusy=false;desktopStatus();}
}
async function desktopResolve(id){
  if(desktopSyncBusy||desktopAIActive())return;desktopSyncBusy=true;
  try{const result=await invoke30('syncResolve',id,await desktopBundle());if(result.kind==='pull')await desktopApply(result);}
  catch(e){desktopSyncState.message=e.message;}
  finally{desktopSyncBusy=false;desktopStatus();}
}
function desktopSyncPage(){
  view.innerHTML=`<section class="simplePaper30"><small>GOOGLE DRIVE / MULTI-PC</small><h2>회사에서도, 집에서도 같은 작업실</h2><p>이 앱을 두 PC에 설치하고 각 PC에서 ChatGPT에 로그인하세요. 프로젝트와 첨부파일은 Google Drive의 같은 폴더로 이어집니다.</p><div class="drive-steps"><article><b>01 · Google Drive 준비</b><p>두 PC의 Drive 데스크톱 앱을 같은 Google 계정으로 연결하세요.</p></article><article><b>02 · 같은 폴더 선택</b><p>Drive 안의 개인 폴더를 선택하세요. 앱이 DirectorsLab-sync 폴더를 만듭니다. 집 PC에서도 같은 폴더를 고르세요.</p></article><article><b>03 · 작업 이어가기</b><p>텍스트·AI 결과·첨부파일을 약 15초마다 확인합니다. Drive 다운로드가 끝나야 다른 PC에 도착합니다.</p></article></div><div class="card"><h3>${desktopSyncState.enabled?'동기화 폴더 연결됨':'아직 동기화 폴더가 없습니다'}</h3><p class="sync-path">${E(desktopSyncState.folder||'Google Drive의 개인 폴더를 선택하세요.')}</p><div class="actions"><button id="desktopChoose" class="primary">Google Drive 폴더 선택</button><button id="desktopNow">지금 동기화</button><button id="desktopDisconnect">이 PC 동기화 끄기</button><button id="desktopRecovery">적용 전 자동 백업 폴더</button></div><p id="desktopSyncDetail" role="status">${E(desktopSyncState.message)}</p></div><div id="desktopConflicts"></div><details><summary>다른 PC로 옮길 때 알아둘 점</summary><p>ChatGPT 로그인과 토큰은 동기화하지 않습니다. 집 PC에서 따로 로그인하세요. 기존 웹사이트의 기록은 웹사이트 백업 메뉴에서 JSON을 내려받아 이 앱의 백업 메뉴로 가져오면 됩니다. 웹사이트의 에셋 파일은 에셋 관리실에서 따로 백업·가져오세요.</p><p>앱을 닫기 전 동기화 확인 메시지와 Google Drive 업로드 완료를 확인하세요. 첨부파일 전체 한도는 80MB이며 큰 영상 원본은 Drive에 별도 보관하세요. 두 PC에서 동시에 수정하면 자동으로 덮어쓰지 않고 사용할 버전을 선택하게 합니다.</p><p>이 동기화는 원본 Google Drive 폴더를 통해 작동합니다. Drive가 꺼져 있거나 오프라인이면 다른 PC로 전달되지 않습니다. 보드와 결과는 이 PC에도 남습니다.</p></details></section>`;
  $v('desktopChoose').onclick=async()=>{try{const r=await invoke30('syncChoose');Object.assign(desktopSyncState,r);desktopSyncState.heads=[];desktopSyncState.message=r.enabled?'폴더를 연결했습니다. 첫 동기화를 확인 중입니다.':'폴더 선택을 취소했습니다.';render();await desktopTick();}catch(e){desktopSyncState.message=e.message;desktopStatus();}};
  $v('desktopNow').onclick=()=>void desktopTick();
  $v('desktopDisconnect').onclick=async()=>{try{Object.assign(desktopSyncState,await invoke30('syncDisconnect'));desktopSyncState.heads=[];desktopSyncState.message='이 PC의 자동 동기화를 껐습니다. 로컬 프로젝트와 Drive 파일은 유지합니다.';render();}catch(e){desktopSyncState.message=e.message;desktopStatus();}};
  $v('desktopRecovery').onclick=()=>void invoke30('recovery');desktopStatus();
}custom25[DESKTOP_SYNC_PAGE]=desktopSyncPage;
const desktopRender=render;render=function(){desktopRender();desktopStatus();};
window.addEventListener('blur',()=>void desktopTick());
document.addEventListener('focusout',()=>{clearTimeout(desktopSyncTimer);desktopSyncTimer=setTimeout(()=>void desktopTick(),1800);});
document.addEventListener('input',()=>{if(!desktopApplying)desktopGeneration++;},true);
setInterval(()=>void desktopTick(),15000);
document.querySelector('footer').textContent='Windows 개인 스튜디오 · ChatGPT 플랜 연결 · Google Drive 폴더 동기화 · 로그인 정보는 이 PC에만 저장';
invoke30('syncStatus').then(status=>{Object.assign(desktopSyncState,status);if(status.enabled)desktopSyncState.message='Google Drive 폴더 연결됨 · 최신 프로젝트 확인 중';desktopStatus();void desktopTick();}).catch(e=>{desktopSyncState.message=e.message;desktopStatus();});
document.documentElement.dataset.desktopReady='1';render();
