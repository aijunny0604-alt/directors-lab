import { ServiceError, remoteError } from './errors.mjs';

export async function readResponseStream(response,{maxBytes=12*1024*1024,metadata=false}={}) {
  if(!response.ok) {let body={};try{body=await response.json();}catch{}throw remoteError(response.status,body,response.headers.get('x-request-id'));}
  const contentType=response.headers.get('content-type');
  if((contentType&&!contentType.toLowerCase().includes('text/event-stream')) || !response.body) throw new ServiceError('AI 응답 스트림 형식이 올바르지 않습니다.', 'invalid_stream');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let pending='',bytes=0,result='',completed=false,terminal=false,receipt={};
  function event(block) {
    const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
    if(!data||data==='[DONE]')return;
    let e;try{e=JSON.parse(data);}catch{throw new ServiceError('AI 응답 데이터가 손상되었습니다.', 'invalid_stream_event');}
    if(e.type==='response.failed'||e.type==='error') throw remoteError(0,{error:e.response?.error||e.error||e},response.headers.get('x-request-id'));
    if(e.type==='response.incomplete')throw new ServiceError('AI 응답이 끝까지 완료되지 않았습니다. 이 단계는 저장하지 않았습니다.', 'response_incomplete');
    if(e.type==='response.output_text.delta' && typeof e.delta==='string')result+=e.delta;
    if(e.type==='response.completed'){
      if(e.response?.status && e.response.status!=='completed')throw new ServiceError('AI 응답 완료 상태가 올바르지 않습니다.', 'response_incomplete');
      const final=(e.response?.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('');
      if(final)result=final;
      receipt={responseId:typeof e.response?.id==='string'?e.response.id:'',model:typeof e.response?.model==='string'?e.response.model:'',usage:e.response?.usage||null};
      completed=true;terminal=true;
    }
  }
  try {
    while(!terminal){
      const {value,done}=await reader.read();
      if(done){pending+=decoder.decode();if(pending.trim())event(pending);break;}
      bytes+=value.byteLength;if(bytes>maxBytes)throw new ServiceError('AI 응답이 최대 크기를 초과했습니다.', 'response_too_large');
      pending+=decoder.decode(value,{stream:true});
      let match;while((match=/\r?\n\r?\n/.exec(pending))){const block=pending.slice(0,match.index);pending=pending.slice(match.index+match[0].length);event(block);if(terminal)break;}
    }
    if(!completed)throw new ServiceError('연결이 완료 전에 끊겼습니다. 이 단계는 저장하지 않았습니다.', 'stream_interrupted');
    if(!result.trim())throw new ServiceError('AI가 텍스트 결과를 반환하지 않았습니다.', 'empty_response');
    return metadata?{text:result,...receipt,requestId:response.headers.get('x-request-id')||''}:result;
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
