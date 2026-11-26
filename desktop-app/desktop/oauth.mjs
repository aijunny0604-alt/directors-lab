import http from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ServiceError, remoteError } from './errors.mjs';

export const ISSUER = 'https://auth.openai.com';
export const RESOURCE = 'https://api.openai.com/v1';
export const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), {timeoutDuration:15000});
const opaque = () => randomBytes(32).toString('base64url');
export function same(a,b) { const x=Buffer.from(a||''), y=Buffer.from(b||''); return x.length===y.length && timingSafeEqual(x,y); }
export function authorizationURL({clientId, host, nonce, state, verifier, redirect, hint, email, force}) {
  const url = new URL(`${ISSUER}/api/accounts/authorize`);
  const params = { client_id:clientId||'dynamic_agent_client', ext_agent_host_id:host, response_type:'code', redirect_uri:redirect, scope:SCOPES, resource:RESOURCE, state, nonce, code_challenge_method:'S256', code_challenge:createHash('sha256').update(verifier).digest('base64url') };
  if (!clientId) params.agent_name_hint = 'Directors Lab';
  if (clientId && hint) params.id_token_hint = hint;
  if (clientId && email) params.login_hint = email;
  if (force) params.prompt = 'consent';
  for(const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  return url.toString();
}
export async function verifyIdentity(token, clientId, nonce, keySet=jwks) {
  const {payload} = await jwtVerify(token, keySet, { issuer:ISSUER, audience:clientId, algorithms:['RS256'], clockTolerance:10 });
  if (typeof payload.exp !== 'number' || typeof payload.sub !== 'string' || !payload.sub || (nonce !== undefined && !same(payload.nonce,nonce))) throw new ServiceError('로그인 응답의 계정 검증에 실패했습니다.', 'identity_validation_failed');
  return payload;
}
export async function tokenRequest(params, fetcher=fetch) {
  let response;
  try { response = await fetcher(`${ISSUER}/api/accounts/oauth/token`, { method:'POST', redirect:'error', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({...params,resource:RESOURCE}), signal:AbortSignal.timeout(30000) }); }
  catch { throw new ServiceError('공식 로그인 서버에 연결할 수 없습니다. 네트워크를 확인하세요.', 'token_network_error'); }
  let data; try { data=await response.json(); } catch { throw remoteError(response.status,{}); }
  if(!response.ok) throw remoteError(response.status,data,response.headers.get('x-request-id'));
  if(typeof data.access_token!=='string' || !data.access_token || String(data.token_type).toLowerCase()!=='bearer' || !Number.isFinite(data.expires_in) || data.expires_in<=0) throw new ServiceError('공식 로그인 응답 형식이 올바르지 않습니다.', 'token_response_invalid');
  return data;
}
export function prepareLogin({profile,host,force=false,openBrowser,exchange=tokenRequest,verify=verifyIdentity,timeout=180000}) {
  let server, timer, settled=false, redeeming=false, rejectResult;
  const state=opaque(),nonce=opaque(),verifier=opaque();
  const close=()=>{clearTimeout(timer);server?.close();server?.closeIdleConnections();};
  const cancel=()=>{if(!settled){settled=true;close();rejectResult(new ServiceError('로그인이 취소되었습니다.', 'login_cancelled'));}};
  const promise = new Promise((resolve,reject)=>{
    rejectResult=reject;
    const fail=(e)=>{if(!settled){settled=true;close();reject(e);}};
    server=http.createServer(async(req,res)=>{
      const port=server.address()?.port;
      const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"};
      const reply=(status,text)=>{res.writeHead(status,headers);res.end(`<html lang="ko"><meta charset="utf-8"><title>Directors Lab</title><body><h2>Directors Lab</h2><p>${text}</p></body></html>`);};
      if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${port}`){reply(400,'잘못된 요청입니다.');return;}
      const url=new URL(req.url,`http://127.0.0.1:${port}`);
      if(url.pathname!=='/auth/callback'){reply(404,'로그인 콜백 주소가 아닙니다.');return;}
      if(!same(url.searchParams.get('state'),state)){reply(400,'로그인 요청이 일치하지 않습니다. 앱에서 다시 시도하세요.');return;}
      if(settled||redeeming){reply(409,'이미 처리된 로그인입니다.');return;}
      redeeming=true;
      if(url.searchParams.has('error')){reply(400,'로그인이 완료되지 않았습니다. 앱으로 돌아가세요.');fail(remoteError(400,{error:url.searchParams.get('error')}));return;}
      const issued=url.searchParams.get('client_id');
      const client=profile?.client_id||issued;
      if(!client||client==='dynamic_agent_client'||!/^oaiapp_[a-zA-Z0-9_-]+$/.test(client)||(profile && issued && issued!==profile.client_id)||!url.searchParams.get('code')){reply(400,'앱 등록 응답이 올바르지 않습니다.');fail(new ServiceError('앱 등록 정보가 일치하지 않습니다.', 'registration_invalid'));return;}
      try {
        const data=await exchange({grant_type:'authorization_code',client_id:client,code:url.searchParams.get('code'),code_verifier:verifier,redirect_uri:`http://127.0.0.1:${port}/auth/callback`});
        if(settled) {reply(400,'로그인이 취소되었거나 시간이 초과되었습니다.');return;}
        const identity=await verify(data.id_token,client,nonce);
        if(profile && (identity.sub!==profile.subject || identity.iss!==profile.issuer)) throw new ServiceError('선택한 계정과 로그인한 계정이 다릅니다. 다른 계정 추가를 이용하세요.', 'identity_mismatch');
        if(settled) {reply(400,'로그인 시간이 초과되었습니다.');return;}
        settled=true;reply(200,'로그인 확인을 마쳤습니다. 이 창을 닫고 Directors Lab 앱으로 돌아가세요.');close();
        resolve({data,identity,clientId:client});
      } catch(e) {reply(400,'로그인을 완료하지 못했습니다. 앱의 안내를 확인하세요.');fail(e);}
    });
    server.on('error',()=>fail(new ServiceError('이 PC에서 로그인 응답용 연결을 열 수 없습니다.', 'loopback_unavailable')));
    server.listen(0,'127.0.0.1',async()=>{
      timer=setTimeout(()=>fail(new ServiceError('로그인 대기 시간이 지났습니다. 다시 로그인하세요.', 'login_timeout')),timeout);
      try {await openBrowser(authorizationURL({clientId:profile?.client_id,host,state,nonce,verifier,redirect:`http://127.0.0.1:${server.address().port}/auth/callback`,hint:profile?.id_token,email:profile?.email,force}));}
      catch {fail(new ServiceError('기본 브라우저를 열지 못했습니다.', 'browser_open_failed'));}
    });
  });
  return {promise,cancel};
}
