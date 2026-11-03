// Episode 1: "What If You Could Hear What Everyone REALLY Thinks of You?"
// Source of truth for both the narration script and the visual shot list.
// Each shot: narration (spoken), bg, chars, bubbles, card, cam, props, fx.
// Character spec: [name, x, y, {pose, expr, flip, talk, scale}]
// Bubble spec:    [fromChar | [x,y], text, {at, kind:'thought'|'speech', dx, dy, dark, muted, w}]
// Card spec:      [text, {at, sub, size, dim, y}]
// Camera spec:    [[cx,cy,scale],[cx,cy,scale]]

const S = [];
function shot(o){ S.push(o); return o; }

// ───────────────────────── ACT 1 — THE GIFT ─────────────────────────
shot({ act:1, title:'The gift',
  n:"What if you could hear what everyone really thinks of you?",
  bg:'bedroom', chars:[['you',760,850,{pose:'sit',expr:'think'}]],
  card:['WHAT IF YOU COULD HEAR\nWHAT EVERYONE REALLY\nTHINKS OF YOU?',{at:0.15,size:96,dim:true}],
  cam:[[960,540,1],[960,540,1.05]], pad:0.9 });

shot({ n:"Not what they say. Not what they post. The real stuff. The thoughts they'd never say out loud.",
  bg:'bedroom', chars:[['you',760,850,{pose:'sit',expr:'neutral'}]],
  bubbles:[[[1300,330],'...',{at:0.6,muted:true}],[[1500,520],'...',{at:1.4,muted:true}],[[1150,230],'...',{at:2.2,muted:true}]],
  cam:[[900,560,1.1],[960,540,1]] });

shot({ n:"One morning, you wake up, and there's a voice in your head that isn't yours.",
  bg:'bedroom', chars:[['you',760,850,{pose:'sit',expr:'shocked'}]],
  bubbles:[[[1350,300],'Is he EVER going to get up?',{at:2.6,kind:'thought',w:20}]],
  cam:[[960,540,1],[860,560,1.18]] });

shot({ n:"It's your mum. She's in the kitchen. And she's thinking, 'If that boy sleeps through one more alarm, I'm selling his bed.'",
  bg:'kitchen', chars:[['mum',620,860,{pose:'stand',expr:'angry',flip:true}]],
  bubbles:[['mum',"If that boy sleeps through ONE more alarm, I'm selling his bed.",{at:2.4,w:24,dx:120}]],
  cam:[[900,540,1.05],[800,540,1.12]] });

shot({ n:"You stumble downstairs. 'Morning,' she says, smiling. In her head: 'He looks tired. Did he eat yesterday? I should make eggs.'",
  bg:'kitchen', chars:[['mum',620,860,{pose:'stand',expr:'happy',flip:true,talk:true}],['you',1150,860,{pose:'stand',expr:'tired',flip:true}]],
  bubbles:[['mum','Morning!',{at:1.4,kind:'speech',dx:-80,dy:40}],['mum','He looks tired. Did he eat yesterday? I should make eggs.',{at:3.6,w:22,dx:160,dy:-120}]],
  cam:[[960,540,1],[960,560,1.08]] });

shot({ n:"Okay. That's... kind of sweet, actually. Maybe this is a one-off. Maybe you're just dreaming.",
  bg:'kitchen', chars:[['you',1150,860,{pose:'hold',expr:'think',flip:true}]],
  props:[['toast',1150,590]],
  cam:[[1100,560,1.25],[1150,560,1.3]] });

shot({ n:"Then you get on the bus.",
  bg:'busstop', chars:[['you',560,870,{pose:'walk',expr:'neutral'}]],
  cam:[[960,540,1],[1100,540,1.08]] });

shot({ n:"Forty people. Forty heads. And every single one that notices you lights up like a notification.",
  bg:'bus', chars:[['you',960,900,{pose:'stand',expr:'nervous'}],['npc1',420,900,{pose:'sit',expr:'neutral'}],['npc2',700,900,{pose:'sit',expr:'neutral'}],['npc3',1240,900,{pose:'sit',expr:'neutral',flip:true}],['npc4',1520,900,{pose:'sit',expr:'neutral',flip:true}]],
  bubbles:[['npc1','!',{at:2.2}],['npc2','!',{at:2.5}],['npc3','!',{at:2.8}],['npc4','!',{at:3.1}]],
  cam:[[960,540,1],[960,540,1.04]] });

shot({ n:"'Nice hoodie.' 'He sat in my seat.' 'Is that the kid who fell asleep in maths?' 'Please don't sit next to me. Please don't sit next to me.'",
  bg:'bus', chars:[['you',960,900,{pose:'stand',expr:'shocked'}],['npc1',420,900,{pose:'sit',expr:'happy'}],['npc2',700,900,{pose:'sit',expr:'angry'}],['npc3',1240,900,{pose:'sit',expr:'think',flip:true}],['npc4',1520,900,{pose:'sit',expr:'nervous',flip:true}]],
  bubbles:[['npc1','Nice hoodie.',{at:0.3}],['npc2','He sat in MY seat.',{at:1.5,w:12}],['npc3','Is that the kid who fell asleep in maths?',{at:3.4,w:18}],['npc4',"Please don't sit next to me. Please don't sit next to me.",{at:5.8,w:18,dx:-40}]],
  cam:[[960,540,1.02],[1100,540,1.08]] });

