import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StreamResponse, AdDescriptor, PlayEventType, AudioAsset } from '../lib/types';
import { get, post, put } from '../lib/api';
import { currentEntitlements, useAuth } from './auth';
import { useUi } from './ui';
import { offlineSource } from '../lib/offline';
import { toTracks } from '../lib/tracks';

export interface PlayerTrack {
  key: string; type: 'song' | 'audio_asset' | 'podcast_episode' | 'episode' | 'broadcast_recording' | string;
  id: number; assetId: number; title: string; titleBn: string | null; subtitle: string;
  artworkUrl: string | null; duration: number | null; isPremium: boolean; href: string;
  startAt?: number; streamEndpoint?: string;
}
export interface PlayerState {
  queue: PlayerTrack[]; index: number; contextLabel: string | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'blocked'; position: number; duration: number;
  volume: number; muted: boolean; repeat: 'off' | 'all' | 'one'; shuffle: boolean;
  stream: StreamResponse | null; ad: AdDescriptor | null; adRemaining: number;
  playContext: (tracks: PlayerTrack[], startIndex?: number, label?: string, resumeFrom?: number) => void;
  playTrack: (track: PlayerTrack, resumeFrom?: number) => void; toggle: () => void;
  next: (userInitiated?: boolean) => void; prev: () => void; seek: (seconds: number) => void; close: () => void;
  setVolume: (v: number) => void; toggleMute: () => void; cycleRepeat: () => void;
  toggleShuffle: () => void; queueNext: (track: PlayerTrack) => void; queueLast: (track: PlayerTrack) => void;
  removeAt: (i: number) => void; jumpTo: (i: number) => void; clearQueue: () => void;
  moveInQueue: (from: number, to: number) => void;
}

