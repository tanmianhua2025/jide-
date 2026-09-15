
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const STORAGE_KEY = "jide-v1";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"todos":[],"cats":[]}');

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function startOfDay(d=new Date()){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function fmtDate(iso){
  const d = new Date(iso);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
function daysBetween(a,b){
  const A=startOfDay(new Date(a)), B=startOfDay(new Date(b));
  return Math.round((B-A)/86400000);
}
function relativeText(iso){
  const n = daysBetween(new Date(), iso);
  if(n < 0) return `已过期 ${Math.abs(n)} 天`;
  if(n === 0) return "今天";
  if(n === 1) return "明天";
  return `还有 ${n} 天`;
}
function toISODate(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate(),9,0,0).toISOString(); }

function parseQuick(text){
  let now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 9, 0, 0);
  let cycleDays = 0;
  let title = text.trim();

  if(/今天/.test(text)) due = new Date(now.getFullYear(),now.getMonth(),now.getDate(),18,0,0);
  else if(/后天/.test(text)) due = new Date(now.getFullYear(),now.getMonth(),now.getDate()+2,9,0,0);
  else if(/明天/.test(text)) due = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,9,0,0);
  else {
    let m = text.match(/(\d+)\s*天后/);
    if(m) due = new Date(now.getFullYear(),now.getMonth(),now.getDate()+Number(m[1]),9,0,0);
    m = text.match(/(\d+)\s*周后/);
    if(m) due = new Date(now.getFullYear(),now.getMonth(),now.getDate()+Number(m[1])*7,9,0,0);
    m = text.match(/(\d+)\s*(?:个)?月后/);
    if(m) due = new Date(now.getFullYear(),now.getMonth()+Number(m[1]),now.getDate(),9,0,0);
  }

  let r = text.match(/每\s*(\d+)\s*天/);
  if(r) cycleDays = Number(r[1]);
  r = text.match(/每\s*(\d+)\s*周/);
  if(r) cycleDays = Number(r[1])*7;
  r = text.match(/每\s*(\d+)\s*(?:个)?月/);
  if(r) cycleDays = Number(r[1])*30;

  title = title
    .replace(/今天|明天|后天/g,"")
    .replace(/\d+\s*天后|\d+\s*周后|\d+\s*(?:个)?月后/g,"")
    .replace(/[，,]?\s*每\s*\d+\s*(天|周|(?:个)?月)\s*重复?/g,"")
    .replace(/[，,]/g," ")
    .trim();
  return {title: title || text.trim(), due: due.toISOString(), cycleDays, done:false};
}

function addTodo(text){
  if(!text.trim()) return;
  const item = parseQuick(text);
  state.todos.unshift({id:uid(), ...item, createdAt:new Date().toISOString()});
  save();
}

function render(){
  $("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date());

  const active = state.todos.filter(x=>!x.done).sort((a,b)=>new Date(a.due)-new Date(b.due));
  const urgent = active.filter(x=>daysBetween(new Date(),x.due)<=7).slice(0,4);
  $("#urgentList").innerHTML = urgent.length ? "" : '<div class="empty">这几天暂时没有急事 ✨</div>';
  urgent.forEach(x=>$("#urgentList").appendChild(todoCard(x,true)));

  $("#todoList").innerHTML = active.length ? "" : '<div class="empty">还没有待办，想到什么就记下来。</div>';
  active.forEach(x=>$("#todoList").appendChild(todoCard(x,false)));

  const cats = [...state.cats].sort((a,b)=>new Date(a.nextDate)-new Date(b.nextDate));
  $("#catList").innerHTML = cats.length ? "" : '<div class="empty">还没有猫咪用品记录。</div>';
  cats.forEach(x=>$("#catList").appendChild(catCard(x)));
}

function badgeClass(iso){
  const d=daysBetween(new Date(),iso);
  if(d<0) return "danger";
  if(d<=3) return "warn";
  return "ok";
}

function todoCard(x,compact=false){
  const tpl=$("#itemTemplate").content.cloneNode(true);
  const card=tpl.querySelector(".item-card");
  tpl.querySelector(".item-title").innerHTML = `${x.title}<span class="badge ${badgeClass(x.due)}">${relativeText(x.due)}</span>`;
  tpl.querySelector(".item-meta").textContent = `${fmtDate(x.due)}${x.cycleDays?` · 每${x.cycleDays}天重复`:""}`;
  const actions=tpl.querySelector(".item-actions");
  const done=document.createElement("button"); done.className="small-btn primary"; done.textContent=x.cycleDays?"完成并顺延":"完成";
  done.onclick=()=>{
    if(x.cycleDays){
      const d=new Date(x.due); d.setDate(d.getDate()+x.cycleDays); x.due=d.toISOString();
    } else x.done=true;
    save();
  };
  const cal=document.createElement("button"); cal.className="small-btn"; cal.textContent="加到日历";
  cal.onclick=()=>downloadICS(x.title,x.due,"来自「记得」");
  const later=document.createElement("button"); later.className="small-btn"; later.textContent="明天提醒";
  later.onclick=()=>{ const d=new Date(); x.due=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,9,0,0).toISOString(); save(); };
  actions.append(done,cal);
  if(!compact) actions.append(later);
  return tpl;
}

