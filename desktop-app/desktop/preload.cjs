const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name,...args)=>ipcRenderer.invoke('director:'+name,...args);
contextBridge.exposeInMainWorld('directorDesktop',Object.freeze({
  info:()=>invoke('info'),
  status:()=>invoke('status'),login:(id,force)=>invoke('login',id,force),select:id=>invoke('select',id),
  logout:()=>invoke('logout'),cancelLogin:()=>invoke('cancelLogin'),models:()=>invoke('models'),
  infer:(model,prompt)=>invoke('infer',model,prompt),batchStart:(model,count,project)=>invoke('batchStart',model,count,project),
  inferMeta:(model,prompt)=>invoke('inferMeta',model,prompt),batchInferMeta:(lease,prompt)=>invoke('batchInferMeta',lease,prompt),
  batchInfer:(lease,prompt)=>invoke('batchInfer',lease,prompt),batchEnd:lease=>invoke('batchEnd',lease),
  syncStatus:()=>invoke('syncStatus'),syncChoose:()=>invoke('syncChoose'),syncDisconnect:()=>invoke('syncDisconnect'),
  syncCycle:bundle=>invoke('syncCycle',bundle),syncAck:id=>invoke('syncAck',id),syncResolve:(id,bundle)=>invoke('syncResolve',id,bundle),
  recovery:()=>invoke('recovery')
}));