shot({ n:"You sit next to that last one. Just to see what happens.",
  bg:'bus', chars:[['you',1300,900,{pose:'sit',expr:'smug'}],['npc4',1520,900,{pose:'sit',expr:'shocked',flip:true}]],
  bubbles:[['npc4','NOOOOOO.',{at:2.2,dx:-40}]],
  cam:[[1300,560,1.25],[1380,560,1.35]] });

shot({ n:"By the time you reach school, you've learned three things. One: people think about you a lot more than you'd expect.",
  bg:'hallway', chars:[['you',760,880,{pose:'walk',expr:'neutral'}],['npc5',1500,880,{pose:'stand',expr:'neutral',flip:true}],['npc6',1700,880,{pose:'stand',expr:'neutral',flip:true}]],
  bubbles:[['npc5','...',{at:1.0}],['npc6','...',{at:1.3}]],
  card:['1. People think about you\nMORE than you expect',{at:4.6,size:72,y:260}],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"Two: most of it is about your hair.",
  bg:'hallway', chars:[['you',960,880,{pose:'facepalm',expr:'tired'}]],
  bubbles:[[[520,320],'his hair tho',{at:0.4}],[[1460,300],'what is that hair',{at:0.9,w:12}],[[1300,620],'hair.',{at:1.4}]],
  card:["2. It's mostly about\nyour hair",{at:0.2,size:72,y:160}],
  cam:[[960,560,1.1],[960,560,1.15]] });

shot({ n:"And three: you can't turn it off.",
  bg:'hallway', chars:[['you',960,880,{pose:'ears',expr:'shocked'}]],
  props:[['swarm',960,560]],
  card:["3. You can't turn it OFF",{at:1.2,size:80,y:150}],
  cam:[[960,560,1.1],[960,560,1.2]] });

// ───────────────────────── ACT 2 — RULES AND SMALL WINS ─────────────────────────
shot({ act:2, title:'Rules and small wins',
  n:"So let's set some rules. You don't hear everything. You only hear thoughts that are about you.",
  bg:'void', chars:[['you',960,900,{pose:'point',expr:'neutral'}]],
  card:['THE RULES',{at:0.3,size:130,y:200}],
  bubbles:[[[1350,560],'Only thoughts about YOU',{at:3.6,w:14}]],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"If someone's thinking about lunch, silence. The moment they think about you, their voice is in your head. Clear as a text message.",
  bg:'cafeteria', chars:[['you',600,880,{pose:'sit',expr:'neutral'}],['npc2',1250,880,{pose:'sit',expr:'neutral',flip:true}]],
  bubbles:[['npc2','pizza pizza pizza',{at:0.8,muted:true,w:10}],['npc2','Wait. Is he staring at me?',{at:4.6,w:14,dx:-60}]],
  cam:[[960,560,1.05],[1000,560,1.12]] });

shot({ n:"It works within about ten metres. Walls don't matter. Headphones don't help.",
  bg:'void', chars:[['you',960,760,{pose:'stand',expr:'neutral',scale:0.6}],['npc1',600,760,{pose:'stand',expr:'neutral',scale:0.5}],['npc3',1300,760,{pose:'stand',expr:'neutral',scale:0.5,flip:true}],['npc5',1750,760,{pose:'stand',expr:'neutral',scale:0.5,flip:true}]],
  props:[['radius',960,600,{at:0.2}]],
  bubbles:[['npc1','in range',{at:1.6,w:10}],['npc3','in range',{at:1.9,w:10}],['npc5','...',{at:2.4,muted:true}]],
  card:['10 METRES',{at:0.4,size:90,y:150}],
  cam:[[960,540,1],[960,540,1.03]] });

shot({ n:"And you hear it in their actual voice. Which means you now know what your maths teacher sounds like when he's being honest.",
  bg:'classroom', chars:[['teacher',560,880,{pose:'point',expr:'neutral'}],['you',1300,880,{pose:'sit',expr:'nervous',flip:true}]],
  cam:[[960,540,1],[800,540,1.1]] });

shot({ n:"'If he gets this one wrong, I'm retiring.' You get it right. He's genuinely surprised. You know, because you heard it.",
  bg:'classroom', chars:[['teacher',560,880,{pose:'stand',expr:'shocked'}],['you',1300,880,{pose:'sit',expr:'smug',flip:true}]],
  bubbles:[['teacher',"If he gets this one wrong, I'm retiring.",{at:0.2,w:18,dx:200}],['teacher','...huh. Okay then.',{at:5.4,w:12,dx:200}]],
  cam:[[800,540,1.1],[960,540,1.05]] });

shot({ n:"Now, the fun part. Your crush. Mia. You've had three conversations with her this year, and you've overthought all of them.",
  bg:'hallway', chars:[['mia',1300,880,{pose:'stand',expr:'neutral',flip:true}],['you',520,880,{pose:'stand',expr:'nervous'}]],
  props:[['label',1300,300,{text:'MIA',at:2.0}]],
  cam:[[960,540,1],[1100,540,1.1]] });

shot({ n:"You walk past her locker. You wait. And then you hear it.",
  bg:'hallway', chars:[['mia',1300,880,{pose:'stand',expr:'neutral',flip:true}],['you',700,880,{pose:'walk',expr:'nervous',walkTo:1050}]],
  cam:[[960,540,1.05],[1100,540,1.15]] });

