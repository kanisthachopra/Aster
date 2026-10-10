import type {AnalysisReport} from './types';
export interface ContextSnapshot {timestamp:number;dataUrl:string;}
function media(video:HTMLVideoElement,name:string,signal:AbortSignal):Promise<void>{return new Promise((resolve,reject)=>{
 const clear=()=>{clearTimeout(timer);video.removeEventListener(name,done);video.removeEventListener('error',bad);signal.removeEventListener('abort',bad);};
 const done=()=>{clear();resolve();},bad=()=>{clear();reject(new Error(signal.aborted?'Snapshot preview cancelled.':'This recording could not be decoded for the preview.'));};
 const timer=setTimeout(bad,12000);video.addEventListener(name,done,{once:true});video.addEventListener('error',bad,{once:true});signal.addEventListener('abort',bad,{once:true});if(signal.aborted)bad();
});}
/** Re-encode bounded original frames locally. Nothing is sent by this function. */
export async function contextSnapshots(file:File,report:AnalysisReport,signal:AbortSignal):Promise<ContextSnapshot[]>{
 const url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.preload='auto';video.playsInline=true;
 try{
  const ready=media(video,'loadeddata',signal);video.src=url;video.load();await ready;
  const canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const draw=canvas.getContext('2d');if(!draw)throw Error('Snapshot preview is unavailable.');
  const frames:ContextSnapshot[]=[];
  for(let i=0;i<6;i++){
   if(signal.aborted)throw Error('Snapshot preview cancelled.');
   const timestamp=.04+(Math.min(video.duration,report.duration)-.1)*i/5;
   const seek=media(video,'seeked',signal);video.currentTime=timestamp;await seek;draw.drawImage(video,0,0,canvas.width,canvas.height);
   const dataUrl=canvas.toDataURL('image/jpeg',.64);if(dataUrl.length>133000)throw Error('One snapshot is too large for the visual check. Your local review is still available.');
   frames.push({timestamp:Number(timestamp.toFixed(3)),dataUrl});
  }return frames;
 }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
