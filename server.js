const express=require("express"),http=require("http"),crypto=require("crypto");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static("public")); app.get("/health",(_,r)=>r.json({ok:true}));
const rooms=new Map(),MAX=12,SECONDS=60;
const Q=[
["Geografie","Care este capitala Portugaliei?",["Porto","Lisabona","Madrid","Sevilia"],1],
["Geografie","În ce țară se află Kyoto?",["China","Japonia","Thailanda","India"],1],
["Istorie","În ce an a avut loc Marea Unire?",["1877","1918","1945","1859"],1],
["Istorie","Cine a fost primul împărat roman?",["Nero","Augustus","Traian","Hadrian"],1],
["Sport","Câți jucători are o echipă de fotbal pe teren?",["9","10","11","12"],2],
["Sport","La ce sport se folosește termenul «love»?",["Tenis","Baschet","Rugby","Handbal"],0],
["Muzică","Câte clape are un pian standard?",["66","76","88","96"],2],
["Film și seriale","Cum se numește școala de magie din Harry Potter?",["Narnia","Hogwarts","Camelot","Nevermore"],1],
["Animale","Care este cel mai mare animal terestru?",["Rinocer","Hipopotam","Elefant african","Girafă"],2],
["Știință","Ce planetă este Planeta Roșie?",["Venus","Marte","Jupiter","Mercur"],1],
["Tehnologie","Ce înseamnă CPU?",["Central Processing Unit","Computer Power Utility","Core Program Unit","Central Personal User"],0],
["Gastronomie","Care este ingredientul principal din guacamole?",["Castravete","Avocado","Dovlecel","Mazăre"],1],
["România","Care este cel mai înalt vârf din România?",["Omu","Moldoveanu","Negoiu","Peleaga"],1],
["Matematică","Cât este 12 × 8?",["86","92","96","108"],2],
["Cultură generală","Câte zile are un an bisect?",["364","365","366","367"],2],
["Natură","Cum se numește procesul prin care plantele folosesc lumina?",["Fermentare","Fotosinteză","Evaporare","Polenizare"],1],
["Literatură","Cine a scris Amintiri din copilărie?",["Eminescu","Ion Creangă","Slavici","Rebreanu"],1],
["Spațiu","Care este cea mai mare planetă?",["Saturn","Neptun","Jupiter","Uranus"],2],
["Geografie","Pe ce continent se află Kenya?",["Asia","Europa","Africa","America de Sud"],2],
["Matematică","Care este rădăcina pătrată a lui 144?",["10","11","12","14"],2]
];
const cats=[...new Set(Q.map(x=>x[0]))],id=()=>crypto.randomBytes(12).toString("hex"),code=()=>crypto.randomBytes(3).toString("hex").toUpperCase();
const clean=s=>String(s||"").trim().replace(/[<>]/g,"").slice(0,20);
function pub(r){return {code:r.code,status:r.status,hostId:r.hostId,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,connected:p.connected,isHost:p.id===r.hostId})),tiles:r.tiles,duel:r.duel?{attackerId:r.duel.a,defenderId:r.duel.d,attackerTile:r.duel.at,defenderTile:r.duel.dt,activePlayerId:r.duel.turn,question:{category:r.duel.q[0],text:r.duel.q[1],options:r.duel.q[2],number:r.duel.n},secondsLeft:Math.max(0,Math.ceil((r.duel.deadline-Date.now())/1000))}:null,winnerId:r.winnerId,message:r.message};}
const emit=r=>io.to(r.code).emit("state",pub(r)),err=(s,m)=>s.emit("notice",{message:m});
const roomOf=s=>rooms.get(s.data.room),playerOf=(r,s)=>r?.players.get(s.data.pid);
function stop(r){if(r.duel?.timer)clearInterval(r.duel.timer);r.duel=null;}
function nextQ(r){let choices=Q.filter(q=>!r.used.has(q[1]));if(!choices.length){r.used.clear();choices=Q;}let cat=r.tiles.find(t=>t.id===r.duel.dt)?.category;let same=choices.filter(q=>q[0]===cat);let pool=same.length?same:choices;r.duel.q=pool[Math.floor(Math.random()*pool.length)];r.used.add(r.duel.q[1]);r.duel.n++;}
function finish(r,loser,why){let d=r.duel;if(!d)return;let winner=loser===d.a?d.d:d.a;let tile=r.tiles.find(t=>t.id===d.dt);if(tile)tile.ownerId=winner;stop(r);r.message=`${r.players.get(winner)?.name||"Câștigătorul"} a cucerit teritoriul (${why}).`;let counts={};r.tiles.forEach(t=>counts[t.ownerId]=(counts[t.ownerId]||0)+1);let alive=Object.keys(counts);if(alive.length===1){r.status="finished";r.winnerId=alive[0];r.message=`${r.players.get(r.winnerId)?.name} a câștigat partida!`;}emit(r);}
io.on("connection",s=>{
 s.on("createRoom",({name})=>{name=clean(name);if(!name)return err(s,"Introdu numele.");let c=code();while(rooms.has(c))c=code();let pid=id(),hostToken=id(),r={code:c,hostId:pid,hostToken,status:"lobby",players:new Map([[pid,{id:pid,name,connected:true}]]),tiles:[],duel:null,used:new Set(),winnerId:null,message:"Așteptăm jucătorii."};rooms.set(c,r);s.data.room=c;s.data.pid=pid;s.join(c);s.emit("created",{code:c,playerId:pid,hostToken});emit(r);});
 s.on("joinRoom",({code:c,name})=>{c=String(c||"").toUpperCase();name=clean(name);let r=rooms.get(c);if(!r)return err(s,"Cod de cameră invalid.");if(!name)return err(s,"Introdu numele.");if(r.status!=="lobby")return err(s,"Partida a început.");if(r.players.size>=MAX)return err(s,"Camera este plină (12 jucători).");if([...r.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()))return err(s,"Numele este deja folosit.");let pid=id();r.players.set(pid,{id:pid,name,connected:true});s.data.room=c;s.data.pid=pid;s.join(c);s.emit("joined",{code:c,playerId:pid});r.message=name+" a intrat în cameră.";emit(r);});
 s.on("reconnectPlayer",({code:c,playerId,hostToken})=>{let r=rooms.get(String(c||"").toUpperCase()),p=r?.players.get(playerId);if(!p||(playerId===r.hostId&&hostToken!==r.hostToken))return err(s,"Reconectarea nu a reușit.");p.connected=true;s.data.room=r.code;s.data.pid=playerId;s.join(r.code);s.emit("reconnected",{playerId});emit(r);});
 s.on("startGame",({hostToken})=>{let r=roomOf(s);if(!r||s.data.pid!==r.hostId||hostToken!==r.hostToken)return err(s,"Doar gazda poate porni jocul.");if(r.players.size<2)return err(s,"Ai nevoie de cel puțin 2 jucători.");if(r.status!=="lobby")return;let ps=[...r.players.values()].sort(()=>Math.random()-.5);r.tiles=ps.map((p,i)=>({id:i,ownerId:p.id,category:cats[i%cats.length]}));r.status="playing";r.message="Partida a început. Selectează un teritoriu propriu, apoi un vecin advers.";emit(r);});
 s.on("challenge",({attackerTile,defenderTile})=>{let r=roomOf(s),p=playerOf(r,s);if(!r||!p||r.status!=="playing"||r.duel)return err(s,"Nu poți începe acum un duel.");let a=r.tiles.find(t=>t.id===+attackerTile),d=r.tiles.find(t=>t.id===+defenderTile);if(!a||!d||a.ownerId!==p.id||d.ownerId===p.id)return err(s,"Selectare de teritoriu invalidă.");let ax=a.id%4,ay=Math.floor(a.id/4),dx=d.id%4,dy=Math.floor(d.id/4);if(Math.abs(ax-dx)+Math.abs(ay-dy)!==1)return err(s,"Poți ataca doar un teritoriu vecin.");r.duel={a:p.id,d:d.ownerId,at:a.id,dt:d.id,turn:p.id,q:null,n:0,deadline:Date.now()+SECONDS*1000};nextQ(r);r.duel.timer=setInterval(()=>{if(!r.duel)return;let left=Math.ceil((r.duel.deadline-Date.now())/1000);io.to(r.code).emit("clock",{secondsLeft:Math.max(0,left)});if(left<=0)finish(r,r.duel.turn,"timp expirat");},250);r.message="Duel început! Atacatorul răspunde primul.";emit(r);});
 s.on("answer",({optionIndex})=>{let r=roomOf(s),p=playerOf(r,s),d=r?.duel;if(!d||!p)return err(s,"Nu există duel activ.");if(p.id!==d.turn)return err(s,"Nu este rândul tău.");if(Date.now()>=d.deadline)return finish(r,d.turn,"timp expirat");let n=+optionIndex;if(!Number.isInteger(n)||n<0||n>3)return err(s,"Răspuns invalid.");if(n!==d.q[3])return finish(r,p.id,"răspuns greșit");d.turn=p.id===d.a?d.d:d.a;nextQ(r);r.message="Corect! Urmează "+r.players.get(d.turn).name+".";emit(r);});
 s.on("leaveRoom",()=>{let r=roomOf(s),p=playerOf(r,s);if(!r||!p)return;p.connected=false;if(r.duel&&(r.duel.a===p.id||r.duel.d===p.id))finish(r,p.id,"deconectare");r.message=p.name+" s-a deconectat.";emit(r);s.leave(r.code);s.data.room=null;s.data.pid=null;});
 s.on("disconnect",()=>{let r=roomOf(s),p=playerOf(r,s);if(!r||!p)return;p.connected=false;if(r.duel&&(r.duel.a===p.id||r.duel.d===p.id))finish(r,p.id,"conexiune pierdută");r.message=p.name+" a pierdut conexiunea.";emit(r);});
});
server.listen(process.env.PORT||3000,()=>console.log("THE FLOOR ONLINE pornit"));
