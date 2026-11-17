// usage: node render.js spec.json out.mp4
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
(async()=>{const spec=JSON.parse(fs.readFileSync(process.argv[2])),out=process.argv[3],fps=30;
const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'frames-'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+path.join(__dirname,'template.html'));await p.evaluate(()=>document.fonts.ready);
await p.evaluate(d=>init(d),spec);const n=Math.round(spec.duration*fps);
for(let i=0;i<n;i++){await p.evaluate(t=>setT(t),i/fps);await p.screenshot({path:path.join(tmp,String(i).padStart(5,'0')+'.png')})}
await b.close();const T=spec.duration;
// placeholder ambient pad (synthesised, royalty-free)
const pad=[110,164.81,220,277.18,329.63].map((f,i)=>`sine=f=${f}:d=${T},volume=${[.5,.35,.3,.18,.14][i]},tremolo=f=${.11+i*.05}:d=.6[a${i}]`).join(';');
execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',fps,'-i',path.join(tmp,'%05d.png'),'-filter_complex',
 `${pad};[a0][a1][a2][a3][a4]amix=inputs=5:normalize=0,lowpass=f=900,aecho=0.8:0.7:90|180:0.4|0.3,volume=0.5,afade=t=in:d=2,afade=t=out:st=${T-2}:d=2[a]`,
 '-map','0:v','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','medium','-r',fps,'-c:a','aac','-b:a','160k','-movflags','+faststart','-t',T,out]);
fs.rmSync(tmp,{recursive:true});console.log('wrote',out)})();
