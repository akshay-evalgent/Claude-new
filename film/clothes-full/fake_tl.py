import json,re
d=json.load(open("build/script.json"))
shots=[];t=0.3
for L in d["lines"]:
    for sid,txt in L["phrases"]:
        ws=re.findall(r"[A-Za-z0-9'āñóÖö]+|[.,?:!]",txt); dur=max(1.0,0.32*len([w for w in ws if w[0].isalnum()])); n=len(ws)
        words=[{"w":w,"s":round(dur*i/n,3),"e":round(dur*(i+1)/n,3)} for i,w in enumerate(ws)]
        sh={"id":sid,"text":txt,"words":words,"vs":t,"ve":t+dur,"start":t-0.1 if shots else 0,"end":0}; sh.update(d["visuals"][sid]); sh["idx"]=len(shots); shots.append(sh); t+=dur+0.2
for i,s in enumerate(shots): s["end"]=shots[i+1]["start"] if i+1<len(shots) else t+2
json.dump({"voice":"fake","duration":t+2,"shots":shots,"chapters":d["chapters"]},open("build/timeline_fake.json","w"))
print(len(shots),"shots")
