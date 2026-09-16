
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="jide-v3";
let old=localStorage.getItem("jide-v1");
let state=JSON.parse(localStorage.getItem(KEY) || old || '{"todos":[],"cats":[],"trains":[]}');
state.trains=state.trains||[]; state.todos=state.todos||[]; state.cats=state.cats||[];
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function uid(){return Math.random().toString(36).slice(2,10)}
function sod(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function daysBetween(a,b){return Math.round((sod(new Date(b))-sod(new Date(a)))/86400000)}
function fmtDate(iso){const d=new Date(iso);return `${d.getMonth()+1}月${d.getDate()}日`}
function rel(iso){const n=daysBetween(new Date(),iso);if(n<0)return`已过期${Math.abs(n)}天`;if(n===0)return"今天";if(n===1)return"明天";return`还有${n}天`}
function badge(iso){const n=daysBetween(new Date(),iso);return n<0?"danger":n<=3?"warn":"ok"}
function combineDateTime(dateStr,timeStr){const [h,m]=(timeStr||"09:00").split(":").map(Number);const d=new Date(dateStr+"T00:00:00");d.setHours(h,m,0,0);return d}
function saleDate(travelDate,presaleDays,timeStr){const d=combineDateTime(travelDate,timeStr);d.setDate(d.getDate()-(Number(presaleDays)-1));return d}
function parseQuick(text){let now=new Date(),due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,9),cycleDays=0,title=text.trim();if(/今天/.test(text))due=new Date(now.getFullYear(),now.getMonth(),now.getDate(),18);else if(/后天/.test(text))due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+2,9);else if(/明天/.test(text))due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,9);else{let m=text.match(/(\d+)\s*天后/);if(m)due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+Number(m[1]),9);m=text.match(/(\d+)\s*周后/);if(m)due=new Date(now.getFullYear(),now.getMonth(),now.getDate()+Number(m[1])*7,9);m=text.match(/(\d+)\s*(?:个)?月后/);if(m)due=new Date(now.getFullYear(),now.getMonth()+Number(m[1]),now.getDate(),9)}let r=text.match(/每\s*(\d+)\s*天/);if(r)cycleDays=Number(r[1]);r=text.match(/每\s*(\d+)\s*周/);if(r)cycleDays=Number(r[1])*7;r=text.match(/每\s*(\d+)\s*(?:个)?月/);if(r)cycleDays=Number(r[1])*30;title=title.replace(/今天|明天|后天/g,"").replace(/\d+\s*天后|\d+\s*周后|\d+\s*(?:个)?月后/g,"").replace(/[，,]?\s*每\s*\d+\s*(天|周|(?:个)?月)\s*重复?/g,"").trim();return{title:title||text,due:due.toISOString(),cycleDays,done:false}}
function addTodo(t){if(!t.trim())return;state.todos.unshift({id:uid(),...parseQuick(t)});save()}
function render(){
 $("#todayLabel").textContent=new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
 let urgent=[
   ...state.todos.filter(x=>!x.done).map(x=>({...x,type:"todo",when:x.due,label:x.title})),
   ...state.trains.filter(x=>!x.done).map(x=>({...x,type:"train",when:x.saleAt,label:`购票：${x.from} → ${x.to||"目的地"}`})),
   ...state.cats.map(x=>({...x,type:"cat",when:x.nextDate,label:x.name}))
 ].filter(x=>daysBetween(new Date(),x.when)<=7).sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,5);
 $("#urgentList").innerHTML=urgent.length?"":'<div class="empty">这几天暂时没有急事 ✨</div>';
 urgent.forEach(x=>$("#urgentList").appendChild(simpleUrgent(x)));
 renderTrains(); renderTodos(); renderCats();
}
function simpleUrgent(x){const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`${x.type==="train"?"🚄 ":x.type==="cat"?"🐱 ":""}${x.label}<span class="badge ${badge(x.when)}">${rel(x.when)}</span>`;t.querySelector(".item-meta").textContent=fmtDate(x.when);return t}
function renderTodos(){const arr=state.todos.filter(x=>!x.done).sort((a,b)=>new Date(a.due)-new Date(b.due));$("#todoList").innerHTML=arr.length?"":'<div class="empty">还没有待办。</div>';arr.forEach(x=>{const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`${x.title}<span class="badge ${badge(x.due)}">${rel(x.due)}</span>`;t.querySelector(".item-meta").textContent=`${fmtDate(x.due)}${x.cycleDays?` · 每${x.cycleDays}天重复`:""}`;const a=t.querySelector(".item-actions");const done=btn(x.cycleDays?"完成并顺延":"完成","primary",()=>{if(x.cycleDays){let d=new Date(x.due);d.setDate(d.getDate()+x.cycleDays);x.due=d.toISOString()}else x.done=true;save()});const cal=btn("加到日历","",()=>ics(x.title,x.due,"来自「记得」"));a.append(done,cal);$("#todoList").appendChild(t)})}
function renderTrains(){const arr=state.trains.filter(x=>!x.done).sort((a,b)=>new Date(a.saleAt)-new Date(b.saleAt));$("#trainList").innerHTML=arr.length?"":'<div class="empty">还没有火车票提醒。点“新增”输入行程。</div>';arr.forEach(x=>{const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`🚄 ${x.from} → ${x.to||"目的地"}<span class="badge ${badge(x.saleAt)}">${rel(x.saleAt)}</span>`;t.querySelector(".item-meta").innerHTML=`${x.kind==="return"?"返程":"去程"} ${fmtDate(x.travelAt)}出发 · 预计 ${fmtDate(x.saleAt)} ${x.saleTime} 开售`;const a=t.querySelector(".item-actions");a.append(btn("加到日历","train",()=>ics(`购买火车票：${x.from}→${x.to||"目的地"}`,x.saleAt,`乘车日期：${fmtDate(x.travelAt)}。请以12306实际起售时间为准。`,x.leadDays)),btn("已购票","primary",()=>{x.done=true;save()}));$("#trainList").appendChild(t)})}
function renderCats(){const arr=[...state.cats].sort((a,b)=>new Date(a.nextDate)-new Date(b.nextDate));$("#catList").innerHTML=arr.length?"":'<div class="empty">还没有猫咪用品记录。</div>';arr.forEach(x=>{const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`${x.name}<span class="badge ${badge(x.nextDate)}">${rel(x.nextDate)}</span>`;t.querySelector(".item-meta").textContent=`${fmtDate(x.nextDate)}${x.cycleDays?` · 每${x.cycleDays}天`:""}${x.note?` · ${x.note}`:""}`;t.querySelector(".item-actions").append(btn(x.cycleDays?"已处理":"完成","primary",()=>{if(x.cycleDays){let d=new Date(x.nextDate);d.setDate(d.getDate()+x.cycleDays);x.nextDate=d.toISOString()}else state.cats=state.cats.filter(c=>c.id!==x.id);save()}));$("#catList").appendChild(t)})}
function btn(text,cls,fn){const b=document.createElement("button");b.className="small-btn "+cls;b.textContent=text;b.onclick=fn;return b}
function ics(title,iso,desc,leadDays=0){const d=new Date(iso),pad=n=>String(n).padStart(2,"0"),f=x=>`${x.getUTCFullYear()}${pad(x.getUTCMonth()+1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;let alarms=`BEGIN:VALARM\nTRIGGER:-PT10M\nACTION:DISPLAY\nDESCRIPTION:${title}\nEND:VALARM`;if(leadDays>0)alarms+=`\nBEGIN:VALARM\nTRIGGER:-P${leadDays}D\nACTION:DISPLAY\nDESCRIPTION:${title}\nEND:VALARM`;const end=new Date(d.getTime()+30*60000),txt=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${uid()}@jide\nDTSTART:${f(d)}\nDTEND:${f(end)}\nSUMMARY:${title}\nDESCRIPTION:${desc||""}\n${alarms}\nEND:VEVENT\nEND:VCALENDAR`;const blob=new Blob([txt],{type:"text/calendar;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="记得_火车票提醒.ics";a.click()}
function openTrain(){const d=new Date();d.setDate(d.getDate()+20);$("#departDate").value=d.toISOString().slice(0,10);$("#trainDialog").showModal();updatePreview()}
function updatePreview(){if(!$("#departDate").value)return;const s=saleDate($("#departDate").value,$("#presaleDays").value,$("#saleTime").value);$("#trainPreview").textContent=`预计购票日：${s.getMonth()+1}月${s.getDate()}日 ${$("#saleTime").value}。乘车日：${new Date($("#departDate").value+"T00:00:00").getMonth()+1}月${new Date($("#departDate").value+"T00:00:00").getDate()}日。`}
$("#openTrain").onclick=$("#openTrain2").onclick=openTrain;
["departDate","presaleDays","saleTime"].forEach(id=>$("#"+id).addEventListener("input",updatePreview));
$("#roundTrip").onchange=()=>{$("#returnDateWrap").style.display=$("#roundTrip").checked?"block":"none"};
$("#trainForm").addEventListener("submit",e=>{e.preventDefault();const pd=Number($("#presaleDays").value),st=$("#saleTime").value,lead=Number($("#leadPreset").value),from=$("#fromStation").value.trim(),to=$("#toStation").value.trim(),dep=$("#departDate").value;let s=saleDate(dep,pd,st);state.trains.unshift({id:uid(),kind:"outbound",from,to,travelAt:combineDateTime(dep,"12:00").toISOString(),saleAt:s.toISOString(),saleTime:st,presaleDays:pd,leadDays:lead,done:false});if($("#roundTrip").checked&&$("#returnDate").value){let rd=$("#returnDate").value,rs=saleDate(rd,pd,st);state.trains.unshift({id:uid(),kind:"return",from:to||"返程出发站",to:from,travelAt:combineDateTime(rd,"12:00").toISOString(),saleAt:rs.toISOString(),saleTime:st,presaleDays:pd,leadDays:lead,done:false})}$("#trainForm").reset();$("#presaleDays").value=15;$("#saleTime").value="09:00";$("#trainDialog").close();save()});
$("#quickAddBtn").onclick=()=>{addTodo($("#quickInput").value);$("#quickInput").value=""};$("#quickInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("#quickAddBtn").click()});$("[data-jump='quickInput']").onclick=()=>$("#quickInput").scrollIntoView({behavior:"smooth",block:"center"});
$("#openCatModal").onclick=$("#openCatModal2").onclick=()=>{const d=new Date();d.setDate(d.getDate()+30);$("#catDate").value=d.toISOString().slice(0,10);$("#catDialog").showModal()};
$("#catForm").addEventListener("submit",e=>{e.preventDefault();state.cats.unshift({id:uid(),name:$("#catName").value.trim(),nextDate:new Date($("#catDate").value+"T09:00:00").toISOString(),cycleDays:Number($("#catCycle").value),note:$("#catNote").value.trim()});$("#catForm").reset();$("#catDialog").close();save()});
$("#clearDoneBtn").onclick=()=>{state.todos=state.todos.filter(x=>!x.done);save()};
$("#notifyBtn").onclick=async()=>{if(!("Notification"in window)){alert("当前浏览器不支持网页通知。重要事项请使用“加到日历”。");return}let p=await Notification.requestPermission();if(p==="granted")new Notification("记得",{body:"通知已开启。"})};
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.tab==="train")$("#trainList").scrollIntoView({behavior:"smooth"});if(b.dataset.tab==="cat")$("#catList").scrollIntoView({behavior:"smooth"});if(b.dataset.tab==="home")window.scrollTo({top:0,behavior:"smooth"})});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
render();


// ===== V4 自动更新管理 =====
const APP_VERSION = "4.0.0";
(function setupAutoUpdate(){
  const badge = document.getElementById("versionBadge");
  if (badge) badge.textContent = "V4";

  const toast = document.getElementById("updateToast");
  const title = document.getElementById("updateTitle");
  const text = document.getElementById("updateText");
  const reloadBtn = document.getElementById("updateReloadBtn");

  function showToast(t, m, canReload=false){
    if(!toast) return;
    if(title) title.textContent=t;
    if(text) text.textContent=m;
    if(reloadBtn){
      reloadBtn.hidden=!canReload;
      reloadBtn.onclick=()=>location.reload();
    }
    toast.hidden=false;
  }

  if ("serviceWorker" in navigator) {
    let reloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      showToast("更新完成", "正在切换到新版本…");
      setTimeout(()=>location.reload(), 350);
    });

    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("sw.js", {updateViaCache:"none"});
        await reg.update();

        // 每次启动都绕过缓存读取版本号
        const res = await fetch(`version.json?t=${Date.now()}`, {cache:"no-store"});
        if(res.ok){
          const latest = await res.json();
          if(latest.version && latest.version !== APP_VERSION){
            showToast("发现新版本", `V${latest.version} 已发布，正在准备更新…`);
            await reg.update();
            if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
            else {
              setTimeout(()=>{
                showToast("新版已准备好", "如未自动刷新，可点此立即更新。", true);
              }, 1200);
            }
          }
        }
      } catch (err) {
        console.log("自动更新检查失败：", err);
      }
    });
  }
})();