shot({ n:"'Oh no, he's doing the walk again. Why does he walk like that? ...It's kind of cute, though.'",
  bg:'hallway', chars:[['mia',1300,880,{pose:'stand',expr:'smug',flip:true}],['you',1050,880,{pose:'stand',expr:'nervous'}]],
  bubbles:[['mia',"Oh no, he's doing the walk again. Why does he walk like that?",{at:0.2,w:20,dx:-120}],['mia',"...it's kind of cute, though.",{at:4.6,w:16,dx:-120,dy:60}]],
  cam:[[1150,540,1.15],[1200,540,1.25]] });

shot({ n:"Kind of cute. KIND OF CUTE. You make it to the end of the hallway before you start celebrating.",
  bg:'hallway', chars:[['you',1500,880,{pose:'cheer',expr:'joy'}]],
  card:['KIND OF CUTE',{at:0.2,size:120,y:300}],
  cam:[[1200,540,1.05],[1400,540,1.15]] });

shot({ n:"This is where the power starts paying off. You know exactly when to make a joke, because you can hear when someone wants you to.",
  bg:'cafeteria', chars:[['you',960,880,{pose:'sit',expr:'happy',talk:true}],['leo',560,880,{pose:'sit',expr:'happy'}],['npc1',1360,880,{pose:'sit',expr:'neutral',flip:true}]],
  bubbles:[['npc1','say something funny',{at:3.8,w:12,dx:-40}],['leo','do the voice',{at:4.6,w:10,dx:40}]],
  cam:[[960,560,1.05],[960,560,1.1]] });

shot({ n:"You know when to shut up, because you can hear 'please stop talking' before anyone's face shows it.",
  bg:'cafeteria', chars:[['you',960,880,{pose:'facepalm',expr:'nervous'}],['leo',560,880,{pose:'sit',expr:'happy'}],['npc1',1360,880,{pose:'sit',expr:'happy',flip:true}]],
  bubbles:[['npc1','please stop talking',{at:1.8,w:12,dx:-40}]],
  cam:[[960,560,1.1],[1000,560,1.15]] });

shot({ n:"You know which teachers like you, which ones are pretending, and which one still remembers the fire alarm incident.",
  bg:'classroom', chars:[['teacher',420,880,{pose:'stand',expr:'happy'}],['teacher2',960,880,{pose:'stand',expr:'happy'}],['teacher3',1500,880,{pose:'cross',expr:'angry'}]],
  bubbles:[['teacher','good kid',{at:1.4,w:8}],['teacher2','ugh. him.',{at:3.0,w:8}],['teacher3','THE FIRE ALARM.',{at:5.0,w:10,dx:-80}]],
  cam:[[960,540,1],[960,540,1.04]] });

shot({ n:"Group project? You hear who's planning to do nothing, and you assign them the slides.",
  bg:'classroom', chars:[['you',700,880,{pose:'point',expr:'smug'}],['bully',1250,880,{pose:'sit',expr:'shocked',flip:true}],['npc6',1600,880,{pose:'sit',expr:'neutral',flip:true}]],
  bubbles:[['bully',"I'll just let them do it all.",{at:1.2,w:14,dx:-40}],['you','You. Slides.',{at:3.6,kind:'speech',dx:120}]],
  cam:[[960,560,1.05],[1000,560,1.1]] });

shot({ n:"Job interview for the weekend café? The manager thinks, 'I'll hire whoever mentions they can do Sundays.' So you mention you can do Sundays.",
  bg:'cafe', chars:[['manager',620,880,{pose:'stand',expr:'neutral',flip:true}],['you',1250,880,{pose:'stand',expr:'happy',talk:true}]],
  bubbles:[['manager',"I'll hire whoever mentions they can do Sundays.",{at:1.6,w:18,dx:120}],['you','I can do Sundays!',{at:6.0,kind:'speech',dx:-60,w:12}]],
  cam:[[960,540,1.02],[960,540,1.1]] });

shot({ n:"You're hired. You haven't lied once. You've just... listened.",
  bg:'cafe', chars:[['you',960,880,{pose:'wave',expr:'grin',apron:true}]],
  card:['HIRED',{at:0.2,size:140,y:220}],
  cam:[[960,560,1.1],[960,560,1.2]] });

shot({ n:"Within a month, you're the most liked person in your year. Not the loudest. Not the richest. Just the one who somehow always says the right thing.",
  bg:'hallway', chars:[['you',960,880,{pose:'stand',expr:'happy'}],['leo',600,880,{pose:'stand',expr:'happy'}],['mia',1320,880,{pose:'stand',expr:'happy',flip:true}],['npc3',380,880,{pose:'stand',expr:'joy',scale:0.7}],['npc5',1600,880,{pose:'stand',expr:'joy',flip:true,scale:0.7}]],
  bubbles:[['leo','he just gets it',{at:1.0,w:10}],['mia','best guy',{at:2.0,w:8,dx:-40}],['npc5','legend',{at:3.0,w:8,dx:-40}],['npc3','love him',{at:4.0,w:8}]],
  cam:[[960,540,1],[960,540,1.06]] });

shot({ n:"Your best friend, Leo, notices. 'Dude, what happened to you?' In his head: 'Seriously, what happened to him?'",
  bg:'hallway', chars:[['leo',700,880,{pose:'stand',expr:'think',talk:true}],['you',1200,880,{pose:'stand',expr:'smug',flip:true}]],
  bubbles:[['leo','Dude, what happened to you?',{at:1.6,kind:'speech',w:16,dx:140}],['leo','Seriously. What happened to him?',{at:4.6,w:16,dx:-120,dy:-60}]],
  cam:[[960,540,1.05],[900,540,1.12]] });

