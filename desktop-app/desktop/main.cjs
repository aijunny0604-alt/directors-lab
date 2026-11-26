const {app,BrowserWindow,ipcMain,protocol,shell,dialog,safeStorage,Menu}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');

protocol.registerSchemesAsPrivileged([{scheme:'directorapp',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('Directors Lab');
if(app.commandLine.hasSwitch('smoke-test'))app.setPath('userData',path.join(__dirname,'..','test-results','chromium-profile'));
if(!app.requestSingleInstanceLock()){app.quit();}else{
  let window,ai,sync,publicError,initialized=false,closing=false,syncBusy=false;
  const URL_APP='directorapp://studio/';
  const root=path.join(__dirname,'..');
  const trusted=event=>window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&event.senderFrame.url===URL_APP;
  const allowedExternal=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['chatgpt.com','auth.openai.com','developers.openai.com','help.openai.com','learn.chatgpt.com','docs.google.com','drive.google.com','aijunny0604-alt.github.io','github.com'].includes(u.hostname);}catch{return false;}};
  async function external(value){if(allowedExternal(value))await shell.openExternal(value);}
  function register(name,fn){ipcMain.handle('director:'+name,async(event,...args)=>{
    if(!trusted(event))return {ok:false,error:'허용되지 않은 화면의 요청입니다.'};
    try{return {ok:true,value:await fn(...args)};}catch(error){return {ok:false,error:publicError(error)};}
  });}
  async function syncCall(fn){if(syncBusy)throw Error('busy');syncBusy=true;try{return await fn();}finally{syncBusy=false;}}
  async function createWindow(){
    window=new BrowserWindow({width:1440,height:980,minWidth:900,minHeight:650,backgroundColor:'#10151c',title:'Directors Lab · 개인 스튜디오',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});
    window.webContents.setWindowOpenHandler(({url})=>{void external(url);return {action:'deny'};});
    window.webContents.on('will-navigate',(e,url)=>{if(url!==URL_APP){e.preventDefault();void external(url);}});
    window.webContents.on('will-attach-webview',e=>e.preventDefault());
    window.webContents.session.setPermissionRequestHandler((wc,permission,callback)=>callback(false));
    window.webContents.session.setPermissionCheckHandler(()=>false);
    window.webContents.session.on('will-download',(event,item)=>{
      const u=item.getURL();if(!u.startsWith('blob:directorapp://studio/')&&!u.startsWith('data:'))event.preventDefault();
    });
    window.on('close',e=>{if((ai?.busy||syncBusy)&&!closing){e.preventDefault();void dialog.showMessageBox(window,{type:'info',message:'연결 또는 동기화 작업이 진행 중입니다.',detail:'로그인 중이라면 상단 메뉴의 로그인 취소를 누르세요. AI 요청은 현재 단계가 끝난 후 닫을 수 있습니다.'});}});
    window.once('ready-to-show',()=>{if(!app.commandLine.hasSwitch('smoke-test'))window.show();});
    await window.loadURL(URL_APP);
    if(app.commandLine.hasSwitch('connect'))await window.webContents.executeJavaScript("open('ChatGPT 협업 연결')");
    if(app.commandLine.hasSwitch('smoke-test')){
      const result=await window.webContents.executeJavaScript(`(async()=>{const st=await window.directorDesktop.status();const home=document.querySelector('#view')?.textContent?.length>0;open('ChatGPT 협업 연결');const connection=!!document.querySelector('#deskLogin30');open('기기 동기화');const sync=!!document.querySelector('#desktopChoose');const b=await desktopBundle();return {title:document.title,bridge:!!window.directorDesktop,home,connection,sync,nodeHidden:typeof require==='undefined',status:st.ok,ready:document.documentElement.dataset.desktopReady==='1',bundleValid:b.schema==='dl-desktop-sync-1',noOverflow:document.documentElement.scrollWidth<=window.innerWidth};})()`);
      await fs.writeFile(path.join(root,'test-results','sync-screen.png'),(await window.webContents.capturePage()).toPNG());
      await fs.writeFile(path.join(root,'test-results','smoke.json'),JSON.stringify(result,null,2));
      if(Object.values(result).some(v=>v===false))process.exitCode=1;
      closing=true;app.quit();
    }
  }
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.whenReady().then(async()=>{
    const {Vault}=await import(pathToFileURL(path.join(__dirname,'vault.mjs')));
    const {AIService}=await import(pathToFileURL(path.join(__dirname,'service.mjs')));
    const {FolderSync}=await import(pathToFileURL(path.join(__dirname,'sync.mjs')));
    ({publicError}=await import(pathToFileURL(path.join(__dirname,'errors.mjs'))));
    const data=app.commandLine.hasSwitch('smoke-test')?path.join(root,'test-results','profile'):app.getPath('userData');
    const vault=await new Vault(path.join(data,'account'),{
      encrypt:async text=>{if(!safeStorage.isEncryptionAvailable())throw Error('encryption unavailable');return safeStorage.encryptString(text);},
      decrypt:async bytes=>safeStorage.decryptString(bytes)
    }).load();
    sync=await new FolderSync(path.join(data,'project-sync')).init();
    ai=new AIService(vault,{
      openBrowser:external,
      confirm:async({model,count,project,characters})=>{
        const r=await dialog.showMessageBox(window,{type:'question',title:'ChatGPT 플랜 사용',message:count===1?'AI 요청 1회를 실행할까요?':`최대 ${count}단계를 순서대로 실행할까요?`,detail:`계정: ${vault.active()?.email}\n모델: ${model}${project?'\n프로젝트: '+project:''}${characters?'\n전송 텍스트: '+characters.toLocaleString()+'자':''}\n\n보드와 이전 결과의 텍스트를 OpenAI에 전송하며 ChatGPT 플랜 한도를 사용합니다. 다른 유료 API로 자동 전환하지 않습니다.`,buttons:['취소','AI 실행'],defaultId:0,cancelId:0,noLink:true});
        if(r.response!==1)throw new (await import(pathToFileURL(path.join(__dirname,'errors.mjs')))).ServiceError('AI 실행을 취소했습니다.','request_cancelled');
      },
      welcome:()=>dialog.showMessageBox(window,{type:'info',title:'ChatGPT 플랜 연결',message:'이 앱에서 ChatGPT 플랜을 사용합니다.',detail:'AI 요청은 계정의 플랜 한도 또는 승인된 크레딧을 사용합니다. ChatGPT 설정 → 사용량에서 이 앱의 한도를 관리할 수 있습니다. 기존 ChatGPT 대화와 메모리는 가져오지 않습니다.',buttons:['확인']})
    });
    register('status',()=>vault.status());register('login',(id,force)=>ai.login(typeof id==='string'?id:'',force===true));register('select',id=>ai.select(id));register('cancelLogin',()=>ai.cancelLogin());register('logout',async()=>{const r=await ai.logout();return {status:r,revoked:r.revocationConfirmed!==false};});register('models',()=>ai.models());register('infer',(model,prompt)=>ai.infer(model,prompt));register('batchStart',(model,count,project)=>ai.batchStart(model,count,project));register('batchInfer',(lease,prompt)=>ai.infer(ai.lease?.model,prompt,lease));register('batchEnd',lease=>ai.batchEnd(lease));
    register('syncStatus',()=>sync.status());register('syncCycle',bundle=>syncCall(()=>sync.cycle(bundle)));register('syncAck',id=>syncCall(()=>sync.acknowledge(id)));
    register('inferMeta',(model,prompt)=>ai.infer(model,prompt,undefined,true));register('batchInferMeta',(lease,prompt)=>ai.infer(ai.lease?.model,prompt,lease,true));
    register('syncDisconnect',()=>syncCall(()=>sync.disconnect()));
    register('syncChoose',async()=>{
      if(syncBusy)throw Error('busy');
      const choice=await dialog.showOpenDialog(window,{title:'Google Drive에서 두 PC가 함께 사용할 폴더 선택',properties:['openDirectory','createDirectory'],buttonLabel:'이 폴더 사용'});
      if(choice.canceled)return sync.status();
      const confirm=await dialog.showMessageBox(window,{type:'question',message:'이 Google Drive 폴더로 프로젝트를 동기화할까요?',detail:'선택한 폴더 아래 DirectorsLab-sync를 사용합니다. 기존 공유 자료가 있으면 이 PC로 가져옵니다. 이 PC 자료는 가져오기 전에 로컬 복구 폴더에 보관합니다.\n\n집 PC에서도 같은 Google 계정의 같은 폴더를 선택하세요. Drive 앱이 로그인되어 있고 파일 다운로드를 마친 상태여야 합니다. ChatGPT 로그인 정보는 동기화하지 않습니다.',buttons:['취소','연결'],defaultId:0,cancelId:0,noLink:true});
      return confirm.response===1?syncCall(()=>sync.attach(choice.filePaths[0])):sync.status();
    });
    register('syncResolve',async(id,bundle)=>{
      const confirm=await dialog.showMessageBox(window,{type:'question',message:'선택한 PC의 버전으로 이어서 작업할까요?',detail:'선택본을 현재 프로젝트에 적용하고 다른 PC에도 전달합니다. 양쪽 기존 버전은 공유 폴더 이력에 보존합니다.',buttons:['취소','선택본 사용'],defaultId:0,cancelId:0,noLink:true});
      if(confirm.response!==1)return {kind:'cancelled'};return syncCall(()=>sync.resolve(id,bundle));
    });
    register('recovery',async()=>{const folder=path.join(data,'project-sync','recovery');await fs.mkdir(folder,{recursive:true});await shell.openPath(folder);return true;});
    const staticFiles={'/':'index.html','/studio.js':'studio.js','/desktop-ui.js':'desktop-ui.js','/desktop.css':'desktop.css'};
    protocol.handle('directorapp',async request=>{
      const u=new URL(request.url);const file=u.hostname==='studio'?staticFiles[u.pathname]:null;
      if(!file||request.method!=='GET')return new Response('Not found',{status:404});
      const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';
      return new Response(await fs.readFile(path.join(root,file)),{headers:{'Content-Type':type,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",'X-Content-Type-Options':'nosniff'}});
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'Directors Lab',submenu:[{label:'ChatGPT 연결',click:()=>window.webContents.executeJavaScript("open('ChatGPT 협업 연결')")},{label:'기기 동기화',click:()=>window.webContents.executeJavaScript("open('기기 동기화')")},{label:'로그인 취소',click:()=>ai.cancelLogin()},{type:'separator'},{role:'quit',label:'종료'}]},
      {label:'편집',submenu:[{role:'undo',label:'실행 취소'},{role:'redo',label:'다시 실행'},{type:'separator'},{role:'cut',label:'잘라내기'},{role:'copy',label:'복사'},{role:'paste',label:'붙여넣기'},{role:'selectAll',label:'전체 선택'}]},
      {label:'보기',submenu:[{role:'resetZoom',label:'원래 크기'},{role:'zoomIn',label:'확대'},{role:'zoomOut',label:'축소'},{role:'togglefullscreen',label:'전체 화면'}]},
      {label:'도움말',submenu:[{label:'ChatGPT 사용량 관리',click:()=>external('https://chatgpt.com/settings/usage')},{label:'Google Drive 열기',click:()=>external('https://drive.google.com/')}]}
    ]));
    if(app.commandLine.hasSwitch('smoke-test'))await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    initialized=true;await createWindow();
  }).catch(async()=>{await dialog.showMessageBox({type:'error',message:'Directors Lab을 시작하지 못했습니다.',detail:'앱을 다시 실행하세요. 다른 PC의 로그인 폴더를 복사했다면 해당 PC에서 새로 로그인해야 합니다. 기존 프로젝트 폴더는 지우지 마세요.'});app.exit(1);});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>{if(!initialized)return;ai?.pending?.cancel();});
}
