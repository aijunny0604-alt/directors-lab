import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPair,SignJWT} from 'jose';
import {authorizationURL,prepareLogin,verifyIdentity,ISSUER,SCOPES} from '../desktop/oauth.mjs';
import {readResponseStream} from '../desktop/stream.mjs';
import {FolderSync,validateBundle} from '../desktop/sync.mjs';
import {Vault} from '../desktop/vault.mjs';
import {AIService,credentials} from '../desktop/service.mjs';
import {publicError,remoteError} from '../desktop/errors.mjs';

const folder=()=>mkdtemp(join(tmpdir(),'dl-test-'));
const bundle=(text='original',file='hello')=>({schema:'dl-desktop-sync-1',storage:{'directors-lab-v1':JSON.stringify({done:{},notes:{},checks:{},records:[],text})},files:[{id:'asset1',mime:'text/plain',data:Buffer.from(file).toString('base64')}]});
const stream=(events,parts=false)=>{const text=events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join('');const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){if(parts){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));}else c.enqueue(bytes);c.close();}}),{headers:{'content-type':'text/event-stream'}});};
test('첫 등록과 재로그인 파라미터·호스트·PKCE',()=>{
  const base={host:'urn:uuid:abc',nonce:'n',state:'s',verifier:'v',redirect:'http://127.0.0.1:3456/auth/callback'};
  const first=new URL(authorizationURL(base));assert.equal(first.searchParams.get('client_id'),'dynamic_agent_client');assert.equal(first.searchParams.get('agent_name_hint'),'Directors Lab');assert.equal(first.searchParams.get('scope'),SCOPES);assert.equal(first.searchParams.get('code_challenge_method'),'S256');assert(!first.searchParams.has('prompt'));
  const again=new URL(authorizationURL({...base,clientId:'oaiapp_test',hint:'SECRET',email:'u@test',force:true}));assert(!again.searchParams.has('agent_name_hint'));assert.equal(again.searchParams.get('id_token_hint'),'SECRET');assert.equal(again.searchParams.get('prompt'),'consent');
});
test('ID 토큰 서명·issuer·audience·nonce 검증',async()=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const token=await new SignJWT({nonce:'nonce',email:'u@test'}).setProtectedHeader({alg:'RS256'}).setIssuer(ISSUER).setSubject('user').setAudience('oaiapp_test').setExpirationTime('5m').sign(privateKey);
  assert.equal((await verifyIdentity(token,'oaiapp_test','nonce',publicKey)).sub,'user');
  await assert.rejects(verifyIdentity(token,'oaiapp_other','nonce',publicKey));await assert.rejects(verifyIdentity(token,'oaiapp_test','wrong',publicKey));
});
test('루프백에서 잘못된 state를 무시하고 1회만 코드 교환',async()=>{
  let url,exchanges=0;const flow=prepareLogin({host:'urn:uuid:test',timeout:5000,openBrowser:async value=>{url=new URL(value);},exchange:async params=>{exchanges++;assert.equal(params.client_id,'oaiapp_test');assert.equal(params.redirect_uri,url.searchParams.get('redirect_uri'));return {id_token:'test'};},verify:async(_t,_c,nonce)=>{assert.equal(nonce,url.searchParams.get('nonce'));return {sub:'u',iss:ISSUER};}});
  while(!url)await new Promise(r=>setTimeout(r,5));
  const callback=new URL(url.searchParams.get('redirect_uri'));callback.searchParams.set('state','wrong');callback.searchParams.set('code','code');callback.searchParams.set('client_id','oaiapp_test');assert.equal((await fetch(callback)).status,400);assert.equal(exchanges,0);
  callback.searchParams.set('state',url.searchParams.get('state'));assert.equal((await fetch(callback)).status,200);assert.equal((await flow.promise).clientId,'oaiapp_test');assert.equal(exchanges,1);
});
test('재로그인 client_id 교체 거부',async()=>{
  let url;const flow=prepareLogin({host:'urn:uuid:test',profile:{client_id:'oaiapp_saved'},timeout:5000,openBrowser:async value=>{url=new URL(value);}});const rejected=assert.rejects(flow.promise,e=>e.code==='registration_invalid');while(!url)await new Promise(r=>setTimeout(r,5));const cb=new URL(url.searchParams.get('redirect_uri'));cb.searchParams.set('state',url.searchParams.get('state'));cb.searchParams.set('code','x');cb.searchParams.set('client_id','oaiapp_wrong');await fetch(cb);await rejected;
});
test('로그인 취소는 종료되고 자격증명을 만들지 않음',async()=>{const f=prepareLogin({host:'urn:uuid:test',openBrowser:async()=>{},timeout:1000});const rejection=assert.rejects(f.promise,e=>e.code==='login_cancelled');await new Promise(r=>setTimeout(r,10));f.cancel();await rejection;});
test('UTF-8 조각·CRLF 스트림과 완료 이벤트',async()=>{assert.equal(await readResponseStream(stream([{type:'response.output_text.delta',delta:'안녕 🌟'},{type:'response.completed',response:{status:'completed'}}],true)),'안녕 🌟');});
test('Content-Type 누락 시에도 완료 이벤트가 검증된 SSE만 허용',async()=>{const r=stream([{type:'response.output_text.delta',delta:'OK'},{type:'response.completed',response:{id:'resp_real',model:'m',status:'completed',usage:{total_tokens:10}}}]);r.headers.delete('content-type');const a=await readResponseStream(r,{metadata:true});assert.equal(a.text,'OK');assert.equal(a.responseId,'resp_real');assert.equal(a.usage.total_tokens,10);const bad=new Response(new TextEncoder().encode('unstructured response'));await assert.rejects(readResponseStream(bad));});
test('완료 이벤트 없이 끝난 응답을 저장하지 않음',async()=>{await assert.rejects(readResponseStream(stream([{type:'response.output_text.delta',delta:'partial'}])),e=>e.code==='stream_interrupted');});
test('중간 사용량 한도 실패를 성공으로 처리하지 않음',async()=>{await assert.rejects(readResponseStream(stream([{type:'response.output_text.delta',delta:'partial'},{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}])),e=>e.code==='subscription_sharing_usage_limit_exceeded');});
test('불완전·손상·빈 응답 실패',async()=>{await assert.rejects(readResponseStream(stream([{type:'response.incomplete'}])));await assert.rejects(readResponseStream(stream([{type:'response.completed',response:{status:'completed'}}])));await assert.rejects(readResponseStream(new Response('data: {bad}\n\n',{headers:{'content-type':'text/event-stream'}})));});
test('오류에 토큰·서버 임의 메시지가 노출되지 않음',()=>{const message=publicError(remoteError(401,{detail:'SECRET_TOKEN',error:{message:'SECRET_TOKEN',code:'invalid_grant'}},'req_test'));assert(!message.includes('SECRET_TOKEN'));assert(message.includes('req_test'));assert(!publicError(new Error('SECRET_TOKEN')).includes('SECRET_TOKEN'));});
test('호스트는 PC별로 생성·보존하고 토큰은 공개 상태에서 제외',async()=>{
  const a=await folder(),crypto={encrypt:async s=>Buffer.from(s).map(x=>x^123),decrypt:async b=>Buffer.from(b.map(x=>x^123)).toString()};
  const v=await new Vault(a,crypto).load();v.data.profiles=[{id:'a',email:'u@test',access_token:'SECRET',scopes:['chatgpt.tokens.use.direct']}];v.data.active='a';await v.save();
  assert(!(await readFile(join(a,'credentials.bin'))).includes(Buffer.from('SECRET')));assert(!JSON.stringify(v.status()).includes('SECRET'));assert.equal((await new Vault(a,crypto).load()).host,v.host);assert.notEqual((await new Vault(await folder(),crypto).load()).host,v.host);
});
test('만료 갱신 시 scope와 회전 토큰 보존',()=>{const old={refresh_token:'old',id_token:'id',scopes:['chatgpt.tokens.use.direct']};const c=credentials({access_token:'new',expires_in:3600,refresh_token:'rotated'},old);assert.equal(c.refresh_token,'rotated');assert.deepEqual(c.scopes,old.scopes);});
test('모델 목록·승인·플랜 요청 형식과 실패 시 유료 전환 없음',async()=>{
  const p={id:'p',email:'u',access_token:'secret',expires_at:Date.now()+3600000,scopes:['chatgpt.tokens.use.direct']};const vault={data:{active:'p'},active:()=>p};let confirmations=0,calls=[];
  const svc=new AIService(vault,{confirm:async()=>{confirmations++;},fetcher:async(url,options)=>{calls.push({url,options});if(url.endsWith('/models'))return Response.json({models:[{visibility:'list',slug:'selected',display_name:'모델'},{visibility:'hidden',slug:'hidden',display_name:'숨김'}]});const b=JSON.parse(options.body);assert.deepEqual(Object.keys(b).sort(),['input','model','store','stream']);assert.equal(b.store,false);assert.equal(b.stream,true);assert(Array.isArray(b.input));return stream([{type:'response.output_text.delta',delta:'OK'},{type:'response.completed'}]);}});
  assert.equal((await svc.models()).length,1);assert.equal(await svc.infer('selected','hello'),'OK');assert.equal(confirmations,1);assert.equal(calls.length,2);await assert.rejects(svc.infer('hidden','hi'));assert.equal(calls.length,2);
});
test('플랜 동의 없이는 모델·추론 요청을 보내지 않음',async()=>{const p={access_token:'secret',scopes:[]};const svc=new AIService({active:()=>p},{fetcher:()=>{throw Error('must not call');}});await assert.rejects(svc.models(),e=>e.code==='plan_consent_required');});
test('순차 실행은 승인한 횟수와 모델·계정에 묶임',async()=>{
  const p={access_token:'secret',scopes:['chatgpt.tokens.use.direct'],expires_at:Date.now()+3600000};let approvals=0;
  const v={data:{active:'p'},active:()=>p};const svc=new AIService(v,{confirm:async()=>approvals++,fetcher:async url=>url.endsWith('/models')?Response.json({models:[{visibility:'list',slug:'m',display_name:'M'}]}):stream([{type:'response.output_text.delta',delta:'ok'},{type:'response.completed'}])});
  const lease=await svc.batchStart('m',2,'Project');await assert.rejects(svc.select('other'));await svc.infer('m','one',lease);await svc.infer('m','two',lease);await assert.rejects(svc.infer('m','three',lease));assert.equal(approvals,1);svc.batchEnd(lease);assert.equal(svc.lease,null);
});
test('동기화에 인증 저장소·임의 키 포함 금지',()=>{const b=bundle();b.storage['OPENAI_API_KEY']='SECRET';assert.throws(()=>validateBundle(b));});
test('두 PC 동기화와 첨부파일·폴더 재선택',async()=>{
  const drive=await folder(),a=await new FolderSync(await folder()).init(),b=await new FolderSync(await folder()).init();await a.attach(drive);await b.attach(join(drive,'DirectorsLab-sync'));
  assert.equal((await a.cycle(bundle())).kind,'pushed');const pull=await b.cycle(bundle('empty',''));assert.equal(pull.kind,'pull');assert.equal(pull.bundle.files[0].data,Buffer.from('hello').toString('base64'));await b.acknowledge(pull.revision);assert.equal((await b.cycle(pull.bundle)).kind,'current');
  await a.cycle(bundle('edit'));const latest=await b.cycle(pull.bundle);assert.equal(latest.kind,'pull');assert(JSON.parse(latest.bundle.storage['directors-lab-v1']).text==='edit');
});
test('동시 수정은 양쪽 버전을 보존하고 명시 선택으로 해결',async()=>{
  const drive=await folder(),a=await new FolderSync(await folder()).init(),b=await new FolderSync(await folder()).init();await a.attach(drive);await b.attach(drive);await a.cycle(bundle());const initial=await b.cycle(bundle());await b.acknowledge(initial.revision);
  await a.cycle(bundle('A edit'));const conflict=await b.cycle(bundle('B edit'));assert.equal(conflict.kind,'conflict');assert.equal(conflict.heads.length,2);
  const selected=conflict.heads.find(h=>h.local);const resolved=await b.resolve(selected.id,bundle('B edit'));assert.equal(resolved.kind,'pull');await b.acknowledge(resolved.revision);assert.equal((await a.cycle(bundle('A edit'))).kind,'pull');assert.equal((await a.revisions()).heads.length,1);
});
test('원격 적용 대기 도중 새로 입력한 로컬 자료를 덮어쓰지 않음',async()=>{
  const drive=await folder(),a=await new FolderSync(await folder()).init(),b=await new FolderSync(await folder()).init();await a.attach(drive);await b.attach(drive);await a.cycle(bundle());const p=await b.cycle(bundle());await b.acknowledge(p.revision);await a.cycle(bundle('remote'));
  assert.equal((await b.cycle(bundle())).kind,'pull');const result=await b.cycle(bundle('new local'));assert.equal(result.kind,'conflict');assert.equal(result.heads.length,2);
});
test('해시가 다른 첨부파일을 적용하지 않음',async()=>{const drive=await folder(),a=await new FolderSync(await folder()).init(),b=await new FolderSync(await folder()).init();await a.attach(drive);await b.attach(drive);await a.cycle(bundle());const files=await readdir(join(a.config.folder,'blobs'));await writeFile(join(a.config.folder,'blobs',files[0]),'damaged');await assert.rejects(b.cycle(bundle('empty','')));});
