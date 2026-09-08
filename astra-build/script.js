'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const names = ['Koromon', 'Agumon', 'Greymon'];
  const stages = ['IN-TRAINING', 'ROOKIE', 'CHAMPION'];
  const descriptions = ['Mostly ears. Entirely potential.', 'Tiny claws. Unreasonably big dreams.', 'You raised this absolute unit.'];
  let state, fight = null, busy = false, timer = null, sound = false, audio;
  let effect = null, particles = [], last = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = $('scene'), ctx = scene.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  function beep(notes = [440, 660], duration = .09) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      notes.forEach((n, i) => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * duration;
        o.type = 'square'; o.frequency.value = n; g.gain.setValueAtTime(.025, t);
        g.gain.exponentialRampToValueAtTime(.001, t + duration);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + duration);
      });
    } catch (_) { /* Sound is optional on browsers without Web Audio. */ }
  }
  // Original, hand-drawn pixel geometry. All points sit on a tiny sprite grid.
  function sprite(c, stage, x, y, scale = 5, flip = false, rival = false) {
    c.save(); c.translate(x, y); c.scale(flip ? -scale : scale, scale);
    const poly = (color, points) => {c.fillStyle = color; c.beginPath(); points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();};
    const rect = (color,x,y,w,h) => {c.fillStyle=color;c.fillRect(x,y,w,h);};
    const ink = '#26342d', light = stage === 0 ? '#ffd0d1' : rival ? '#8d99a7' : '#ffd78b';
    const base = stage === 0 ? '#ef91a7' : rival ? '#526274' : '#efa34d';
    const shadow = stage === 0 ? '#c46186' : rival ? '#344250' : '#cb7139';
    if (stage === 0) {
      poly(ink,[[-13,2],[-13,-4],[-9,-9],[-8,-22],[-4,-23],[-3,-10],[3,-10],[8,-22],[12,-21],[9,-7],[13,-3],[13,4],[10,8],[-9,8]]);
      poly(base,[[-11,1],[-11,-4],[-7,-8],[-6,-21],[-5,-21],[-5,-7],[4,-7],[9,-20],[10,-20],[7,-6],[11,-2],[11,3],[8,6],[-8,6]]);
      poly(light,[[-9,-3],[-6,-6],[4,-6],[7,-3],[2,-3],[0,-5],[-5,-4],[-8,1],[-10,1]]);
      rect(shadow,-7,5,14,2);rect(ink,-6,-1,3,4);rect(ink,4,-1,3,4);rect('#fff2d9',-5,-1,1,1);rect('#fff2d9',5,-1,1,1);rect('#af587b',-10,2,3,2);rect('#af587b',8,2,3,2);rect(ink,-1,3,3,1);
    } else {
      poly(ink,[[-14,8],[-20,6],[-24,0],[-24,-6],[-21,-3],[-17,1],[-10,1],[-10,-5],[-12,-9],[-12,-18],[-9,-23],[1,-26],[10,-24],[13,-19],[17,-17],[17,-10],[12,-7],[6,-7],[8,-3],[12,-2],[14,2],[12,5],[8,4],[9,10],[13,12],[13,16],[3,16],[0,12],[-4,12],[-6,16],[-16,16],[-17,13],[-13,10]]);
      poly(base,[[-12,7],[-19,4],[-22,0],[-22,-2],[-18,3],[-8,3],[-8,-5],[-10,-10],[-10,-18],[-7,-21],[1,-24],[9,-22],[11,-17],[15,-15],[15,-11],[11,-9],[3,-9],[4,-4],[9,0],[12,0],[12,3],[7,1],[6,6],[7,11],[11,13],[11,14],[4,14],[1,10],[-5,10],[-8,14],[-14,14],[-14,13],[-10,10]]);
      poly(shadow,[[-9,-12],[-5,-9],[-1,-8],[-3,-2],[-4,6],[-8,10],[-10,12],[-14,14],[-8,14],[-5,10],[1,10],[4,14],[7,14],[3,9],[3,1],[1,-6],[-4,-11]]);
      poly(light,[[0,-5],[4,-3],[6,1],[5,6],[2,9],[-3,8],[-4,4],[-3,0]]);
      rect(light,4,-20,5,3);rect('#fbf8d9',5,-20,3,4);rect(ink,7,-20,2,4);rect(ink,13,-15,1,1);rect(ink,7,-12,8,1);rect('#fff3d7',11,-12,2,2);
      rect('#fff0d0',-14,13,2,2);rect('#fff0d0',-10,13,2,2);rect('#fff0d0',6,13,2,2);rect('#fff0d0',9,13,2,2);rect('#fff0d0',11,2,2,2);
      if(stage === 2) {
        poly('#443d35',[[-12,-15],[-15,-23],[-10,-29],[-9,-35],[-4,-29],[3,-29],[9,-26],[14,-31],[14,-24],[18,-18],[15,-14],[8,-16],[4,-22],[-2,-22],[-4,-14]]);
        poly('#a28663',[[-11,-20],[-12,-24],[-8,-28],[-8,-32],[-5,-27],[2,-27],[8,-24],[12,-26],[12,-22],[15,-18],[10,-18],[5,-24],[-3,-24],[-6,-17],[-10,-16]]);
        poly('#d4ba8b',[[-10,-25],[-8,-29],[-6,-25],[-1,-26],[0,-24],[-5,-23],[-8,-19],[-10,-20]]);
        poly('#536578',[[-9,-7],[-4,-5],[-5,-2],[-8,-3]]);poly('#536578',[[-9,0],[-5,2],[-6,5],[-10,3]]);poly('#536578',[[-17,3],[-14,4],[-15,7],[-18,5]]);rect('#536578',5,5,3,3);
      }
    }
    c.restore();
  }
  function smallSprites() {
    document.querySelectorAll('[data-sprite]').forEach(el => {const c=el.getContext('2d');c.clearRect(0,0,el.width,el.height);sprite(c,+el.dataset.sprite,45,54,+el.dataset.sprite===2?1.3:1.65);});
  }
  function message(text) {$('message').textContent=text;}
  function update() {
    $('partner-name').textContent=names[state.stage];$('stage-badge').textContent=stages[state.stage];
    $('partner-description').textContent=descriptions[state.stage];$('element').textContent=state.stage?'ϟ VACCINE':'✦ FREE';
    ['fullness','power','bond'].forEach(k=>{$(k).value=state[k];$(k+'-value').innerHTML=state[k]+(k!=='power'?'<span>/100</span>':'');});
    const goal=state.stage===0?3:8,start=state.stage===0?0:3;
    $('growth-label').textContent=state.stage===2?'CHAMPION STATUS':'NEXT: '+names[state.stage+1].toUpperCase();
    $('growth-count').textContent=state.stage===2?'MAX EVOLUTION':`${state.xp-start} / ${goal-start} XP`;
    $('growth-pips').innerHTML=Array.from({length:goal-start},(_,i)=>`<span class="pip ${state.xp-start>i?'filled':''}"></span>`).join('');
    $('growth-hint').textContent=state.stage===2?'Keep training to power up your Mega Flame.':'Every meal and training brings you closer.';
    $('floating-name').innerHTML=names[state.stage].toUpperCase()+` <span>LV. ${String(state.xp+1).padStart(2,'0')}</span>`;
    $('battle').disabled=state.stage===0||busy||!!fight;
    $('battle').innerHTML=state.stage===0?'Battle locked <span>↗</span>':'Enter battle <span>↗</span>';
    $('arena-hint').textContent=state.stage===0?'Reach Rookie to unlock your first battle. Champion gives you the edge.':state.stage===1?'Rookie unlocked. Feeling brave? Train to Champion for a stronger start.':'Champion ready. Take your partner into a turn-based showdown.';
    $('feed').disabled=busy||!!fight;$('train').disabled=busy||!!fight||state.fullness<15;
    $('record').textContent=`${String(state.wins).padStart(2,'0')} W / ${String(state.losses).padStart(2,'0')} L`;
    for(let i=0;i<3;i++){const e=$('evo-'+i);e.className='evolution '+(i===state.stage?'current':i>state.stage?'locked':'');e.querySelector('small').textContent=i===state.stage?'YOU ARE HERE':i<state.stage?'EVOLVED ✓':i===1?'3 CARE XP':'8 CARE XP';}
    scene.setAttribute('aria-label',fight?`${names[state.stage]} battling BlackAgumon`:names[state.stage]+' resting in a pixel art forest');
  }
  function sparkle(x,y,color= '#dcf99d',count=22) {if(reduced)return;for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*200,vy:-40-Math.random()*160,life:1+Math.random()*.6,color});}
  function care(kind) {
    if(busy||fight||(kind==='train'&&state.fullness<15))return;
    busy=true; state.xp++; state.bond=Math.min(100,state.bond+(kind==='feed'?9:5));
    if(kind==='feed'){state.fullness=Math.min(100,state.fullness+26);state.power=Math.min(100,state.power+2);message('Snack secured. +26 fullness, +9 bond, +1 care XP.');$('mood').textContent='Munch. Munch. Zero regrets.';beep([330,440,660]);}
    else {state.fullness-=15;state.power=Math.min(100,state.power+9);message('Training complete! +9 power, +5 bond, +1 care XP.');$('mood').textContent='One rep closer to legendary.';beep([220,330,440]);}
    effect={kind,until:performance.now()+650};sparkle(480,280,kind==='feed'?'#ffa96b':'#dcf99d');update();
    timer=setTimeout(()=>{timer=null;const next=state.xp>=8?2:state.xp>=3?1:0;if(next>state.stage)evolve(next);else{busy=false;update();if(state.fullness<15)message('Training worked up an appetite. Feed your partner to train again.');}},650);
  }
  function evolve(next) {
    state.stage=next;state.power=Math.min(100,state.power+(next===1?8:15));state.fullness=Math.min(100,state.fullness+15);
    $('announcement').innerHTML=`<span class="eyebrow">CONNECTION LEVEL UP</span><canvas id="evolved-art" width="180" height="150" aria-hidden="true"></canvas><h2>${names[next]}!</h2><p>Your care made this happen.<br>${next===1?'Rookie reached. The battle arena is open.':'Champion reached. Let’s make some noise.'}</p><button id="continue" class="primary">Meet your ${next===1?'Rookie':'Champion'} ↗</button>`;
    $('announcement').hidden=false;sprite($('evolved-art').getContext('2d'),next,90,102,next===2?2.7:3);beep([330,440,554,660,880],.13);update();message(`${names[next-1]} digivolved into ${names[next]}!`);
    $('continue').onclick=()=>{$('announcement').hidden=true;busy=false;update();sparkle(480,260,'#dcf99d',45);$('mood').textContent=next===1?'New claws. Same best friend.':'Big monster. Bigger bond.';$('train').focus();};$('continue').focus();
  }
  function startBattle() {
    if(busy||fight||state.stage<1)return;
    const max=state.stage===2?155+Math.floor(state.bond/5):88+Math.floor(state.bond/5);
    fight={hp:max,max,enemy:150,enemyMax:150,turn:0,charge:0,over:false};
    $('care-panel').hidden=true;$('battle-panel').hidden=false;$('battle-hud').hidden=false;$('scene-label').hidden=true;$('return').hidden=true;
    $('location').textContent='FILE ISLAND / BATTLE ARENA';$('scene-mode').textContent='TURN-BASED DUEL';$('panel-label').textContent='BATTLE COMMAND';$('scene-status').textContent='YOUR MOVE · PICK A COMMAND';
    message('BlackAgumon steps up. Attack to charge your special; guard against Pepper Breath.');beep([220,277,330],.14);battleUpdate();update();$('attack').focus();
  }
  function battleUpdate() {
    if(!fight)return;
    $('player-label').textContent=names[state.stage].toUpperCase()+' / YOU';$('player-hp').textContent=`${fight.hp} / ${fight.max} HP`;$('player-health').max=fight.max;$('player-health').value=fight.hp;
    $('enemy-hp').textContent=`${fight.enemy} / ${fight.enemyMax} HP`;$('enemy-health').max=fight.enemyMax;$('enemy-health').value=fight.enemy;
    const heavy=fight.turn%3===2;$('intent').textContent=heavy?'Pepper Breath · 38 damage':'Claw swipe · 18 damage';$('intent-hint').textContent=heavy?'It’s winding up a fireball. A good time to guard.':'Attack builds your special. Three charges unleash it.';
    $('burst-label').textContent=fight.charge>=3?'Ready · double damage':`Charging ${fight.charge} / 3`;
    ['attack','guard','burst'].forEach(k=>$(k).disabled=busy||fight.over||(k==='burst'&&fight.charge<3));
  }
  function turn(kind) {
    if(!fight||busy||fight.over||(kind==='burst'&&fight.charge<3))return;
    busy=true;
    const damage=kind==='guard'?0:Math.round((12+state.power*.28)*(kind==='burst'?2.2:1));
    fight.enemy=Math.max(0,fight.enemy-damage);
    if(kind==='guard'){fight.hp=Math.min(fight.max,fight.hp+8);fight.charge=Math.min(3,fight.charge+1);message('Guard up. Recovered 8 HP and braced for impact.');}
    else{fight.charge=kind==='burst'?0:Math.min(3,fight.charge+1);message(`${kind==='burst'?'Mega Flame':'Claw strike'}! ${damage} damage to BlackAgumon.`);sparkle(700,280,kind==='burst'?'#ffae62':'#dcf99d',kind==='burst'?45:18);}
    effect={kind:kind==='guard'?'guard':'attack',until:performance.now()+600};beep(kind==='burst'?[180,360,720,900]:[220,440]);battleUpdate();
    timer=setTimeout(()=>{timer=null;if(!fight)return;if(fight.enemy<=0){endBattle(true);return;}
      const hit=fight.turn%3===2?38:18,received=kind==='guard'?Math.ceil(hit*.2):hit;
      fight.hp=Math.max(0,fight.hp-received);fight.turn++;effect={kind:'hit',until:performance.now()+400};sparkle(295,290,'#ffa96b',12);
      message(`${kind==='guard'?'Guard absorbed most of the hit. ':''}BlackAgumon deals ${received} damage. ${fight.charge===3?'Mega Flame is ready!':'Your move.'}`);
      busy=false;battleUpdate();if(fight.hp<=0)endBattle(false);
    },700);
  }
  function endBattle(won) {
    fight.over=true;busy=false;state[won?'wins':'losses']++;battleUpdate();update();
    $('announcement').innerHTML=`<span class="eyebrow">${won?'BOND BEATS BRAWN':'EVERY LEGEND STARTS SOMEWHERE'}</span><h2>${won?'Victory!':'Knocked out.'}</h2><p>${won?`${names[state.stage]} wins. That little snack was the start of something big.`:'Your partner is safe. Feed, train, and come back stronger.'}</p><button id="result-return" class="primary">${won?'Back to the garden':'Train for a rematch'} ↗</button>`;
    $('announcement').hidden=false;$('result-return').onclick=leaveBattle;$('result-return').focus();$('return').hidden=false;
    message(won?'Victory! Your partner earned this one.':'Defeat. No progress lost — your partner will recover in the garden.');beep(won?[440,554,660,880]:[330,277,220],.15);
  }
  function leaveBattle(restoreFocus = true) {if(busy)return;fight=null;$('announcement').hidden=true;$('battle-panel').hidden=true;$('care-panel').hidden=false;$('battle-hud').hidden=true;$('scene-label').hidden=false;$('location').textContent='FILE ISLAND / NURSERY';$('scene-mode').innerHTML='LIVE HABITAT <span class="blink">●</span>';$('panel-label').textContent='YOUR PARTNER';$('scene-status').textContent='SAFE ZONE · GROW AT YOUR OWN PACE';$('mood').textContent='Back home. Ready for the next adventure.';update();if(restoreFocus)$('feed').focus();}
  function reset() {clearTimeout(timer);timer=null;busy=false;fight=null;effect=null;particles=[];state={stage:0,xp:0,fullness:60,power:12,bond:10,wins:0,losses:0};leaveBattle(false);$('mood').textContent='A tiny creature. A huge appetite.';message('Hey, tamer. Your story starts with a snack.');}
  $('feed').onclick=()=>care('feed');$('train').onclick=()=>care('train');$('battle').onclick=startBattle;
  ['attack','guard','burst'].forEach(k=>$(k).onclick=()=>turn(k));$('return').onclick=leaveBattle;
  $('reset').onclick=reset;$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('sound').querySelector('span').textContent=sound?'Sound on':'Sound off';beep();};
  document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['f','t','b'].includes(key)&&!fight&&!busy){e.preventDefault();if(key==='f')care('feed');if(key==='t')care('train');if(key==='b')startBattle();}});
  // Static environment drawn once, then composited with animated creatures.
  const background=document.createElement('canvas');background.width=960;background.height=530;
  const bg=background.getContext('2d');
  function environment() {
    const r=(color,x,y,w,h)=>{bg.fillStyle=color;bg.fillRect(x,y,w,h);};
    r('#203b35',0,0,960,530);
    const sky=bg.createLinearGradient(0,0,0,400);sky.addColorStop(0,'#183331');sky.addColorStop(1,'#416349');bg.fillStyle=sky;bg.fillRect(0,0,960,400);
    r('#718365',702,72,56,56);r('#a1a17a',710,72,40,48);r('#b3ad7a',716,76,28,32);
    for(let i=0;i<12;i++){let x=i*91-20,h=35+(i*37)%110;r('#294b3f',x,224-h,67,h+120);r('#325443',x+8,213-h,46,14);for(let j=0;j<3;j++)r('#557154',x+16+j*15,231-h,4,6);}
    const tree=(x,y,s,dark)=>{bg.save();bg.translate(x,y);bg.scale(s,s);r(dark?'#162f2b':'#244737',-5,-30,10,120);const col=dark?'#1a3830':'#31553d';r(col,-35,-80,70,32);r(col,-47,-56,94,35);r(col,-56,-27,112,36);r(dark?'#234333':'#3e6444',-27,-80,49,7);r(dark?'#234333':'#3e6444',-44,-28,80,6);bg.restore();};
    for(let i=0;i<11;i++)tree(i*102-25,255+(i%3)*12, .65+(i%3)*.18,false);
    r('#36553c',0,327,960,203);r('#2d4935',0,363,960,167);
    bg.strokeStyle='#456348';bg.lineWidth=1;for(let i=-800;i<1500;i+=80){bg.beginPath();bg.moveTo(480+i*.28,327);bg.lineTo(480+i,530);bg.stroke();}for(let y=342;y<530;y+=(y-310)*.36){bg.beginPath();bg.moveTo(0,y);bg.lineTo(960,y);bg.stroke();}
    tree(68,280,1.9,true);tree(906,295,2.1,true);tree(-5,390,1.4,true);tree(1000,420,1.6,true);
    r('#536449',186,381,49,13);r('#6b7b56',195,370,29,12);r('#273f32',186,394,52,7);
    for(let i=0;i<75;i++){const x=(i*173+57)%960,y=345+(i*79)%185;if(x>310&&x<650&&y<420)continue;r(i%4?'#56714b':'#8b9460',x,y,3,5);r('#42643e',x+4,y-4,3,9);}
    for(const [x,y] of [[165,314],[802,370],[110,440],[743,460]]){r('#c29568',x,y,6,8);r('#d0b582',x-5,y-5,16,6);r('#f1d29a',x-2,y-7,10,3);}
    // Stacked octagonal training platform.
    const platform=(color,cy,rx,ry)=>{bg.fillStyle=color;bg.beginPath();bg.moveTo(480-rx,cy-ry*.4);bg.lineTo(480-rx*.65,cy-ry);bg.lineTo(480+rx*.65,cy-ry);bg.lineTo(480+rx,cy-ry*.4);bg.lineTo(480+rx,cy+ry*.4);bg.lineTo(480+rx*.65,cy+ry);bg.lineTo(480-rx*.65,cy+ry);bg.lineTo(480-rx,cy+ry*.4);bg.closePath();bg.fill();};
    platform('#182e28',365,172,48);platform('#596d4c',352,172,48);platform('#8d9a66',343,172,44);platform('#455d3c',343,155,35);platform('#657950',339,146,30);
    bg.strokeStyle='#9ca97c';bg.lineWidth=2;bg.beginPath();bg.ellipse(480,339,99,20,0,0,Math.PI*2);bg.stroke();r('#a5b878',476,332,8,14);r('#a5b878',463,337,34,4);
  }
  function frame(now) {
    const dt=Math.min((now-last)/1000,.05);last=now;ctx.drawImage(background,0,0);
    const time=reduced?0:now/1000,bob=Math.round(Math.sin(time*2.6)*3),active=effect&&now<effect.until;
    // Quiet ambient fireflies bring the little habitat to life.
    for(let i=0;i<13;i++){ctx.globalAlpha=.25+(Math.sin(time*1.4+i)*.5+.5)*.4;ctx.fillStyle='#d2e5a0';ctx.fillRect((i*139+40)%900+20,140+(i*71)%210+Math.sin(time+i)*7,3,3);}ctx.globalAlpha=1;
    if(fight){const bounds=scene.getBoundingClientRect(),visible=bounds.width/Math.max(bounds.width/960,bounds.height/530),fit=Math.min(1,visible/750),px=480-185*fit,ex=480+220*fit;ctx.fillStyle='#17272188';ctx.fillRect(0,0,960,530);ctx.fillStyle='#bcd29422';ctx.beginPath();ctx.ellipse(px,359,105*fit,26*fit,0,0,Math.PI*2);ctx.ellipse(ex,345,90*fit,22*fit,0,0,Math.PI*2);ctx.fill();
      sprite(ctx,state.stage,px+(active&&effect.kind==='attack'?25*fit:0),state.stage===2?286+bob:282+bob,(state.stage===2?4.8:4.4)*fit,false);
      sprite(ctx,1,ex-(active&&effect.kind==='hit'?18*fit:0),277-bob,4.1*fit,true,true);
      if(active&&effect.kind==='guard'){ctx.strokeStyle='#99dcdb';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(px,275,104*fit,114*fit,0,0,Math.PI*2);ctx.stroke();}
      if(active&&effect.kind==='attack'){ctx.fillStyle='#ffb568';ctx.fillRect(510,235,37,27);ctx.fillStyle='#ffe7a0';ctx.fillRect(520,241,31,15);}
    }else{ctx.fillStyle='#233a2c70';ctx.beginPath();ctx.ellipse(480,340,62+state.stage*10,12,0,0,Math.PI*2);ctx.fill();const jump=active&&effect.kind==='train'&&!reduced?Math.abs(Math.sin(now/90))*15:0;
      sprite(ctx,state.stage,480,state.stage===0?294+bob-jump:state.stage===1?262+bob-jump:251+bob-jump,state.stage===0?5:state.stage===1?4.6:5.5);
      if(active&&effect.kind==='feed'){ctx.fillStyle='#f4c189';ctx.fillRect(565,250,24,19);ctx.fillStyle='#ad6850';ctx.fillRect(569,246,17,25);ctx.fillStyle='#ffedd4';ctx.fillRect(586,254,16,7);ctx.fillRect(598,251,5,13);}
    }
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;ctx.globalAlpha=Math.min(1,p.life);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),4,4);}ctx.globalAlpha=1;
    // Fine scanlines, intentionally subtle so sprites stay crisp.
    ctx.fillStyle='#071b1510';for(let y=0;y<530;y+=4)ctx.fillRect(0,y,960,1);
    requestAnimationFrame(frame);
  }
  environment();smallSprites();reset();requestAnimationFrame(frame);
})();