// ───────────────────────── ACT 3 — ESCALATION AND FAME ─────────────────────────
shot({ act:3, title:'Escalation and fame',
  n:"So you push it. You stop waiting for thoughts to come to you, and you start fishing for them.",
  bg:'hallway', chars:[['you',960,880,{pose:'ear',expr:'smug'}]],
  props:[['swarm',960,330,{small:true}]],
  cam:[[960,560,1.1],[960,560,1.25]] });

shot({ n:"You stand near the popular table and say your own name, loudly, for no reason. Six heads turn. Six opinions arrive.",
  bg:'cafeteria', chars:[['you',960,880,{pose:'arms_up',expr:'grin',talk:true}],['npc1',380,880,{pose:'sit',expr:'shocked'}],['npc2',620,880,{pose:'sit',expr:'angry'}],['npc3',1300,880,{pose:'sit',expr:'think',flip:true}],['npc4',1540,880,{pose:'sit',expr:'nervous',flip:true}],['npc5',1760,880,{pose:'sit',expr:'neutral',flip:true,scale:0.7}]],
  bubbles:[['npc1','why',{at:3.4,w:6}],['npc2','so loud',{at:3.7,w:8}],['npc3','bold',{at:4.0,w:6,dx:-20}],['npc4','is he ok',{at:4.3,w:8,dx:-40}],['npc5','ha',{at:4.6,w:4,dx:-40}]],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"You walk through the shopping centre on a Saturday just to see how strangers rate you. It's mixed.",
  bg:'mall', chars:[['you',900,880,{pose:'walk',expr:'neutral',walkTo:1100}],['npc6',380,880,{pose:'stand',expr:'neutral'}],['npc2',1550,880,{pose:'stand',expr:'neutral',flip:true}]],
  bubbles:[['npc6','7/10',{at:2.2,w:6}],['npc2','nice shoes',{at:3.2,w:8,dx:-40}],[[1200,300],'is he lost?',{at:4.4,w:10}]],
  cam:[[960,540,1],[1000,540,1.06]] });

shot({ n:"You go to a party and learn, in real time, what everyone thinks about your dancing. It's not mixed.",
  bg:'party', chars:[['you',960,880,{pose:'dance',expr:'joy'}],['npc1',480,880,{pose:'stand',expr:'shocked'}],['npc3',1440,880,{pose:'stand',expr:'nervous',flip:true}],['leo',300,880,{pose:'facepalm',expr:'tired',scale:0.75}]],
  bubbles:[['npc1','oh no',{at:3.6,w:6}],['npc3','why',{at:4.0,w:6,dx:-40}],['leo','someone stop him',{at:4.5,w:10}]],
  cam:[[960,540,1],[960,540,1.08]] });

shot({ n:"You start a channel. You're not funny, exactly, but you know what people want to hear before they know it themselves.",
  bg:'desk', chars:[['you',760,880,{pose:'sit',expr:'happy',talk:true}]],
  props:[['graph',1400,560,{at:2.5}]],
  cam:[[960,540,1],[1000,540,1.08]] });

shot({ n:"Every video lands. Every comment section is a love letter. Because you've already heard the criticism and fixed it before uploading.",
  bg:'desk', chars:[['you',760,880,{pose:'sit',expr:'smug'}]],
  props:[['counter',1400,420,{at:0.3,text:'1.2M',sub:'subscribers'}],['hearts',1400,760,{at:1.5}]],
  cam:[[1100,540,1.1],[1200,540,1.18]] });

shot({ n:"At school, people start to notice that you're never wrong about people.",
  bg:'hallway', chars:[['you',1300,880,{pose:'walk',expr:'smug',walkTo:1500}],['leo',500,880,{pose:'cross',expr:'think'}],['mia',760,880,{pose:'stand',expr:'think'}]],
  bubbles:[['leo','how does he DO that',{at:2.4,w:12}]],
  cam:[[960,540,1],[800,540,1.1]] });

shot({ n:"You settle arguments by telling both sides exactly what the other one thinks. It works. It also freaks everyone out.",
  bg:'cafeteria', chars:[['npc2',520,880,{pose:'point',expr:'angry'}],['you',960,880,{pose:'stand',expr:'neutral',talk:true}],['npc4',1400,880,{pose:'point',expr:'angry',flip:true}]],
  bubbles:[['npc2','she started it',{at:1.0,w:10}],['npc4','he started it',{at:1.4,w:10,dx:-40}],['you','You both think the OTHER one started it. Also you both want pizza.',{at:3.4,kind:'speech',w:22,dy:-80}]],
  cam:[[960,540,1.02],[960,540,1.1]] });

shot({ n:"Mia asks you how you always know. You say you're 'good at reading people.' She thinks, 'That's not reading. That's cheating.'",
  bg:'hallway', chars:[['mia',760,880,{pose:'cross',expr:'think'}],['you',1200,880,{pose:'stand',expr:'nervous',flip:true,talk:true}]],
  bubbles:[['you',"I'm just good at reading people.",{at:1.8,kind:'speech',w:16,dx:-80}],['mia',"That's not reading. That's cheating.",{at:5.0,w:16,dx:-80}]],
  cam:[[960,540,1.05],[960,540,1.12]] });

