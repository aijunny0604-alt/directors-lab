// 개발용 실제 연결 점검. 사용자 프로젝트는 읽지 않으며 별도 Chromium 프로필에서 합성 보드만 사용한다.
const {app,BrowserWindow,ipcMain,protocol,safeStorage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),resultDir=path.join(root,'test-results');
app.setName('Directors Lab');
app.setPath('userData',path.join(app.getPath('appData'),'Directors Lab'));
const ownsProfile=app.requestSingleInstanceLock();
protocol.registerSchemesAsPrivileged([{scheme:'directorapp',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win,calls=0,started=Date.now();
let previousReport;try{previousReport=JSON.parse(require('node:fs').readFileSync(path.join(resultDir,'live-verification.json'),'utf8'));}catch{}
const report={started:new Date().toISOString(),status:'running',calls:[],errors:[],latest:JSON.parse(require('node:fs').readFileSync(path.join(root,'upstream.json'),'utf8'))};
const flush=()=>fs.writeFile(path.join(resultDir,'live-verification.json'),JSON.stringify(report,null,2));
app.whenReady().then(async()=>{
  await fs.mkdir(resultDir,{recursive:true});
  if(!ownsProfile)throw Error('Directors Lab 앱을 닫은 뒤 실제 검증을 실행하세요.');
  const {Vault}=await import(pathToFileURL(path.join(root,'desktop/vault.mjs')));
  const {AIService}=await import(pathToFileURL(path.join(root,'desktop/service.mjs')));
  const {publicError}=await import(pathToFileURL(path.join(root,'desktop/errors.mjs')));
  const vault=await new Vault(path.join(app.getPath('appData'),'Directors Lab','account'),{encrypt:async t=>safeStorage.encryptString(t),decrypt:async b=>safeStorage.decryptString(b)}).load();
  if(!vault.status().sharing)throw Error('연결된 ChatGPT 플랜 권한 없음');
  const ai=new AIService(vault,{confirm:async()=>{},fetcher:async(url,opt)=>{
    if(url.endsWith('/responses')){const budget=app.commandLine.hasSwitch('meeting-only')?12:17;if(++calls>budget)throw Error('실제 점검 호출 상한 도달');const b=JSON.parse(opt.body);report.calls.push({number:calls,model:b.model,chars:JSON.stringify(b.input).length,endpoint:'/v1/responses',store:b.store,stream:b.stream,started:new Date().toISOString()});await flush();}
    const r=await fetch(url,opt);
    if(url.endsWith('/responses')){
      const last=report.calls.at(-1);Object.assign(last,{status:r.status,contentType:r.headers.get('content-type'),requestId:r.headers.get('x-request-id')});
      if(!r.headers.get('content-type')?.includes('text/event-stream')){const b=await r.clone().text();try{const x=JSON.parse(b);last.bodyShape={keys:Object.keys(x),type:x.type,status:x.status,errorCode:x.error?.code,detail:typeof x.detail==='string'?x.detail.slice(0,300):undefined,outputTypes:x.output?.map(y=>y.type)};}catch{last.bodyShape={length:b.length,prefix:b.slice(0,160)};}}
      await flush();
    }return r;
  }});
  const models=await ai.models(),model=models.find(m=>m.slug==='gpt-6.2-sol')?.slug||models[0].slug;
  report.model=model;report.auth={connected:true,planPermission:true,modelCount:models.length};
  for(const [name,fn] of Object.entries({status:()=>vault.status(),models:()=>ai.models(),infer:(m,p)=>ai.infer(m,p),inferMeta:(m,p)=>ai.infer(m,p,undefined,true),batchStart:(m,n,p)=>ai.batchStart(m,n,p),batchEnd:id=>ai.batchEnd(id),batchInfer:(id,p)=>ai.infer(ai.lease?.model,p,id),batchInferMeta:(id,p)=>ai.infer(ai.lease?.model,p,id,true),syncStatus:()=>({enabled:false,folder:''})}))ipcMain.handle('director:'+name,async(e,...args)=>{if(e.sender!==win.webContents||e.senderFrame!==win.webContents.mainFrame)return {ok:false,error:'forbidden'};try{const value=await fn(...args);if(value&&typeof value.text==='string'){const last=report.calls.at(-1);Object.assign(last,{completed:true,responseId:value.responseId,model:value.model,usage:value.usage,outputChars:value.text.length});try{const d=JSON.parse(value.text);last.outputShape={statementLength:d.statement?.length,replyLength:d.reply?.length,reviews:d.reviews?.length,actions:d.actions?.length};}catch{}await flush();}return {ok:true,value};}catch(err){const safe=publicError(err);report.errors.push({method:name,error:safe});await flush();return {ok:false,error:safe};}});
  const files={'/':'index.html','/studio.js':'studio.js','/desktop-ui.js':'desktop-ui.js','/desktop.css':'desktop.css'};
  const handler=async request=>{const u=new URL(request.url),file=u.hostname==='studio'?files[u.pathname]:null;if(!file)return new Response('404',{status:404});return new Response(await fs.readFile(path.join(root,file)),{headers:{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript; charset=utf-8'}});};
  win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{partition:'live-verification-isolated',preload:path.join(root,'desktop/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.webContents.session.protocol.handle('directorapp',handler);await win.loadURL('directorapp://studio/');
  await win.webContents.executeJavaScript(`window.confirm=()=>true;window.alert=()=>{};true;`);
  if(!app.commandLine.hasSwitch('meeting-only')){
  const connection=await ai.infer(model,'정확히 다음 문자열만 출력하세요: DIRECTOR_LAB_OK',undefined,true);report.connection={...connection,ok:connection.text.trim()==='DIRECTOR_LAB_OK'};await flush();
  if(!report.connection.ok)throw Error('연결 진단 문자열 불일치');
  report.production=await win.webContents.executeJavaScript(`(async()=>{
    desk30.status=await invoke30('status');desk30.models=await invoke30('models');desk30.model=${JSON.stringify(model)};
    S.v2.active='최신 원본 실제 협업 점검';project();const s=state28();
    Object.assign(s.h.brief,{concept:'반송 편지를 발견한 성인 우체부 지안이 퇴근을 미루고 발신인에게 돌려주기로 결심하는 30초 무성 단편.',format:'개인 단편 영화 기획',audience:'성인 관객',durationPlan:'30초 16:9 / 8초·12초·10초 세 장면',storyOutline:'폐점 직전 우체국. 반송 편지 발견 → 낡은 발신 주소가 어린 시절 자신의 주소였음을 알아봄 → 가방을 다시 메고 문을 나섬. 발신인 정체는 열린 결말.',visual:'따뜻한 늦은 오후 빛, 절제된 카메라 이동',constraints:'배우는 성인 지안 한 명. 우체국 내부와 문 앞. 대사·내레이션 없음. 원본 영상/이미지는 없으며 기획 단계다. 미정 세부는 승인 전 제안으로 구분.',deliverablePlan:'텍스트 연출 기획 및 검수. 실제 영상·이미지 생성 없음'});
    flowState28(s).goal='실제 역할별 호출과 선행 산출물 인수인계를 검증. 필요한 경우 구체적 수정 필요 판정.';
    globalThis.liveFixture={s,r:createRun34(s)};advanced30=false;open(FLOW28);await execute34(s,liveFixture.r,4);
    const r=liveFixture.r,logs=await journalRead37(r.id),ts=tasks28(r),stored=ts.filter(t=>latest28(r,t.id));
    return {run:r.id,sourceFresh:sourceFresh28(s,r),total:ts.length,stored:stored.map(t=>{const v=latest28(r,t.id);return {task:t.id,summary:v.data.summary,verdict:v.data.verdict||'',trace:v.trace37,responseId:v.responseId37,model:v.model37,usage:v.usage37,committed:logs.some(x=>x.trace===v.trace37&&x.kind==='committed')};}),handoffs:stored.slice(1).map((t,i)=>{const prev=latest28(r,stored[i].id),req=logs.find(x=>x.task===t.id&&x.kind==='request');return {from:stored[i].id,to:t.id,included:!!req?.payload?.includes(JSON.stringify(prev.data.summary).slice(1,-1))};}),message:live34.message,logs:logs.map(({payload,...x})=>x)};
  })()`);await flush();
  }else{
    report.connection=previousReport.connection;report.production=previousReport.production;report.productionSource=previousReport.latest;
    await win.webContents.executeJavaScript(`(async()=>{desk30.status=await invoke30('status');desk30.models=await invoke30('models');desk30.model=${JSON.stringify(model)};S.v2.active='최신 회의실 실호출 점검';project();const s=state28();Object.assign(s.h.brief,{concept:'성인 우체부 지안이 반송 편지의 주소가 어린 시절 자신의 집임을 알아보고 편지를 돌려주기로 결심한다.',format:'30초 16:9 무성 단편 기획',constraints:'성인 배우 1인, 우체국 내부와 문 앞. 대사와 내레이션 없음. 영상/이미지는 없는 텍스트 기획 점검. 8초/12초/10초의 세 장면. 발견 장면은 정적 촬영, 출구 장면은 이동 촬영 제안.'});globalThis.liveFixture={s};return true;})()`);
  }
  report.meeting=await win.webContents.executeJavaScript(`(async()=>{
    const s=liveFixture.s;const m=create39(s,'실제 상호작용 점검. 따뜻한 분위기의 30초 무성 단편에서 발견 순간은 정적인 화면을 유지하고 마지막 출구 장면에만 이동 촬영을 쓰는 방안을 검토하라. 편집과 촬영의 충돌을 다른 팀에게 직접 질문하고 구체적 대안을 요구하라.',8);globalThis.liveMeeting=m;open(MEETING38);
    // 전 부서 1차 의견과 첫 부서의 전 부서 검토를 실제 호출한다.
    for(let i=0;i<m.roles.length+1;i++){const before=m.turns.length;await execute39(s,m,true);if(m.turns.length===before)throw Error(room39.message);}
    // 원본 queue39가 생성한 지목 질문을 우선 실행하여 실제 발신 발언 ID→수신 답변을 검증한다.
    let addressed=m.plan.find(t=>t.kind==='reply'&&!saved39(m,t));
    if(!addressed){const first=m.turns[0];queue39(m,first.role,first.id,{to:'camera',kind:'question',text:'30초 무성 단편에서 발견 순간은 정적인 화면으로 유지하고 마지막 출구 장면에만 이동 촬영을 사용하는 대안에 답하라. 기획팀의 감정 유지 조건과 촬영 동선의 타협안을 구체적으로 제안하라.'});save();addressed=m.plan.find(t=>t.kind==='reply'&&!saved39(m,t));}
    const index=m.plan.indexOf(addressed),position=m.plan.findIndex(t=>!saved39(m,t));m.plan.splice(index,1);m.plan.splice(position,0,addressed);save();
    await execute39(s,m,true);
    const rows=await journalRead37(m.id),reply=m.turns.find(v=>v.task===addressed.id),request=rows.find(x=>x.kind==='request'&&x.task===addressed.id),origin=m.turns.find(v=>v.id===addressed.fromTurn);
    return {id:m.id,participants:m.roles,planned:m.plan.length,stored:m.turns.map(v=>({id:v.id,task:v.task,role:v.role,kind:v.kind,statement:v.data.statement,reply:v.data.reply,reviews:v.data.reviews,actions:v.data.actions,trace:v.trace,responseId:v.responseId,usage:v.usage,model:v.model,committed:rows.some(x=>x.trace===v.trace&&x.kind==='committed')})),interaction:{from:addressed.from,to:addressed.role,fromTurn:addressed.fromTurn,question:addressed.message,originalTurnExists:!!origin,originIncluded:!!request?.payload?.includes(addressed.fromTurn),priorIncluded:!!origin&&!!request?.payload?.includes(JSON.stringify(origin.data.statement).slice(1,-1)),replySaved:!!reply?.data.reply},message:room39.message,logs:rows.map(({payload,...x})=>x)};
  })()`);await flush();
  report.status=report.production.stored.length>=2&&report.production.handoffs.every(x=>x.included)&&report.meeting.interaction.replySaved&&report.meeting.interaction.priorIncluded?'passed':'partial';
  report.limitations=['합성 보드를 이용한 제작 실무→감독 검수와 수정 필요 중단, 전 부서 1차 의견 및 첫 부서의 2차 전 부서 의견 검토, 지목 답변 점검. 전체 회의 종결·A/B/C 회의록·인간 승인·집 PC 실동기화는 별도 검증 대상.','회의 점검은 원본 큐에서 생성된 지목 답변을 우선 실행했다. 다른 부서의 2차 의견과 최종 중재는 이 실행에서 미검증.'];
  report.finished=new Date().toISOString();report.elapsedSeconds=Math.round((Date.now()-started)/1000);await flush();await fs.writeFile(path.join(resultDir,'live-final.png'),(await win.webContents.capturePage()).toPNG());app.exit(0);
}).catch(async e=>{report.status='failed';report.failure=String(e.message||'live test failed').replace(/(?:Bearer\s+[^\s]+|sk-[\w-]+|eyJ[\w.-]{30,})/gi,'[인증정보 제외]').slice(0,700);await flush();app.exit(1);});
