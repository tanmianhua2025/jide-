
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
   ...state.cats.map(x=>{const p=catPrediction(x);return p?({...x,type:"cat",when:p.date,label:x.name}):null}).filter(Boolean)
 ].filter(x=>daysBetween(new Date(),x.when)<=7).sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,5);
 $("#urgentList").innerHTML=urgent.length?"":'<div class="empty">这几天暂时没有急事 ✨</div>';
 urgent.forEach(x=>$("#urgentList").appendChild(simpleUrgent(x)));
 renderTrains(); renderTodos(); renderCats();
}
function simpleUrgent(x){const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`${x.type==="train"?"🚄 ":x.type==="cat"?"🐱 ":""}${x.label}<span class="badge ${badge(x.when)}">${rel(x.when)}</span>`;t.querySelector(".item-meta").textContent=fmtDate(x.when);return t}
function renderTodos(){const arr=state.todos.filter(x=>!x.done).sort((a,b)=>new Date(a.due)-new Date(b.due));$("#todoList").innerHTML=arr.length?"":'<div class="empty">还没有待办。</div>';arr.forEach(x=>{const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`${x.title}<span class="badge ${badge(x.due)}">${rel(x.due)}</span>`;t.querySelector(".item-meta").textContent=`${fmtDate(x.due)}${x.cycleDays?` · 每${x.cycleDays}天重复`:""}`;const a=t.querySelector(".item-actions");const done=btn(x.cycleDays?"完成并顺延":"完成","primary",()=>{if(x.cycleDays){let d=new Date(x.due);d.setDate(d.getDate()+x.cycleDays);x.due=d.toISOString()}else x.done=true;save()});const cal=btn("加到日历","",()=>ics(x.title,x.due,"来自「记得」"));a.append(done,cal);$("#todoList").appendChild(t)})}
function renderTrains(){const arr=state.trains.filter(x=>!x.done).sort((a,b)=>new Date(a.saleAt)-new Date(b.saleAt));$("#trainList").innerHTML=arr.length?"":'<div class="empty">还没有火车票提醒。点“新增”输入行程。</div>';arr.forEach(x=>{const t=$("#itemTemplate").content.cloneNode(true);t.querySelector(".item-title").innerHTML=`🚄 ${x.from} → ${x.to||"目的地"}<span class="badge ${badge(x.saleAt)}">${rel(x.saleAt)}</span>`;t.querySelector(".item-meta").innerHTML=`${x.kind==="return"?"返程":"去程"} ${fmtDate(x.travelAt)}出发 · 预计 ${fmtDate(x.saleAt)} ${x.saleTime} 开售`;const a=t.querySelector(".item-actions");a.append(btn("加到日历","train",()=>ics(`购买火车票：${x.from}→${x.to||"目的地"}`,x.saleAt,`乘车日期：${fmtDate(x.travelAt)}。请以12306实际起售时间为准。`,x.leadDays)),btn("已购票","primary",()=>{x.done=true;save()}));$("#trainList").appendChild(t)})}