function catCard(x){
  const tpl=$("#itemTemplate").content.cloneNode(true);
  tpl.querySelector(".item-title").innerHTML = `${x.name}<span class="badge ${badgeClass(x.nextDate)}">${relativeText(x.nextDate)}</span>`;
  tpl.querySelector(".item-meta").textContent = `${fmtDate(x.nextDate)}${x.cycleDays?` · 每${x.cycleDays}天`:""}${x.note?` · ${x.note}`:""}`;
  const actions=tpl.querySelector(".item-actions");
  const done=document.createElement("button"); done.className="small-btn primary"; done.textContent=x.cycleDays?"已处理":"完成";
  done.onclick=()=>{
    if(x.cycleDays){ const d=new Date(x.nextDate); d.setDate(d.getDate()+x.cycleDays); x.nextDate=d.toISOString(); }
    else state.cats=state.cats.filter(c=>c.id!==x.id);
    save();
  };
  const cal=document.createElement("button"); cal.className="small-btn"; cal.textContent="加到日历";
  cal.onclick=()=>downloadICS(`猫咪：${x.name}`,x.nextDate,x.note||"来自「记得」猫咪管家");
  actions.append(done,cal);
  return tpl;
}

function downloadICS(title,iso,desc){
  const d=new Date(iso);
  const pad=n=>String(n).padStart(2,"0");
  const dt = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end=new Date(d.getTime()+30*60000);
  const et = `${end.getUTCFullYear()}${pad(end.getUTCMonth()+1)}${pad(end.getUTCDate())}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00Z`;
  const ics=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//JIDE//CN
BEGIN:VEVENT
UID:${uid()}@jide
DTSTAMP:${dt}
DTSTART:${dt}
DTEND:${et}
SUMMARY:${title.replace(/\n/g," ")}
DESCRIPTION:${(desc||"").replace(/\n/g," ")}
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:${title.replace(/\n/g," ")}
END:VALARM
END:VEVENT
END:VCALENDAR`;
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="记得提醒.ics"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

$("#quickAddBtn").onclick=()=>{ addTodo($("#quickInput").value); $("#quickInput").value=""; };
$("#quickInput").addEventListener("keydown",e=>{ if(e.key==="Enter") $("#quickAddBtn").click(); });
$$(".chip").forEach(b=>b.onclick=()=>{ $("#quickInput").value=b.dataset.fill; $("#quickInput").focus(); });
$("#clearDoneBtn").onclick=()=>{ state.todos=state.todos.filter(x=>!x.done); save(); };

$("#openCatModal").onclick=()=>{
  const d=new Date(); d.setDate(d.getDate()+30);
  $("#catDate").value=d.toISOString().slice(0,10);
  $("#catDialog").showModal();
};
$("#catForm").addEventListener("submit",e=>{
  e.preventDefault();
  const date=new Date($("#catDate").value+"T09:00:00");
  state.cats.unshift({
    id:uid(), name:$("#catName").value.trim(), nextDate:date.toISOString(),
    cycleDays:Number($("#catCycle").value), leadDays:Number($("#catLead").value||0),
    note:$("#catNote").value.trim()
  });
  $("#catForm").reset(); $("#catDialog").close(); save();
});

$("#notifyBtn").onclick=async()=>{
  if(!("Notification" in window)){ alert("当前浏览器不支持网页通知。可以先用“加到日历”做系统提醒。"); return; }
  const p=await Notification.requestPermission();
  if(p==="granted") new Notification("记得",{body:"通知已开启。把网页添加到 iPhone 主屏幕后体验更完整。"});
};

$$(".tab").forEach(btn=>btn.onclick=()=>{
  $$(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  if(btn.dataset.tab==="add") $("#quickInput").scrollIntoView({behavior:"smooth",block:"center"});
  if(btn.dataset.tab==="cat") $("#catList").scrollIntoView({behavior:"smooth",block:"start"});
  if(btn.dataset.tab==="home") window.scrollTo({top:0,behavior:"smooth"});
});

if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js")); }
render();
