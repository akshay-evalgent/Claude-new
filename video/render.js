// usage: node render.js spec.json out.mp4          -> full video
//        node render.js spec.json sheet.png 1,5,9  -> contact sheet of stills at those seconds
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
(async()=>{const spec=JSON.parse(fs.readFileSync(process.argv[2])),out=process.argv[3],fps=spec.fps||30,T=spec.duration;
const stills=process.argv[4]&&process.argv[4].split(',').map(Number);
const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'frames-'));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const uri=f=>{const x=path.extname(f).slice(1);return 'data:image/'+(x==='jpg'?'jpeg':x)+';base64,'+fs.readFileSync(path.join(__dirname,f)).toString('base64')};
for(const s of spec.shots||[]){s.image=uri(s.image);s.depth=uri(s.depth)}
for(const s of spec.scenes||[]){s.image=uri(s.image);s.depth=uri(s.depth)}
for(const k in spec.images||{})spec.images[k]=uri(spec.images[k]);
if(spec.lyricsFile&&fs.existsSync(path.join(__dirname,spec.lyricsFile)))spec.lyricsText=fs.readFileSync(path.join(__dirname,spec.lyricsFile),'utf8');
if(spec.dataFile)spec.data=JSON.parse(fs.readFileSync(path.join(__dirname,spec.dataFile)));
const times=stills||[...Array(Math.round(T*fps))].map((_,i)=>i/fps);
const W=stills?1:+(process.env.WORKERS||4); // parallel browser pages
await Promise.all([...Array(W)].map(async(_,w)=>{const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+path.join(__dirname,spec.template||'template.html'));await p.evaluate(()=>document.fonts.ready);await p.evaluate(d=>init(d),spec);
 for(let i=w;i<times.length;i+=W){await p.evaluate(t=>setT(t),times[i]);await p.screenshot({path:path.join(tmp,String(i).padStart(5,'0')+'.png')})}}));
await b.close();const src=path.join(tmp,'%05d.png');
if(stills){execFileSync('ffmpeg',['-y','-loglevel','error','-i',src,'-vf',`scale=270:-1,tile=${times.length}x1`,'-frames:v','1',out])}
else{const v=['-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','medium','-r',fps,'-movflags','+faststart','-t',T,out];
 if(spec.audio==='none')execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',fps,'-i',src,...v]);
 else if(spec.audioFile)execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',fps,'-i',src,'-i',path.join(__dirname,spec.audioFile),'-map','0:v','-map','1:a','-c:a','aac','-b:a','192k',...v]);
 else{ // placeholder ambient pad (synthesised, royalty-free)
  const pad=[110,164.81,220,277.18,329.63].map((f,i)=>`sine=f=${f}:d=${T},volume=${[.5,.35,.3,.18,.14][i]},tremolo=f=${.11+i*.05}:d=.6[a${i}]`).join(';');
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',fps,'-i',src,'-filter_complex',
  `${pad};[a0][a1][a2][a3][a4]amix=inputs=5:normalize=0,lowpass=f=900,aecho=0.8:0.7:90|180:0.4|0.3,volume=0.5,afade=t=in:d=2,afade=t=out:st=${T-2}:d=2[a]`,
  '-map','0:v','-map','[a]','-c:a','aac','-b:a','160k',...v])}}
fs.rmSync(tmp,{recursive:true});console.log('wrote',out)})();