shot({ n:"A teacher pulls you aside. 'Are you recording people?' You say no. She thinks, 'Then how does he know I was going to fail him?'",
  bg:'classroom', chars:[['teacher2',700,880,{pose:'point',expr:'angry',talk:true}],['you',1200,880,{pose:'stand',expr:'nervous',flip:true}]],
  bubbles:[['teacher2','Are you recording people?',{at:1.0,kind:'speech',w:14,dx:140}],['teacher2','Then how does he know I was going to fail him?',{at:4.6,w:20,dx:-80,dy:-60}]],
  cam:[[960,540,1.05],[900,540,1.12]] });

shot({ n:"Then a video goes viral. You, at a street market, guessing strangers' first impressions of you out loud, word for word.",
  bg:'market', chars:[['you',960,880,{pose:'point',expr:'grin',talk:true}],['npc6',480,880,{pose:'stand',expr:'shocked'}],['npc1',1440,880,{pose:'hold',expr:'happy',flip:true}],['npc5',1700,880,{pose:'hold',expr:'happy',flip:true,scale:0.75}]],
  props:[['phone',1440,600,{flip:true}],['phone',1700,660,{flip:true}]],
  bubbles:[['npc6','weird jacket, nice smile',{at:1.2,w:12}],['you','"Weird jacket, nice smile." Right?',{at:3.6,kind:'speech',w:18}]],
  cam:[[960,540,1],[960,540,1.06]] });

shot({ n:"Twenty million views. The comments split in two. Half of them think you're psychic. The other half think you're a magician with a really good team.",
  bg:'void', chars:[],
  props:[['counter',960,380,{at:0.2,text:'20,000,000',sub:'views'}],['comments',960,760,{at:2.6}]],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"A university lab emails you. They want to test you. You say yes, because you can hear the professor thinking, 'If this is real, it changes everything.'",
  bg:'lab', chars:[['prof',620,880,{pose:'hold',expr:'think',flip:true}],['you',1250,880,{pose:'stand',expr:'neutral'}]],
  bubbles:[['prof','If this is real, it changes everything.',{at:5.0,w:18,dx:140}]],
  cam:[[960,540,1],[900,540,1.08]] });

shot({ n:"It's real. Ten volunteers behind a wall, thinking about you on cue. You repeat every single thought.",
  bg:'lab', chars:[['you',560,880,{pose:'stand',expr:'neutral',talk:true}],['prof',300,880,{pose:'hold',expr:'shocked',scale:0.8}],['npc1',1350,880,{pose:'sit',expr:'think',flip:true}],['npc3',1600,880,{pose:'sit',expr:'think',flip:true}],['npc4',1850,880,{pose:'sit',expr:'think',flip:true}]],
  props:[['wall',1000,880]],
  bubbles:[['npc1','blue elephant',{at:1.2,w:10,dx:-40}],['you','Blue elephant.',{at:2.4,kind:'speech',w:10}],['npc3','he is a nerd',{at:3.8,w:10,dx:-40}],['you','I am, apparently, a nerd.',{at:5.0,kind:'speech',w:14,dy:-70}]],
  cam:[[960,540,1],[960,540,1.04]] });

shot({ n:"By the end of the week, you're on the news. By the end of the month, you're on every news.",
  bg:'news', chars:[['reporter',560,880,{pose:'hold',expr:'happy',talk:true}],['you',1250,880,{pose:'sit',expr:'nervous'}]],
  props:[['ticker',960,980,{text:'BREAKING: TEEN CAN HEAR WHAT YOU THINK OF HIM  •  "IT\'S MOSTLY ABOUT MY HAIR"  •  BREAKING: TEEN CAN HEAR WHAT YOU THINK OF HIM'}]],
  cam:[[960,540,1],[960,540,1.06]] });

shot({ n:"And that's when the thoughts change.",
  bg:'void', chars:[['you',960,900,{pose:'stand',expr:'neutral'}]], fx:'dark',
  bubbles:[[[560,340],'...',{at:0.3}],[[1360,340],'...',{at:0.6}],[[560,340],'...',{at:1.4,dark:true}],[[1360,340],'...',{at:1.7,dark:true}]],
  cam:[[960,560,1.1],[960,560,1.2]] });

// ───────────────────────── ACT 4 — THE COST ─────────────────────────
shot({ act:4, title:'The cost',
  n:"Because now, everyone knows. And when people know you can hear them, they don't think about you less. They think about you constantly.",
  bg:'street', chars:[['you',960,880,{pose:'stand',expr:'nervous'}],['npc1',300,880,{pose:'stand',expr:'nervous',scale:0.8}],['npc2',560,880,{pose:'stand',expr:'nervous',scale:0.85}],['npc3',1360,880,{pose:'stand',expr:'nervous',flip:true,scale:0.85}],['npc4',1620,880,{pose:'stand',expr:'nervous',flip:true,scale:0.8}]],
  props:[['swarm',960,300,{dark:true}]],
  cam:[[960,540,1],[960,540,1.08]] });

shot({ n:"Walking down the street used to be forty voices. Now it's four hundred, and every one of them is trying to be careful.",
  bg:'street', chars:[['you',960,880,{pose:'walk',expr:'tired'}],['npc5',420,880,{pose:'stand',expr:'nervous'}],['npc6',1500,880,{pose:'stand',expr:'nervous',flip:true}]],
  bubbles:[['npc5',"don't think anything",{at:3.4,w:12,dark:true}],['npc6','be normal be normal',{at:4.2,w:10,dark:true,dx:-40}]],
  card:['400 VOICES',{at:1.0,size:100,y:150}],
  cam:[[960,540,1.02],[960,540,1.1]] });

