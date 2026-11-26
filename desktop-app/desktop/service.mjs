import { createHash, randomUUID } from 'node:crypto';
import { prepareLogin, tokenRequest, verifyIdentity, ISSUER, RESOURCE } from './oauth.mjs';
import { ServiceError, remoteError } from './errors.mjs';
import { readResponseStream } from './stream.mjs';

const terminalRefresh = new Set(['invalid_grant','invalid_refresh_token','token_expired','refresh_token_expired','refresh_token_invalidated','refresh_token_reused']);
export function credentials(data,old={}) {
  return { access_token:data.access_token, refresh_token:data.refresh_token||old.refresh_token||'', id_token:data.id_token||old.id_token||'', scopes:typeof data.scope==='string'?data.scope.split(/\s+/).filter(Boolean):(old.scopes||[]), expires_at:Date.now()+data.expires_in*1000 };
}
export class AIService {
  constructor(vault,{openBrowser,confirm,welcome,fetcher=fetch}) {Object.assign(this,{vault,openBrowser,confirm,welcome,fetcher});this.busy=false;this.lease=null;this.modelsCache=null;this.refreshing=null;}
  guard(){if(this.busy||this.lease)throw new ServiceError('진행 중인 AI 작업이 끝난 후 계정을 변경하세요.', 'busy');}
  async login(id='',force=false){
    this.guard();this.busy=true;
    try{
      const old=id?this.vault.data.profiles.find(p=>p.id===id):null;
      if(id&&!old)throw new ServiceError('저장된 계정을 찾을 수 없습니다.', 'profile_not_found');
      this.pending=prepareLogin({profile:old,host:this.vault.host,force,openBrowser:this.openBrowser});
      const {data,identity,clientId}=await this.pending.promise;
      const key=createHash('sha256').update(`${identity.iss}\n${identity.sub}\n${clientId}`).digest('hex');
      const existing=this.vault.data.profiles.find(p=>p.id===key);
      const profile={...existing,...credentials(data),id:key,client_id:clientId,subject:identity.sub,issuer:identity.iss,email:identity.email||'ChatGPT 계정'};
      this.vault.data.profiles=this.vault.data.profiles.filter(p=>p.id!==key).concat(profile);this.vault.data.active=key;
      await this.vault.save();this.modelsCache=null;
      if(profile.scopes.includes('chatgpt.tokens.use.direct')&&!profile.welcomed){await this.welcome();profile.welcomed=true;await this.vault.save();}
      return this.vault.status();
    }finally{this.pending=null;this.busy=false;}
  }
  cancelLogin(){this.pending?.cancel();return true;}
  async select(id){this.guard();if(!this.vault.data.profiles.some(p=>p.id===id))throw new ServiceError('저장된 계정을 찾을 수 없습니다.', 'profile_not_found');this.vault.data.active=id;await this.vault.save();this.modelsCache=null;return this.vault.status();}
  async token(){
    const p=this.vault.active();
    if(!p?.access_token)throw new ServiceError('ChatGPT 연결에서 먼저 로그인하세요.', 'sign_in_required');
    if(!p.scopes.includes('chatgpt.tokens.use.direct'))throw new ServiceError('플랜 동의 다시 요청을 눌러 ChatGPT 사용 권한을 승인하세요.', 'plan_consent_required');
    if(p.expires_at>Date.now()+90000)return p.access_token;
    if(this.refreshing){await this.refreshing;return p.access_token;}
    this.refreshing=(async()=>{
      if(!p.refresh_token)throw new ServiceError('다시 로그인해야 합니다.', 'refresh_required');
      let data;
      try{data=await tokenRequest({grant_type:'refresh_token',client_id:p.client_id,refresh_token:p.refresh_token},this.fetcher);}
      catch(e){if(terminalRefresh.has(e.code)){this.clearTokens(p);await this.vault.save();}throw e;}
      if(data.id_token){const identity=await verifyIdentity(data.id_token,p.client_id);if(identity.sub!==p.subject||identity.iss!==p.issuer)throw new ServiceError('갱신된 로그인 계정이 일치하지 않습니다.', 'identity_mismatch');}
      Object.assign(p,credentials(data,p));await this.vault.save();
      if(!p.scopes.includes('chatgpt.tokens.use.direct'))throw new ServiceError('ChatGPT 플랜 권한이 없어 요청을 중단했습니다.', 'plan_consent_required');
    })();
    try{await this.refreshing;return p.access_token;}finally{this.refreshing=null;}
  }
  clearTokens(p){delete p.access_token;delete p.refresh_token;delete p.id_token;p.expires_at=0;p.scopes=[];this.modelsCache=null;}
  async logout(){
    this.guard();this.busy=true;let confirmed=true;
    try{
      const p=this.vault.active();if(!p)return this.vault.status();
      if(p.refresh_token){
        confirmed=false;
        try{
          const discovery=await this.fetcher(`${ISSUER}/.well-known/openid-configuration`,{redirect:'error',signal:AbortSignal.timeout(10000)});
          if(!discovery.ok)throw Error();const config=await discovery.json();const endpoint=new URL(config.revocation_endpoint);
          if(endpoint.origin!==ISSUER||endpoint.username||endpoint.password)throw Error();
          for(let attempt=0;attempt<2;attempt++){
            const r=await this.fetcher(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:p.refresh_token,token_type_hint:'refresh_token',client_id:p.client_id}),signal:AbortSignal.timeout(10000)});
            if(r.status===200){confirmed=true;break;}if(r.status<500)break;await new Promise(r=>setTimeout(r,500));
          }
        }catch{}
      }
      this.clearTokens(p);await this.vault.save();return {...this.vault.status(),revocationConfirmed:confirmed};
    }finally{this.busy=false;}
  }
  async models(){
    if(this.busy)throw new ServiceError('다른 AI 작업 진행 중입니다.', 'busy');this.busy=true;
    try{return await this.fetchModels();}finally{this.busy=false;}
  }
  async fetchModels(){
    const token=await this.token();const r=await this.fetcher(`${RESOURCE}/models`,{redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
    let data={};try{data=await r.json();}catch{}if(!r.ok)throw remoteError(r.status,data,r.headers.get('x-request-id'));
    if(!Array.isArray(data.models))throw new ServiceError('계정 모델 목록 형식이 올바르지 않습니다.', 'model_catalog_invalid');
    const models=data.models.filter(m=>m.visibility==='list'&&typeof m.slug==='string'&&typeof m.display_name==='string').map(m=>({slug:m.slug,name:m.display_name}));
    if(!models.length)throw new ServiceError('이 계정에서 사용 가능한 모델이 없습니다.', 'no_models');
    this.modelsCache={profile:this.vault.data.active,models};return models;
  }
  async validateModel(model){
    if(typeof model!=='string'||model.length>150)throw new ServiceError('모델을 선택하세요.', 'invalid_model');
    if(!this.modelsCache||this.modelsCache.profile!==this.vault.data.active)await this.fetchModels();
    if(!this.modelsCache.models.some(m=>m.slug===model))throw new ServiceError('선택한 계정의 모델 목록을 새로고침하세요.', 'invalid_model');
  }
  async batchStart(model,count,project){
    this.guard();if(!Number.isInteger(count)||count<1||count>64)throw new ServiceError('한 번에 최대 64단계까지 실행할 수 있습니다.', 'batch_limit');
    this.busy=true;try{
      await this.validateModel(model);
      await this.confirm({model,count,project:typeof project==='string'?project.slice(0,200):''});
      const id=randomUUID();this.lease={id,model,profile:this.vault.data.active,remaining:count,expires:Date.now()+2*3600000};return id;
    }finally{this.busy=false;}
  }
  batchEnd(id){if(this.lease?.id===id)this.lease=null;return true;}
  async infer(model,prompt,leaseId,metadata=false){
    if(this.busy)throw new ServiceError('다른 AI 요청이 진행 중입니다.', 'busy');
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>100000)throw new ServiceError('요청은 1~100,000자여야 합니다.', 'invalid_prompt');
    this.busy=true;try{
      let lease;
      if(leaseId){lease=this.lease;if(!lease||lease.id!==leaseId||lease.model!==model||lease.profile!==this.vault.data.active||lease.remaining<1||lease.expires<Date.now())throw new ServiceError('순차 실행 승인이 만료되었습니다.', 'batch_expired');}
      else if(this.lease)throw new ServiceError('순차 실행이 끝난 후 다시 요청하세요.', 'busy');
      await this.validateModel(model);
      if(!lease)await this.confirm({model,count:1,characters:prompt.length});
      const token=await this.token();if(lease)lease.remaining--;
      const r=await this.fetcher(`${RESOURCE}/responses`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{role:'user',content:prompt}],store:false,stream:true}),signal:AbortSignal.timeout(300000)});
      return await readResponseStream(r,{metadata});
    }finally{this.busy=false;}
  }
}
