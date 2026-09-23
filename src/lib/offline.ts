import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
const META_KEY='betar.offline.meta.v2';
export interface OfflineMeta {assetId:number;type:string;id:number;title:string;titleBn:string|null;subtitle:string;artworkUrl:string|null;duration:number|null;isPremium:boolean;href:string;size:number;downloadedAt:number;kind?:'hls'|'file';playlist?:string;playlistPath?:string;keyUrl?:string;keyPath?:string;segmentPaths?:string[];expiresAt?:number;localPath?:string;}
export const offlineRoot=`${RNFS.DocumentDirectoryPath}/betar-offline`;
async function read():Promise<Record<number,OfflineMeta>>{const raw=await AsyncStorage.getItem(META_KEY);try{return raw?JSON.parse(raw):{};}catch{return{};}}
async function write(all:Record<number,OfflineMeta>){await AsyncStorage.setItem(META_KEY,JSON.stringify(all));}
export async function saveOfflineMeta(meta:OfflineMeta){const all=await read();all[meta.assetId]=meta;await write(all);}
export async function getOfflineMeta(assetId:number){return (await read())[assetId]||null;}
export async function listOffline(){return Object.values(await read()).sort((a,b)=>b.downloadedAt-a.downloadedAt);}
function encodeBase64(bytes:Uint8Array){const table='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;out+=table[a>>2]+table[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?table[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?table[c&63]:'=');}return out;}
export async function putOfflineSegment(assetId:number,index:number,data:ArrayBuffer){await RNFS.mkdir(offlineRoot);const path=`${offlineRoot}/${assetId}-${index}.seg`;const bytes=new Uint8Array(data);await RNFS.writeFile(path,encodeBase64(bytes),'base64');}
export async function getOfflineSegment(assetId:number,index:number){const path=`${offlineRoot}/${assetId}-${index}.seg`;if(!(await RNFS.exists(path)))return null;const b64=await RNFS.readFile(path,'base64');const atobFn=(globalThis as any).atob as ((value:string)=>string)|undefined;const binary=atobFn?atobFn(b64):'';const out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out.buffer;}
async function remove(path?:string){if(path&&await RNFS.exists(path)){try{await RNFS.unlink(path);}catch{/* best effort */}}}
export async function deleteOffline(assetId:number){const all=await read();const m=all[assetId];delete all[assetId];await write(all);await remove(m?.localPath);await remove(m?.playlistPath);await remove(m?.keyPath);for(const p of m?.segmentPaths||[])await remove(p);}
export async function offlineSource(assetId:number):Promise<{kind:'file'|'hls';uri:string}|null>{const m=await getOfflineMeta(assetId);if(!m||m.expiresAt&&Date.now()>m.expiresAt){if(m)void deleteOffline(assetId);return null;}const p=m.kind==='hls'?m.playlistPath:m.localPath;if(!p||!(await RNFS.exists(p)))return null;return {kind:m.kind==='hls'?'hls':'file',uri:`file://${p}`};}
export async function requestPersistence(){return undefined;}