shot({ n:"'Don't think anything weird. Don't think anything weird.' 'I wonder if he can hear this.' 'He can definitely hear this.'",
  bg:'street', chars:[['you',960,880,{pose:'ears',expr:'sad'}],['npc5',420,880,{pose:'stand',expr:'nervous'}],['npc6',1500,880,{pose:'stand',expr:'nervous',flip:true}],['npc2',1750,880,{pose:'stand',expr:'nervous',flip:true,scale:0.8}]],
  bubbles:[['npc5',"Don't think anything weird. Don't think anything weird.",{at:0.2,w:16,dark:true}],['npc6','I wonder if he can hear this.',{at:3.6,w:14,dark:true,dx:-40}],['npc2','He can DEFINITELY hear this.',{at:5.8,w:14,dark:true,dx:-120,dy:60}]],
  cam:[[960,540,1.05],[960,560,1.15]] });

shot({ n:"You stop going out.",
  bg:'bedroom_night', chars:[['you',760,850,{pose:'sit',expr:'sad'}]], fx:'dark',
  cam:[[960,540,1.05],[900,560,1.15]] });

shot({ n:"At home, it's quieter. Mostly. Your mum thinks about you every eleven minutes. You've counted.",
  bg:'kitchen', chars:[['mum',620,860,{pose:'hold',expr:'sad',flip:true}]],
  props:[['mug',620,600]],
  bubbles:[['mum','Is he okay?',{at:2.8,w:10,dx:120}]],
  card:['every 11 minutes',{at:4.4,size:70,y:150}],
  cam:[[900,540,1.05],[820,540,1.15]] });

shot({ n:"Most of it is worry. 'Is he eating.' 'Is he sleeping.' 'Should I knock.' She never knocks. She just stands outside the door, thinking about you.",
  bg:'door', chars:[['mum',620,880,{pose:'stand',expr:'sad'}]], fx:'dark',
  bubbles:[['mum','Is he eating.',{at:1.0,w:10,dx:120}],['mum','Is he sleeping.',{at:2.2,w:10,dx:120,dy:-80}],['mum','Should I knock.',{at:3.4,w:10,dx:120,dy:-160}]],
  cam:[[960,540,1.05],[900,540,1.12]] });

shot({ n:"You start noticing the silences too. The people who never think about you at all.",
  bg:'classroom', chars:[['you',960,880,{pose:'sit',expr:'sad'}],['npc1',420,880,{pose:'sit',expr:'neutral',grey:true}],['npc3',1400,880,{pose:'sit',expr:'neutral',flip:true,grey:true}],['npc6',1700,880,{pose:'sit',expr:'neutral',flip:true,grey:true}]],
  fx:'grey',
  cam:[[960,540,1],[960,540,1.06]] });

shot({ n:"The girl you sit behind in history. Your cousin. The guy you've said 'hey' to every morning for two years. Nothing. You're not in there.",
  bg:'void', chars:[['npc1',480,900,{pose:'stand',expr:'neutral',grey:true}],['npc6',960,900,{pose:'stand',expr:'neutral',grey:true}],['npc3',1440,900,{pose:'stand',expr:'neutral',grey:true}]],
  bubbles:[['npc1',' ',{at:0.8,muted:true,w:8}],['npc6',' ',{at:2.4,muted:true,w:8}],['npc3',' ',{at:4.6,muted:true,w:8}]],
  fx:'grey',
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"Turns out there's something worse than hearing what people think of you. It's hearing that they don't.",
  bg:'void', chars:[['you',960,900,{pose:'slump',expr:'sad'}]], fx:'dark',
  card:['silence.',{at:4.6,size:110,y:260}],
  cam:[[960,560,1.1],[960,560,1.2]] });

shot({ n:"Then there's Leo.",
  bg:'street', chars:[['leo',700,880,{pose:'walk',expr:'happy',walkTo:820}],['you',1200,880,{pose:'stand',expr:'neutral',flip:true}]],
  cam:[[960,540,1.05],[960,540,1.1]] });

shot({ n:"Leo's been your best friend since you were six. And one afternoon, while you're laughing about something, you hear him think, 'I miss when he was normal.'",
  bg:'street', chars:[['leo',700,880,{pose:'stand',expr:'joy',talk:true}],['you',1200,880,{pose:'stand',expr:'joy',flip:true}]],
  bubbles:[['leo','I miss when he was normal.',{at:7.2,w:14,dark:true,dx:160}]],
  cam:[[960,540,1.05],[900,540,1.15]] });

shot({ n:"He didn't say it. He'd never say it. But you heard it, and now it's the only thing you can hear.",
  bg:'street', chars:[['leo',700,880,{pose:'stand',expr:'happy'}],['you',1200,880,{pose:'stand',expr:'sad',flip:true}]], fx:'dark',
  bubbles:[[[1300,260],'I miss when he was normal.',{at:0.2,w:14,dark:true}],[[1550,460],'when he was normal.',{at:1.6,w:12,dark:true}],[[1380,640],'normal.',{at:3.0,w:8,dark:true}]],
  cam:[[1150,540,1.2],[1250,540,1.35]] });

shot({ n:"You try to act normal. But he can tell you're acting, and you can hear him figuring that out.",
  bg:'street', chars:[['leo',700,880,{pose:'cross',expr:'think'}],['you',1200,880,{pose:'wave',expr:'nervous',flip:true,talk:true}]],
  bubbles:[['you','Ha ha. Yeah. Totally normal.',{at:0.8,kind:'speech',w:14,dx:-80}],['leo',"he's acting weird.",{at:3.8,w:12,dx:140}]],
  cam:[[960,540,1.05],[960,540,1.12]] });