function catIntervals(records){
  if(!records || records.length < 2) return [];
  const sorted=[...records].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const arr=[];
  for(let i=1;i<sorted.length;i++){
    arr.push(Math.max(1,Math.round((new Date(sorted[i].date)-new Date(sorted[i-1].date))/86400000)));
  }
  return arr;
}
function catPredictedInterval(cat){
  const ints=catIntervals(cat.records||[]);
  if(!ints.length) return null;
  const recent=ints.slice(-5);
  return Math.round(recent.reduce((a,b)=>a+b,0)/recent.length);
}
function catPrediction(cat){
  if(cat.type==="fixed"){
    return cat.nextDate?{date:cat.nextDate,interval:Number(cat.cycleDays||0)}:null;
  }
  const recs=(cat.records||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const interval=catPredictedInterval(cat);
  if(!interval || recs.length<2) return null;
  const last=new Date(recs[recs.length-1].date);
  last.setDate(last.getDate()+interval);
  return {date:last.toISOString(),interval};
}
function migrateCats(){
  let changed=false;
  state.cats=(state.cats||[]).map(c=>{
    if(c.type) return c;
    changed=true;
    if(c.cycleDays){
      return {...c,type:"fixed",records:[],leadDays:5};
    }
    return {...c,type:"consumable",records:[{date:c.nextDate||new Date().toISOString(),note:c.note||""}],leadDays:5};
  });
  if(changed) localStorage.setItem(KEY,JSON.stringify(state));
}
function renderCats(){
  migrateCats();
  const arr=[...state.cats].sort((a,b)=>{
    const pa=catPrediction(a),pb=catPrediction(b);
    const da=pa?new Date(pa.date):new Date("2999-01-01");
    const db=pb?new Date(pb.date):new Date("2999-01-01");
    return da-db;
  });
  $("#catList").innerHTML=arr.length?"":'<div class="empty">还没有猫咪用品记录。先新增一个猫粮、猫罐头或滤芯吧。</div>';
  arr.forEach(x=>{
    const t=$("#itemTemplate").content.cloneNode(true);
    const p=catPrediction(x);
    const recs=(x.records||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const last=recs.length?recs[recs.length-1]:null;

    let title=`${x.name}<span class="cat-type-tag">${x.type==="fixed"?"固定周期":"自动预测"}</span>`;
    if(p) title+=`<span class="badge ${badge(p.date)}">${rel(p.date)}</span>`;
    t.querySelector(".item-title").innerHTML=title;

    let meta="";
    if(x.type==="fixed"){
      meta=`下次：${fmtDate(x.nextDate)} · 每${x.cycleDays}天`;
    }else if(recs.length===1){
      meta=`已记录 ${fmtDate(recs[0].date)} · 再记录一次后开始自动预测`;
    }else if(recs.length>=2){
      const ints=catIntervals(recs),recent=ints.slice(-5);
      const avg=Math.round(recent.reduce((a,b)=>a+b,0)/recent.length);
      meta=`最近记录：${fmtDate(last.date)} · 最近${recent.length}次间隔平均 ${avg} 天`;
    }
    if(x.note) meta+=` · ${x.note}`;
    t.querySelector(".item-meta").textContent=meta;

    if(p && x.type==="consumable"){
      const box=document.createElement("div");
      box.className="prediction-box";
      box.textContent=`预计下次：${fmtDate(p.date)}（按最近记录间隔约 ${p.interval} 天估算）`;
      t.querySelector(".item-main").appendChild(box);
    }

    const actions=t.querySelector(".item-actions");
    if(x.type==="consumable"){
      actions.append(btn("记录一次","primary",()=>openCatRecord(x.id)),btn("查看历史","",()=>openCatHistory(x.id)));
    }else{
      actions.append(btn("已处理","primary",()=>{
        const d=new Date(x.nextDate); d.setDate(d.getDate()+Number(x.cycleDays||0)); x.nextDate=d.toISOString(); save();
      }));
    }
    $("#catList").appendChild(t);
  });
}
function btn(text,cls,fn){const b=document.createElement("button");b.className="small-btn "+cls;b.textContent=text;b.onclick=fn;return b}
function ics(title,iso,desc,leadDays=0){const d=new Date(iso),pad=n=>String(n).padStart(2,"0"),f=x=>`${x.getUTCFullYear()}${pad(x.getUTCMonth()+1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;let alarms=`BEGIN:VALARM\nTRIGGER:-PT10M\nACTION:DISPLAY\nDESCRIPTION:${title}\nEND:VALARM`;if(leadDays>0)alarms+=`\nBEGIN:VALARM\nTRIGGER:-P${leadDays}D\nACTION:DISPLAY\nDESCRIPTION:${title}\nEND:VALARM`;const end=new Date(d.getTime()+30*60000),txt=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${uid()}@jide\nDTSTART:${f(d)}\nDTEND:${f(end)}\nSUMMARY:${title}\nDESCRIPTION:${desc||""}\n${alarms}\nEND:VEVENT\nEND:VCALENDAR`;const blob=new Blob([txt],{type:"text/calendar;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="记得_火车票提醒.ics";a.click()}
function openTrain(){const d=new Date();d.setDate(d.getDate()+20);$("#departDate").value=d.toISOString().slice(0,10);$("#trainDialog").showModal();updatePreview()}
function updatePreview(){if(!$("#departDate").value)return;const s=saleDate($("#departDate").value,$("#presaleDays").value,$("#saleTime").value);$("#trainPreview").textContent=`预计购票日：${s.getMonth()+1}月${s.getDate()}日 ${$("#saleTime").value}。乘车日：${new Date($("#departDate").value+"T00:00:00").getMonth()+1}月${new Date($("#departDate").value+"T00:00:00").getDate()}日。`}
$("#openTrain").onclick=$("#openTrain2").onclick=openTrain;
["departDate","presaleDays","saleTime"].forEach(id=>$("#"+id).addEventListener("input",updatePreview));
$("#roundTrip").onchange=()=>{$("#returnDateWrap").style.display=$("#roundTrip").checked?"block":"none"};
$("#trainForm").addEventListener("submit",e=>{e.preventDefault();const pd=Number($("#presaleDays").value),st=$("#saleTime").value,lead=Number($("#leadPreset").value),from=$("#fromStation").value.trim(),to=$("#toStation").value.trim(),dep=$("#departDate").value;let s=saleDate(dep,pd,st);state.trains.unshift({id:uid(),kind:"outbound",from,to,travelAt:combineDateTime(dep,"12:00").toISOString(),saleAt:s.toISOString(),saleTime:st,presaleDays:pd,leadDays:lead,done:false});if($("#roundTrip").checked&&$("#returnDate").value){let rd=$("#returnDate").value,rs=saleDate(rd,pd,st);state.trains.unshift({id:uid(),kind:"return",from:to||"返程出发站",to:from,travelAt:combineDateTime(rd,"12:00").toISOString(),saleAt:rs.toISOString(),saleTime:st,presaleDays:pd,leadDays:lead,done:false})}$("#trainForm").reset();$("#presaleDays").value=15;$("#saleTime").value="09:00";$("#trainDialog").close();save()});
$("#quickAddBtn").onclick=()=>{addTodo($("#quickInput").value);$("#quickInput").value=""};$("#quickInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("#quickAddBtn").click()});$("[data-jump='quickInput']").onclick=()=>$("#quickInput").scrollIntoView({behavior:"smooth",block:"center"});

function toggleCatTypeFields(){
  const isFixed=$("#catType").value==="fixed";
  $("#consumableFields").style.display=isFixed?"none":"block";
  $("#fixedFields").style.display=isFixed?"block":"none";
  $("#catFirstDate").required=!isFixed;
  $("#catFixedDate").required=isFixed;
}
$("#catType").addEventListener("change",toggleCatTypeFields);

$("#openCatModal").onclick=$("#openCatModal2").onclick=()=>{
  const d=new Date();
  $("#catFirstDate").value=d.toISOString().slice(0,10);
  const f=new Date(); f.setDate(f.getDate()+30);
  $("#catFixedDate").value=f.toISOString().slice(0,10);
  $("#catType").value="consumable";
  toggleCatTypeFields();
  $("#catDialog").showModal();
};

$("#catForm").addEventListener("submit",e=>{
  e.preventDefault();
  const type=$("#catType").value;
  if(type==="consumable"){
    state.cats.unshift({
      id:uid(),name:$("#catName").value.trim(),type:"consumable",
      leadDays:Number($("#catLeadDays").value||5),note:$("#catNote").value.trim(),
      records:[{date:new Date($("#catFirstDate").value+"T09:00:00").toISOString(),note:"首次记录"}]
    });
  }else{
    state.cats.unshift({
      id:uid(),name:$("#catName").value.trim(),type:"fixed",
      nextDate:new Date($("#catFixedDate").value+"T09:00:00").toISOString(),
      cycleDays:Number($("#catCycle").value),note:$("#catNote").value.trim(),records:[]
    });
  }
  $("#catForm").reset();
  $("#catDialog").close();
  save();
});

function openCatRecord(id){
  const cat=state.cats.find(c=>c.id===id); if(!cat) return;
  $("#catRecordId").value=id;
  $("#catRecordName").textContent=cat.name;
  $("#catRecordDate").value=new Date().toISOString().slice(0,10);
  $("#catRecordNote").value="";
  $("#catRecordDialog").showModal();
}
$("#catRecordForm").addEventListener("submit",e=>{
  e.preventDefault();
  const cat=state.cats.find(c=>c.id===$("#catRecordId").value); if(!cat) return;
  cat.records=cat.records||[];
  cat.records.push({date:new Date($("#catRecordDate").value+"T09:00:00").toISOString(),note:$("#catRecordNote").value.trim()});
  $("#catRecordDialog").close();
  save();
});

function openCatHistory(id){
  const cat=state.cats.find(c=>c.id===id); if(!cat) return;
  $("#catHistoryTitle").textContent=`${cat.name} · 记录历史`;
  const box=$("#catHistoryList"); box.innerHTML="";
  const recs=(cat.records||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!recs.length){
    box.innerHTML='<div class="empty">暂无记录</div>';
  }else{
    recs.forEach((r,idx)=>{
      const row=document.createElement("div"); row.className="history-row";
      const left=document.createElement("div");
      left.innerHTML=`<b>${fmtDate(r.date)}</b><br><small>${r.note||"无备注"}</small>`;
      const right=document.createElement("small");
      if(idx<recs.length-1){
        const prev=recs[idx+1];
        right.textContent=`距上次 ${Math.round((new Date(r.date)-new Date(prev.date))/86400000)} 天`;
      }else right.textContent="首次记录";
      row.append(left,right); box.appendChild(row);
    });
  }
  $("#catHistoryDialog").showModal();
}
$("#clearDoneBtn").onclick=()=>{state.todos=state.todos.filter(x=>!x.done);save()};
$("#notifyBtn").onclick=async()=>{if(!("Notification"in window)){alert("当前浏览器不支持网页通知。重要事项请使用“加到日历”。");return}let p=await Notification.requestPermission();if(p==="granted")new Notification("记得",{body:"通知已开启。"})};
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.tab==="train")$("#trainList").scrollIntoView({behavior:"smooth"});if(b.dataset.tab==="cat")$("#catList").scrollIntoView({behavior:"smooth"});if(b.dataset.tab==="home")window.scrollTo({top:0,behavior:"smooth"})});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
render();


// ===== V4 自动更新管理 =====
const APP_VERSION = "5.0.0";
(function setupAutoUpdate(){
  const badge = document.getElementById("versionBadge");
  if (badge) badge.textContent = "V5";

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