type Engine = { play: () => void; pause: () => void; seek: (s: number) => void; setVolume: (v: number) => void };
let nativeEngine: Engine | null = null;
let loadToken = 0; let lastProgress = 0; let adTimer: ReturnType<typeof setInterval> | null = null;
let songsSinceAd = 0; let adEveryN = 2; let skipTimestamps: number[] = [];
const AD_SECONDS = 10;
const PICK_KEY = 'betar.picks';
let picksUsed = 0; let pickDay = '';
function dayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
void AsyncStorage.getItem(PICK_KEY).then(raw => { try { const x = raw ? JSON.parse(raw) : null; if (x?.day === dayKey()) { picksUsed = Number(x.used) || 0; pickDay = x.day; } } catch { /* ignore */ } });
function persistPicks() { const day = dayKey(); if (pickDay !== day) { pickDay = day; picksUsed = 0; } void AsyncStorage.setItem(PICK_KEY, JSON.stringify({ day, used: picksUsed })); }
function effectivePickLimit() { const e = currentEntitlements(); return e.is_premium ? 0 : Math.max(0, typeof e.daily_picks === 'number' ? e.daily_picks : 10); }
function consumePick() { const limit = effectivePickLimit(); if (!limit) return true; if (pickDay !== dayKey()) { pickDay = dayKey(); picksUsed = 0; } if (picksUsed >= limit) return false; picksUsed += 1; persistPicks(); return true; }
function picksSpent() { const l = effectivePickLimit(); return l > 0 && picksUsed >= l; }
function requireAuth() { if (useAuth.getState().token) return true; useUi.getState().openLoginPrompt('Please sign in to play. Listening on Bangladesh Betar is free — create an account to start playing.'); return false; }
function shuffled<T>(a: T[]) { const x = [...a]; for (let i=x.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; }
function sendEvent(event_type: PlayEventType, position: number) { const s=usePlayer.getState(); const t=s.queue[s.index]; if (!t || t.streamEndpoint) return; const payload:any={ event_type, position_seconds: Math.max(0,Math.floor(position)), platform: 'android' }; if (!useAuth.getState().token) payload.anonymous_id = anonymousId(); void post(`/assets/${t.assetId}/events`,payload).catch(()=>undefined); }
let anon: string | null = null;
function anonymousId() { if (!anon) anon = `mobile-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`; return anon; }
function clearAdTimer() { if (adTimer) { clearInterval(adTimer); adTimer = null; } }
function finishAd(completed: boolean) { clearAdTimer(); const s=usePlayer.getState(); const ad=s.ad; if (!ad) return; const payload:any={ad_campaign_id:ad.id,slot:ad.slot,platform:'android',completed}; if (!useAuth.getState().token) payload.anonymous_id=anonymousId(); void post('/ads/impression',payload).catch(()=>undefined); usePlayer.setState({ad:null,adRemaining:0,status:'loading'}); nativeEngine?.play(); usePlayer.setState({status:'playing'}); sendEvent('play',s.position); }
function startAd(ad: AdDescriptor) { clearAdTimer(); usePlayer.setState({ad,adRemaining:AD_SECONDS,status:'playing'}); const started=Date.now(); adTimer=setInterval(()=>{ const rem=Math.max(0,Math.ceil(AD_SECONDS-(Date.now()-started)/1000)); usePlayer.setState({adRemaining:rem}); if (rem<=0) finishAd(true); },200); }
export function registerPlayerEngine(engine: Engine | null) { nativeEngine=engine; }
export function notifyPlayerProgress(position:number,duration?:number) { const s=usePlayer.getState(); if (s.ad) { usePlayer.setState({adRemaining:Math.max(0,Math.ceil(s.adRemaining-(position-lastProgress)))}); return; } usePlayer.setState({position,duration:duration||s.duration}); if (position-lastProgress>=10 || position<lastProgress) { lastProgress=position; sendEvent('progress',position); } const stream=s.stream?.stream; if (stream?.is_preview && position>=stream.duration_seconds) { nativeEngine?.pause(); usePlayer.setState({status:'blocked'}); sendEvent('complete',stream.duration_seconds); if (useAuth.getState().token) useUi.getState().openUpgradePrompt(); else useUi.getState().openLoginPrompt('Sign in to keep listening — premium content plays a preview for guests.'); } }
export function notifyPlayerEnd() { const s=usePlayer.getState(); if (s.ad) return; sendEvent('complete',s.position || s.duration); if (s.repeat==='one') { nativeEngine?.seek(s.queue[s.index]?.startAt||0); nativeEngine?.play(); usePlayer.setState({position:0,status:'playing'}); sendEvent('replay',0); return; } s.next(false); }
export function notifyPlayerError() { usePlayer.setState({status:'paused'}); useUi.getState().toast('Playback failed for this item.','error'); }
async function fetchRadio(exclude?:number) { try { const r=await get<{data:AudioAsset[]}>(`/radio${exclude?`?exclude=${exclude}`:''}`); const x=toTracks(r.data||[]); return x.length?x[Math.floor(Math.random()*x.length)]:null; } catch { return null; } }
function enterRadio(replace:boolean) { const cur=usePlayer.getState(); void fetchRadio(cur.queue[cur.index]?.assetId).then(t=>{ if(!t){usePlayer.setState({status:'paused'});return;} const now=usePlayer.getState(); usePlayer.setState(replace||now.index<0?{queue:[t],index:0,contextLabel:'Radio mix'}:{queue:[...now.queue,t],index:now.queue.length,contextLabel:'Radio mix'}); void resolveCurrent(); }); }
async function resolveCurrent(resume?:number) { const token=++loadToken; const s=usePlayer.getState(); const track=s.queue[s.index]; if(!track)return; clearAdTimer(); usePlayer.setState({status:'loading',position:resume??track.startAt??0,duration:track.duration??0,stream:null,ad:null}); try { const local=await offlineSource(track.assetId); if(token!==loadToken)return; if(local) { const stream:any={asset_id:track.assetId,title:track.title,stream:{version:'offline',url:local.uri,is_hls:local.kind==='hls',expires_at:new Date(Date.now()+86400000).toISOString(),duration_seconds:track.duration||0,is_preview:false,bitrate_kbps:0},ad:null,requires_login_for_full:false}; usePlayer.setState({stream,duration:track.duration||0,status:'playing'}); nativeEngine?.play(); sendEvent('play',resume??0); return; }
  let stream:StreamResponse;
  if(track.streamEndpoint) { const x=await get<{data:{url:string;is_hls?:boolean;expires_at:string}}>(track.streamEndpoint); stream={asset_id:track.assetId,title:track.title,stream:{version:'broadcast-recording',url:x.data.url,is_hls:x.data.is_hls,expires_at:x.data.expires_at,duration_seconds:track.duration||0,is_preview:false,bitrate_kbps:0},ad:null,requires_login_for_full:true}; }
  else { const ads=currentEntitlements().ads_enabled && songsSinceAd>=adEveryN; stream=await get<StreamResponse>(`/assets/${track.assetId}/stream${ads?'?ad=1':''}`); if(typeof stream.ad_every_n_songs==='number'&&stream.ad_every_n_songs>0)adEveryN=stream.ad_every_n_songs; }
  if(token!==loadToken)return; usePlayer.setState({stream,duration:stream.stream.duration_seconds||track.duration||0}); if(stream.ad?.audio_url) { songsSinceAd=0; startAd(stream.ad); } else { if(currentEntitlements().ads_enabled)songsSinceAd++; nativeEngine?.play(); usePlayer.setState({status:'playing'}); sendEvent('play',resume??track.startAt??0); }
 } catch(e) { const status=(e as any)?.status; if(status===403)useUi.getState().openUpgradePrompt({title:'Premium content',body:'Upgrade to listen to this recording.'}); else useUi.getState().toast(status===404?'This item is not available for streaming.':e instanceof Error?e.message:'Could not start playback.','error'); usePlayer.setState({status:'idle',stream:null}); } }
function consumeSkip() { const e=currentEntitlements(); if(e.is_premium||e.skips_per_hour==null)return true; const now=Date.now(); skipTimestamps=skipTimestamps.filter(x=>now-x<3600000); if(skipTimestamps.length>=e.skips_per_hour){useUi.getState().toast(`Free listening allows ${e.skips_per_hour} skips per hour. Go Premium for unlimited skips.`,'premium');return false;} skipTimestamps.push(now);return true; }
function syncQueue() { if(!useAuth.getState().token)return; setTimeout(()=>{const s=usePlayer.getState(); void put('/me/queue',{items:s.queue.filter(t=>!t.streamEndpoint).map(t=>({type:t.type,id:t.id})),repeat_mode:s.repeat,shuffle:s.shuffle}).catch(()=>undefined);},2000); }
export const usePlayer=create<PlayerState>()(persist((set,getState)=>({queue:[],index:-1,contextLabel:null,status:'idle',position:0,duration:0,volume:.9,muted:false,repeat:'off',shuffle:false,stream:null,ad:null,adRemaining:0,
 playContext:(tracks,startIndex=0,label,resumeFrom)=>{if(!tracks.length||!requireAuth())return;if(!consumePick()){useUi.getState().openUpgradePrompt({title:"You've used today's free picks",body:`Free listening includes ${effectivePickLimit()} hand-picked plays a day, and you've used them all. Music keeps going as a random radio mix.`});if(getState().index<0||getState().status==='idle')enterRadio(true);return;} let queue=tracks,index=startIndex;if(getState().shuffle){const chosen=tracks[startIndex];queue=chosen?[chosen,...shuffled(tracks.filter((_,i)=>i!==startIndex))]:shuffled(tracks);index=0;} set({queue,index,contextLabel:label??null});void resolveCurrent(resumeFrom);syncQueue();},
 playTrack:(track,resumeFrom)=>getState().playContext([track],0,undefined,resumeFrom),
 toggle:()=>{const s=getState();if(s.status==='loading')return;if(s.status!=='playing'&&!requireAuth())return;if(s.status==='playing'){nativeEngine?.pause();set({status:'paused'});if(!s.ad)sendEvent('pause',s.position);}else if(s.status==='paused'||s.status==='blocked'){nativeEngine?.play();set({status:'playing'});if(!s.ad)sendEvent('play',s.position);}else if(s.queue[s.index])void resolveCurrent(s.position>5?s.position:undefined);},
 next:(userInitiated=false)=>{const s=getState();if(s.ad)return;if(userInitiated&&!consumeSkip())return;if(userInitiated)sendEvent('skip',s.position);if(picksSpent()){enterRadio(false);return;}if(!s.queue.length)return;let i=s.index+1;if(i>=s.queue.length){if(s.repeat==='all')i=0;else{nativeEngine?.seek(s.queue[s.index]?.startAt||0);nativeEngine?.pause();set({status:'paused',position:0});return;}}set({index:i});void resolveCurrent();},
 prev:()=>{const s=getState();if(s.ad)return;if(s.position>3){nativeEngine?.seek(s.queue[s.index]?.startAt||0);set({position:0});sendEvent('seek',0);return;}if(s.index<=0)return;set({index:s.index-1});void resolveCurrent();},
 close:()=>{const s=getState();if(s.status==='playing'&&!s.ad)sendEvent('pause',s.position);clearAdTimer();++loadToken;nativeEngine?.pause();set({queue:[],index:-1,contextLabel:null,status:'idle',position:0,duration:0,stream:null,ad:null,adRemaining:0});syncQueue();},
 seek:(seconds)=>{const s=getState();if(s.ad)return;if(!currentEntitlements().is_premium){useUi.getState().openUpgradePrompt({title:'Seeking is a Premium feature',body:'Upgrade to scrub to any moment in a recording.'});return;}const target=Math.max(0,Math.min(seconds,s.duration||seconds));nativeEngine?.seek(target);set({position:target});sendEvent('seek',target);},
 setVolume:v=>{const volume=Math.max(0,Math.min(1,v));nativeEngine?.setVolume(volume);set({volume,muted:volume===0});},toggleMute:()=>{const m=!getState().muted;nativeEngine?.setVolume(m?0:getState().volume);set({muted:m});},
 cycleRepeat:()=>{const o:['off','all','one']=['off','all','one'];const s=getState();set({repeat:o[(o.indexOf(s.repeat)+1)%3]});syncQueue();},toggleShuffle:()=>{const s=getState();if(!s.shuffle&&s.queue.length>1){const c=s.queue[s.index];const r=shuffled(s.queue.filter((_,i)=>i!==s.index));set({shuffle:true,queue:c?[c,...r]:r,index:c?0:-1});}else set({shuffle:!s.shuffle});syncQueue();},
 queueNext:t=>{const s=getState();if(s.index<0){getState().playTrack(t);return;}if(!consumePick()){useUi.getState().openUpgradePrompt();return;}const q=[...s.queue];q.splice(s.index+1,0,t);set({queue:q});useUi.getState().toast('Will play next.','success');syncQueue();},queueLast:t=>{const s=getState();if(s.index<0){getState().playTrack(t);return;}if(!consumePick()){useUi.getState().openUpgradePrompt();return;}set({queue:[...s.queue,t]});useUi.getState().toast('Added to queue.','success');syncQueue();},
 removeAt:i=>{const s=getState();if(i===s.index)return;const q=s.queue.filter((_,n)=>n!==i);set({queue:q,index:i<s.index?s.index-1:s.index});syncQueue();},jumpTo:i=>{const s=getState();if(!s.queue[i]|| (i!==s.index&&!consumeSkip()))return;set({index:i});void resolveCurrent();},clearQueue:()=>{const s=getState();const t=s.queue[s.index];nativeEngine?.pause();set({queue:t?[t]:[],index:t?0:-1,status:t?'paused':'idle',stream:t?s.stream:null});syncQueue();},moveInQueue:(from,to)=>{const s=getState();if(from===to||from<=s.index||to<=s.index||!s.queue[from]||to<0||to>=s.queue.length)return;const q=[...s.queue];const [x]=q.splice(from,1);q.splice(to,0,x);set({queue:q});syncQueue();}
}),{name:'betar.player',storage:createJSONStorage(()=>AsyncStorage),partialize:s=>({queue:s.queue,index:s.index,contextLabel:s.contextLabel,volume:s.volume,muted:s.muted,repeat:s.repeat,shuffle:s.shuffle})}));
export function useCurrentTrack(){return usePlayer(s=>s.queue[s.index]??null);}