shot({ n:"And Mia? Mia stopped thinking about you the day the video went viral. You know, because you were listening.",
  bg:'hallway', chars:[['mia',600,880,{pose:'walk',expr:'neutral',walkTo:400,flip:true}],['you',1300,880,{pose:'stand',expr:'sad',flip:true}]], fx:'grey',
  bubbles:[['mia',' ',{at:2.6,muted:true,w:8,dx:120}]],
  cam:[[960,540,1.05],[900,540,1.12]] });

shot({ n:"This is the part nobody puts in the superpower brochure.",
  bg:'bedroom_night', chars:[['you',760,850,{pose:'sit',expr:'tired'}]], fx:'dark',
  card:['NOT IN THE\nBROCHURE',{at:1.2,size:90,y:200}],
  cam:[[960,540,1.05],[900,540,1.12]] });

shot({ n:"You thought you'd gotten a cheat code for people. You actually got a microphone pointed at the one thing people are supposed to keep to themselves.",
  bg:'void', chars:[['you',700,900,{pose:'point',expr:'neutral'}],['npc2',1300,900,{pose:'stand',expr:'nervous',flip:true}],['npc4',1560,900,{pose:'stand',expr:'nervous',flip:true,scale:0.85}]],
  props:[['mic',900,620]],
  cam:[[960,540,1],[960,540,1.08]] });

shot({ n:"Then one night, your grandma gets rushed to the hospital.",
  bg:'hospital_ext', chars:[], fx:'dark',
  cam:[[960,540,1],[960,540,1.08]] });

shot({ n:"She can't speak. The doctors say she might not. Your mum is crying in the hallway. Your dad is pretending he isn't.",
  bg:'hospital_hall', chars:[['mum',700,880,{pose:'facepalm',expr:'sad'}],['dad',1150,880,{pose:'cross',expr:'sad',flip:true}],['you',1600,880,{pose:'stand',expr:'sad',flip:true,scale:0.85}]],
  bubbles:[['dad',"I'm fine. I'm fine. I'm fine.",{at:5.0,w:12,dark:true,dx:-80}]],
  cam:[[960,540,1],[960,540,1.08]] });

shot({ n:"You sit by the bed. You hold her hand. And you hear her.",
  bg:'hospital_room', chars:[['grandma',1430,790,{pose:'lie',expr:'tired'}],['you',640,880,{pose:'sit',expr:'sad'}]],
  cam:[[960,540,1],[1000,540,1.12]] });

shot({ n:"'There he is. My favourite. Look at him, all worried. Tell him I'm not scared. Tell him I'm proud of him. Tell him.'",
  bg:'hospital_room', chars:[['grandma',1430,790,{pose:'lie',expr:'happy'}],['you',640,880,{pose:'sit',expr:'sad'}]],
  bubbles:[['grandma','There he is. My favourite. Look at him, all worried.',{at:0.2,w:18,dx:-80,dy:-20}],['grandma',"Tell him I'm not scared. Tell him I'm proud of him. Tell him.",{at:4.4,w:20,dx:-80,dy:-20}]],
  cam:[[1000,540,1.12],[1050,540,1.2]] });

shot({ n:"So you tell your mum. Word for word. Everything grandma can't say.",
  bg:'hospital_room', chars:[['grandma',1430,790,{pose:'lie',expr:'happy'}],['you',560,880,{pose:'stand',expr:'neutral',talk:true}],['mum',300,880,{pose:'stand',expr:'sad',scale:0.9}]],
  bubbles:[['you',"She says she's not scared. She says she's proud of you.",{at:1.2,kind:'speech',w:18,dx:120}]],
  cam:[[800,540,1.05],[700,540,1.12]] });

shot({ n:"And for the first time since this started, the power doesn't feel like a curse. It feels like the only thing in the room that's doing any good.",
  bg:'hospital_room', chars:[['grandma',1430,790,{pose:'lie',expr:'joy'}],['you',560,880,{pose:'stand',expr:'happy'}],['mum',380,880,{pose:'stand',expr:'joy',scale:0.9}],['dad',200,880,{pose:'stand',expr:'happy',scale:0.9}]],
  fx:'warm',
  cam:[[800,540,1.05],[850,540,1.15]] });

shot({ n:"She gets better, by the way. Slowly. And every day she tells you, out loud, the same thing she was thinking. Just to make sure you heard it both ways.",
  bg:'kitchen', chars:[['grandma',620,860,{pose:'sit',expr:'joy',talk:true}],['you',1150,860,{pose:'stand',expr:'happy',flip:true}]],
  bubbles:[['grandma',"I'm proud of you.",{at:4.6,kind:'speech',w:12,dx:160}],['grandma',"I'm proud of you.",{at:6.4,w:12,dx:160,dy:-120}]],
  cam:[[960,540,1],[900,540,1.1]] });

// ───────────────────────── ACT 5 — THE CHOICE ─────────────────────────
shot({ act:5, title:'The choice',
  n:"A week later, a stranger sits next to you on the bus.",
  bg:'bus', chars:[['you',1300,900,{pose:'sit',expr:'neutral'}],['stranger',1520,900,{pose:'sit',expr:'neutral',flip:true}]],
  cam:[[1200,560,1.1],[1350,560,1.25]] });

shot({ n:"He doesn't say anything. He doesn't have to. Because he's thinking directly at you.",
  bg:'bus', chars:[['you',1300,900,{pose:'sit',expr:'shocked'}],['stranger',1520,900,{pose:'sit',expr:'smug',flip:true}]],
  bubbles:[['stranger','Hello. Yes, you.',{at:3.6,w:10,dx:-40}]],
  cam:[[1350,560,1.25],[1400,560,1.35]] });

shot({ n:"'You've had it for a year now. I had it for forty. Do you want it to stop?'",
  bg:'bus', chars:[['you',1300,900,{pose:'sit',expr:'nervous'}],['stranger',1520,900,{pose:'sit',expr:'neutral',flip:true}]],
  bubbles:[['stranger',"You've had it for a year now. I had it for forty.",{at:0.2,w:16,dx:-40}],['stranger','Do you want it to stop?',{at:4.0,w:12,dx:-40,dy:80}]],
  cam:[[1400,560,1.3],[1420,560,1.38]] });

shot({ n:"He explains. If you say yes, it's gone the moment you step off the bus. No thoughts. No voices. Just people's faces again, and whatever they decide to tell you.",
  bg:'void', chars:[['you',960,900,{pose:'stand',expr:'think'}]],
  card:['KEEP IT?',{at:0.4,size:120,y:250}],
  bubbles:[[[560,560],'every thought',{at:3.2,w:10}],[[1360,560],'just faces',{at:5.4,w:10,muted:true}]],
  cam:[[960,540,1],[960,540,1.06]] });

shot({ n:"You think about the bus full of opinions. The party. The channel. Mia's locker.",
  bg:'void', chars:[],
  props:[['panels',960,540,{at:0.2,items:['bus','party','desk','hallway']}]],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"You think about Leo. About four hundred people trying not to think.",
  bg:'void', chars:[], fx:'dark',
  props:[['panels',960,540,{at:0.2,items:['street','street'],labels:['Leo','400 voices']}]],
  cam:[[960,540,1],[960,540,1.05]] });

shot({ n:"And you think about a hospital room, and a voice that only you could hear.",
  bg:'hospital_room', chars:[['grandma',1430,790,{pose:'lie',expr:'happy'}],['you',640,880,{pose:'sit',expr:'neutral'}]], fx:'warm',
  bubbles:[['grandma','...',{at:2.6,dx:-80,dy:-20}]],
  cam:[[1000,540,1.1],[1050,540,1.2]] });

shot({ n:"'Could I keep it,' you ask, 'but only for the people who can't speak?' He laughs. 'That's not how it works, kid. It's all of them or none of them.'",
  bg:'bus', chars:[['you',1300,900,{pose:'sit',expr:'nervous',talk:true}],['stranger',1520,900,{pose:'sit',expr:'joy',flip:true}]],
  bubbles:[['you',"Could I keep it, but only for the people who can't speak?",{at:0.4,kind:'speech',w:18,dx:-120,dy:-40}],['stranger',"That's not how it works, kid. All of them, or none of them.",{at:5.8,w:18,dx:-60,dy:60}]],
  cam:[[1350,560,1.2],[1380,560,1.3]] });

shot({ n:"The bus slows down. Your stop. You stand up.",
  bg:'bus', chars:[['you',1100,900,{pose:'stand',expr:'neutral'}],['stranger',1520,900,{pose:'sit',expr:'neutral',flip:true}]],
  cam:[[1200,540,1.1],[1050,540,1.15]] });

shot({ n:"And here's the thing. We're not going to tell you what you chose.",
  bg:'busdoor', chars:[['you',960,900,{pose:'stand',expr:'neutral',flip:true}]],
  cam:[[960,540,1.1],[960,540,1.2]] });

shot({ n:"Because the real question isn't whether you could hear what everyone really thinks of you.",
  bg:'busstop', chars:[['you',760,870,{pose:'walk',expr:'neutral',walkTo:1000}]],
  cam:[[960,540,1],[1000,540,1.06]] });

shot({ n:"It's whether you'd still like them afterwards. And whether they'd still like you.",
  bg:'busstop', chars:[['you',1000,870,{pose:'stand',expr:'neutral'}]],
  card:["would you still\nLIKE them?",{at:0.3,size:84,y:200}],
  cam:[[1000,540,1.06],[1000,540,1.18]] });

shot({ n:"Would you keep it? Tell us in the comments. And if you'd rather not know what we think, don't subscribe. ...Okay, do subscribe. We think you should.",
  bg:'endcard', chars:[['you',420,900,{pose:'wave',expr:'grin',talk:true}]],
  props:[['subscribe',1250,520,{at:3.5}]],
  bubbles:[[[1250,300],'we think you should.',{at:9.0,w:14}]],
  cam:[[960,540,1],[960,540,1.03]], pad:1.5 });

const THUMB = {
  bg:'classroom', chars:[['you',620,1010,{pose:'sit',expr:'shocked',scale:1.0}],['mia',1230,1010,{pose:'sit',expr:'smug',flip:true,scale:0.95}],['leo',1680,1010,{pose:'sit',expr:'happy',flip:true,scale:0.85}]],
  bubbles:[['mia','kind of cute...',{at:0,w:12,dx:-40,dy:-10}],['leo','weird hair',{at:0,w:8,dx:-40,dy:60}]],
  thumbText:'HEAR\nTHOUGHTS'
};

module.exports = { shots:S, thumb:THUMB, meta:{
  title:"What IF You Could Hear What Everyone REALLY Thinks of You?",
  channel:"whatifgraphics", voice:"en-US-AndrewMultilingualNeural", fps:24, width:1920, height:1080 } };
