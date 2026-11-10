const $=(id)=>document.getElementById(id);
const ITEMS=Object.entries(CATALOG).flatMap(([part,s])=>s.split(";").map(r=>{const [name,alias,group,x]=r.split("|");return{name,alias,group,part,noPhoto:x==="x"}}));
const byName=(n)=>ITEMS.find(i=>i.name===n);
// 鼻フルコースの公開料金表10プラン（万円、確認日 2026-11-03）
const PLANS=[77,80,110,110,132,138.6,160,165,165,198];
const FLAGS=[["圧迫しても止まらない出血"],["短時間で急に広がる腫れ、片側だけの急な腫れ"],["強くなる痛み（痛み止めが効かない、一度良くなってから悪化した）"],["38度以上の発熱"],["赤みや熱感の広がり、膿、悪臭のある分泌物"],["皮膚の色の変化（白っぽい、紫、黒ずみ）と強い痛み"],["傷が開いた、入れたものが透けて見える・出てきた"],["目の周りの腫れ、見え方の変化"],["息苦しさ、胸の痛み、意識がもうろうとする",true]];
const PRESSURE=["今日契約すれば割引と言われた","勧められて施術が増えた","総額の内訳をもらっていない","リスクと合併症の説明を受けていない","修正や保証の条件を確認していない"];
const BANDS={days:[3,7,14,30,90,180,365],fast:[100,70,45,20,8,2.5,1],std:[100,85,65,33,15,5,2.5],slow:[100,95,80,55,30,12,5]};
const LEVELS=[["pain","痛み"],["swell","腫れ"],["bruise","内出血"]];
const SAMPLE=[[1,3,4,2],[2,3,5,3],[3,2,5,4],[4,2,4,4],[5,2,4,3],[6,1,3,3],[7,1,3,2]];
// AI生成の架空の人物による、鼻の手術のモデル経過（相方が生成）。実在の症例ではない。
const MODEL=[["day0","当日",0],["day3","3日後",3],["week1","1週間後",7],["month1","1か月後",30],["month3","3か月後",90],["month6","半年後",180],["year1","1年後",365]];

// 公開価格の幅（万円）。相方の試作ZIPのデータから、施術の範囲がはっきり対応するものだけ。支払額の統計ではない。
const SITE="美容医療の情報サイト",CLINIC="クリニックの公開料金例";
const S={misao:[SITE,"https://media.misao-ladies.jp/biyou-iryou-hiyou-souba/"],cj:[SITE,"https://www.clinicjapan.net/plastic-surgery-japan/"],cj26:[SITE,"https://www.clinicjapan.net/japan-cosmetic-surgery-price-list-2026/"],cjhow:[SITE,"https://www.clinicjapan.net/how-much-plastic-surgery-japan/"],sbcPtosis:[CLINIC,"https://www.s-b-c.net/eyelid/sekkai/gankenkasui/"],sbcTare:[CLINIC,"https://www.s-b-c.net/eyelid/sekkai/tareme/"],verite:[CLINIC,"https://www.veriteclinic.or.jp/progress/eyes/ptosis/"],keisei:[CLINIC,"https://www.keisei-cs.com/medical-treatment/drooping-eye.html"],mizuno:[CLINIC,"https://www.mizunomori.com/diagnosis/eye/tareme/"]};
const REF_PRICE={
  "鼻フルコース":[77,198,[["ジョウクリニック「鼻フルコース」オープン法132万円／クローズ法165万円",""],["キハルクリニック ノーマル77万円／フルコース110万円／肋軟骨フルコース165万円",""],["V CLINIC スタンダード80万円／プレミアム110万円／プラチナ160万円",""],["BIANCA Clinic「鼻フルSET」138.6万円",""],["THE ROPPONGI CLINIC「鼻フルコース」198万円",""]].map(([t,u])=>[CLINIC+"："+t+"（公式料金表、確認日 2026-11-03。プランごとに含まれる施術は異なります）",u])],
  "重瞼術（埋没法）":[3,20,[S.misao]],"重瞼術（切開法）":[20,40,[S.cj]],"目頭切開":[15,35,[S.misao]],"目尻切開":[15,35,[S.misao]],
  "眼瞼下垂手術":[22.8,55,[S.sbcPtosis,S.verite,S.keisei]],"下眼瞼下制術":[20,55,[S.sbcTare,S.mizuno,S.keisei]],"上まぶたの脂肪取り":[7.6,16.2,[S.sbcPtosis]],
  "鼻尖縮小術":[15,80,[S.cj26,S.cj]],"鼻尖形成術":[15,80,[S.cj26,S.cj]],"鼻中隔延長術":[80,200,[S.cj]],"隆鼻術（プロテーゼ）":[30,80,[S.cj]],"小鼻縮小術":[15,80,[S.cj26,S.cj]],
  "オトガイ形成":[20,50,[S.cj]],"口唇ヒアルロン酸":[3,10,[S.misao]],"下顎骨骨切り・削り":[80,200,[S.cj]],"頬骨骨切り・削り":[80,200,[S.cj]],
  "バッカルファット除去":[15,40,[S.cj,S.misao]],"スレッドリフト":[10,35,[S.cjhow,S.misao]]
};

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};
const toISO=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const daysAgo=n=>toISO(new Date(Date.now()-n*864e5));
const diff=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const today=daysAgo(0);
const md=iso=>iso?`${Number(iso.slice(5,7))}/${Number(iso.slice(8,10))}`:"−";
const num=v=>Math.round(v*10)/10;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const link=(text,href)=>{const a=el("a","",text);a.href=href;a.target="_blank";a.rel="noopener";return a};
const checked=(n)=>[...document.querySelectorAll(`input[name=${n}]:checked`)].map(e=>Number(e.value));
const list=(id,arr,name)=>$(id).insertAdjacentHTML("beforeend",arr.map((x,i)=>`<label class="check"><input type="checkbox" name="${name}" value="${i}"><span>${Array.isArray(x)?x[0]:x}</span></label>`).join(""));
list("pressure",PRESSURE,"pressure");list("flags",FLAGS,"flag");
$("flag-ref").replaceChildren(...FLAGS.map(f=>el("li","",f[0])));

// 画面の切り替え
const PANELS={home:"home",price:"price",estimate:"estimate-tab",after:"after"};
function showTab(name){
  if(name==="after"&&!sel.after.length&&sel.before.length&&!store.get("carried",false)){store.set("carried",true);setSel("after",[...sel.before]);const n=$("carry-note");if(n){n.hidden=false}}
  for(const [t,id] of Object.entries(PANELS)){$("tab-"+t).setAttribute("aria-selected",String(t===name));$(id).hidden=t!==name}scrollTo(0,0)}
for(const t of Object.keys(PANELS))$("tab-"+t).onclick=()=>showTab(t);
for(const b of document.querySelectorAll("[data-go]"))b.onclick=()=>showTab(b.dataset.go);

// 施術の選択：受けた施術（after）と、気になる施術（before）を別々に持つ
(()=>{const old=store.get("procs",null);if(Array.isArray(old)){if(store.get("procsAfter",null)===null)store.set("procsAfter",old);if(store.get("procsBefore",null)===null)store.set("procsBefore",old);store.del("procs")}})();
const KEY={after:"procsAfter",before:"procsBefore"};
const sel={after:store.get(KEY.after,[]).filter(byName),before:store.get(KEY.before,[]).filter(byName)};
let pickFor="before",part="";
const MAX=5;
const groupsOf=(names)=>[...new Set(names.map(n=>byName(n).group))].map(g=>GROUPS[g]);
const afterGroups=()=>groupsOf(sel.after);
function setSel(which,names){sel[which]=names;store.set(KEY[which],names);refresh()}
function renderParts(){
  const box=$("parts");box.replaceChildren();
  for(const p of Object.keys(CATALOG)){const b=el("button","",p);b.type="button";b.setAttribute("aria-pressed",String(p===part));b.onclick=()=>{part=p===part?"":p;$("q").value="";renderParts();renderResults()};box.append(b)}
}
function renderResults(){
  const q=$("q").value.trim(),cur=sel[pickFor];
  const hits=ITEMS.filter(i=>q?(i.name+i.alias+i.part).includes(q):i.part===(part||"鼻")).slice(0,40);
  const box=$("results");box.replaceChildren();
  if(!hits.length){box.append(el("p","muted","施術が見つかりませんでした。別の名前でも検索できます。"));return}
  for(const it of hits){
    const on=cur.includes(it.name),b=el("button");b.type="button";b.setAttribute("aria-pressed",String(on));
    const n=el("span","",it.name);if(it.alias)n.append(el("small","",it.alias));
    b.append(n,el("span","tag"+(on?"":pickFor==="before"?" t-"+trust(it.name).cls:""),on?"✓ 選択中":pickFor==="before"?trust(it.name).t.replace("公式料金ページ","公式"):""));
    b.onclick=()=>{if(on)setSel(pickFor,cur.filter(x=>x!==it.name));else if(cur.length<MAX)setSel(pickFor,[...cur,it.name]);renderResults()};
    box.append(b);
  }
}
for(const b of document.querySelectorAll("[data-pick]"))b.onclick=()=>{pickFor=b.dataset.pick;const cur=sel[pickFor];part=cur.length?byName(cur[0]).part:"鼻";$("q").value="";$("picker-title").textContent=pickFor==="after"?"受けた施術を選ぶ":"気になる施術を選ぶ";document.querySelector(".has-price-key").hidden=pickFor!=="before";renderParts();renderResults();$("picker").showModal()};
$("picker-done").onclick=()=>$("picker").close();
$("q").oninput=renderResults;
function renderChips(){
  for(const box of document.querySelectorAll("[data-chips]")){
    const which=box.dataset.chips;box.replaceChildren();
    if(!sel[which].length)box.append(el("p","fine","施術を選んでください。"));
    for(const n of sel[which]){const c=el("button","chip");c.type="button";c.append(el("span","",n),el("span","x","×"));c.setAttribute("aria-label",n+"を外す");c.onclick=()=>setSel(which,sel[which].filter(x=>x!==n));box.append(c)}
  }
}

// 出典：1行に畳む
const CHECKED="2026-11-06";
const srcKind=(g)=>!g.src?"":g.src[1].includes("minds")?"診療指針":g.src[1].includes("kobe")?"大学病院":g.src[1].includes("jsprs")?"学会":"公的機関";
function srcFold(kind,items){
  const d=el("details","src"),s=el("summary");s.append(el("span","","出典："+kind));d.append(s);
  const ul=el("ul");for(const [t,u,date] of items){const li=el("li");li.append(u?link(t,u):el("span","",t));if(date)li.append(el("span","src-date","確認 "+date));ul.append(li)}
  d.append(ul);return d;
}
const srcLine=(g)=>g.src?srcFold(srcKind(g),[[g.src[0],g.src[1],CHECKED]]):el("span");

// 1 価格：施術ごとに、公開価格の幅を「安め・中くらい・高め」の3つの枠で見せる。
// 枠は幅を同じ間隔で分けた位置（件数の多さではない）。鼻フルだけは公開料金表10プランの件数を枠ごとに出す。
const quantile=(a,q)=>{const p=(a.length-1)*q,l=Math.floor(p);return a[l]+(a[Math.ceil(p)]-a[l])*(p-l)};
// 料金の情報は2つの調査を足し合わせて持つ（置き換えない）。
// ・RESEARCH：日本の公式料金ページの掲載額（153施術、2026-11-08）。韓国の公式価格と、回復の中立出典の数も
// ・REF_PRICE：相方の試作のデータ（情報サイトとクリニックの料金例）。鼻フルは公式料金表10プラン（2026-11-03）
// 画面の主役（3つの価格帯）は、裏づけの強いほうを使う。もう一方は「くわしく」に必ず並べる。
const RS=n=>typeof RESEARCH!=="undefined"?RESEARCH[n]:null;
function primary(n){
  const r=RS(n),f=REF_PRICE[n];
  const off=r&&r.jp?{lo:r.jp[0],hi:r.jp[1],kind:"official",n:r.jpN,unit:r.unit||""}:null;
  const ref=f?{lo:f[0],hi:f[1],kind:n==="鼻フルコース"?"plans":"site",n:n==="鼻フルコース"?10:f[2].length,unit:""}:null;
  if(off&&off.n>=2)return off;
  if(ref&&(!off||ref.kind==="plans"))return ref;
  return off||ref;
}
const trust=(n)=>{const p=primary(n);if(!p)return{cls:"none",t:"公開価格を確認できず"};
  if(p.kind==="official"&&RS(n)&&RS(n).mixed)return{cls:"weak",t:`公式料金ページ ${p.n}件・単位が混在`};
  if(p.kind==="official")return p.n>=3?{cls:"strong",t:`公式料金ページ ${p.n}件で確認`}:{cls:"mid",t:`公式料金ページ ${p.n}件`};
  if(p.kind==="plans")return{cls:"strong",t:"公式料金表 10プラン"};return{cls:"weak",t:"情報サイト等の目安"}};
// 単位が混ざった掲載（例：1ccと1回）は1本の幅として見せない（2026-11-09改訂の方針）
const mixedU=n=>{const p=primary(n),r=RS(n);return!!(p&&p.kind==="official"&&r&&r.mixed)};
const tierable=n=>{const p=primary(n);return p&&p.hi!=null&&p.hi>p.lo&&!mixedU(n)};
const priced=()=>sel.before.filter(tierable);
const sumRange=()=>{const p=priced();return p.length?[num(p.reduce((s,n)=>s+primary(n).lo,0)),num(p.reduce((s,n)=>s+primary(n).hi,0))]:null};
const TIER=["下の価格帯","中央の価格帯","上の価格帯"];
const fmt=(v,span)=>String(span>=30?Math.round(v):num(v));
function thirds(lo,hi){const st=(hi-lo)/3;return[[lo,lo+st],[lo+st,lo+2*st],[lo+2*st,hi]]}
const tierOf=(v,lo,hi)=>v<lo?-1:v>hi?3:Math.min(2,Math.floor((v-lo)/((hi-lo)/3||1)));
const man=v=>v<10?String(Math.round(v*100)/100):String(num(v));
const yenJ=v=>Math.round(v*10000).toLocaleString("ja-JP")+"円";
const yenR=(a)=>a[1]==null?`${man(a[0])}万円〜`:a[0]===a[1]?`${man(a[0])}万円`:`${man(a[0])}〜${man(a[1])}万円`;
const yenX=(a)=>a[1]==null?`${yenJ(a[0])}〜`:a[0]===a[1]?yenJ(a[0]):`${yenJ(a[0])}〜${yenJ(a[1])}`;
// 施術ごとの「くわしく」：すべての情報をここに並べる
function detailFor(n){
  const r=RS(n),f=REF_PRICE[n],d=el("details","more-info"),sm=el("summary","","くわしく：出典と、ほかの調べ");d.append(sm);
  const ul=el("ul","info-list");
  const li=(h,t,extra)=>{const x=el("li");x.append(el("b","",h),el("span","",t));if(extra)x.append(extra);ul.append(x)};
  if(r){
    li("日本の公式料金ページ",r.jp?`${yenX(r.jp)}（${r.unit}）・${r.jpN}件・${RESEARCH_META.viewed}に確認`:`公開価格を確認できませんでした（${RESEARCH_META.viewed}時点）`);
  }
  if(f){
    const srcs=f[2];li(n==="鼻フルコース"?"公式料金表 10プラン":"情報サイト等の目安",`${f[0]}〜${f[1]}万円`+(n==="鼻フルコース"?"・2026-11-03に確認":""),
      srcFold(srcs.length+"件",srcs.map(([k,u])=>u?[new URL(u).hostname.replace(/^www\./,"")+"（"+k+"）",u]:[k,""])));
  }
  if(r){
    li("韓国の公式価格（参考）",r.kr?`約${yenR(r.kr)}・${r.krN}院。VATや為替の前提が違うため、日本の料金とは比べられません`:"公式の価格を確認できませんでした");
    li("施術後の変化について中立な出典",r.recD?`この施術を直接扱う出典 ${r.recD}件（公的機関・学会・論文・公的病院）`+(r.recG?`。ほかに総論 ${r.recG}件`:""):r.recG?`この施術を名指しした出典はまだありません。上位の総論ページだけです（${r.recNote||"総論 "+r.recG+"件"}）`:"中立な回復出典が未確認です");
  }
  if(r&&r.jp&&f){const p=primary(n);ul.append(el("li","note-src",`料金の価格帯は「${p.kind==="official"?"日本の公式料金ページ":p.kind==="plans"?"公式料金表10プラン":"情報サイト等の目安"}」で表示しています。調べ方が違うため、数字が合わないことがあります。`))}
  d.append(ul);return d;
}
function rangeChart(mark,markLabel){
  const names=sel.before.filter(n=>primary(n));
  const rows=names.map(n=>{const p=primary(n);return{name:n,lo:p.lo,hi:p.hi,unit:p.unit,plans:p.kind==="plans"?PLANS:null}});
  const sr=sumRange();if(priced().length>1)rows.push({name:"合計の目安",lo:sr[0],hi:sr[1],sum:true});
  const target=rows.at(-1);
  const out=el("div","stack tiers");
  for(const r of rows){
    const row=el("div","tier-row"+(r.sum?" sum":"")),head=el("div","tier-head");
    head.append(el("b","",r.name),el("span","",yenR([r.lo,r.hi])));row.append(head);
    if(!r.sum){const tb=el("div","trust"),t=trust(r.name);tb.append(el("i","tb "+t.cls,t.t));if(r.unit)tb.append(el("span","unit",r.unit));row.append(tb)}
    const can=r.hi!=null&&r.hi>r.lo&&!(!r.sum&&mixedU(r.name)),mt=mark&&r===target&&can?tierOf(mark,r.lo,r.hi):null;
    if(can){
      const strip=el("div","tier-strip"),span=r.hi-r.lo;
      thirds(r.lo,r.hi).forEach(([a,b],i)=>{
        const c=el("div","tier t"+i+(mt===i?" hit":""));
        c.append(el("b","",TIER[i]),el("span","",`${fmt(a,span)}〜${fmt(b,span)}`));
        if(r.plans){const k=r.plans.filter(p=>i===2?p>=a&&p<=b:p>=a&&p<b).length;c.append(el("small","",`${k}件`))}
        if(mt===i)c.append(el("em","",`${markLabel} ${mark}`));
        strip.append(c);
      });
      row.append(strip);
    }else if(!r.sum)row.append(el("p","fine",mixedU(r.name)?"掲載の単位が混ざっている（例：1ccと1回）ため、1本の幅としては比べられません。価格帯には分けず、合計にも入れていません。":"掲載が1つの金額だけのため、価格帯には分けていません。"));
    if(mt===-1||mt===3)row.append(el("p","tier-out",`${markLabel} ${mark}万円は、この幅より${mt<0?"下":"上"}です。`));
    if(r.sum){const us=new Set(priced().map(n=>primary(n).unit).filter(Boolean));if(us.size>1)row.append(el("p","fine","施術ごとに価格の単位（手術1回、両目、1ccなど）が違うため、合計は大まかな目安です。"));const ex=sel.before.filter(n=>!tierable(n));if(ex.length)row.append(el("p","fine",`${ex.join("・")}は、金額が1つだけか単位が混ざっているため、合計に入っていません。`))}
    if(!r.sum)row.append(detailFor(r.name));
    out.append(row);
  }
  if($("plans-note"))$("plans-note").textContent=rows.some(r=>r.plans)?"鼻フルコースの「◯件」は、公式料金表10プランのうち、その範囲に入る数です。":"";
  return out;
}
function positionText(total){
  const p=priced();if(!p.length)return"";
  const [lo0,hi0]=p.length>1?sumRange():[primary(p[0]).lo,primary(p[0]).hi],t=tierOf(total,lo0,hi0),lo=man(lo0),hi=man(hi0);
  const base=t<0?`公開されている料金の幅（${lo}〜${hi}万円）より下です。含まれる施術の範囲を確認しましょう。`:t>2?`公開されている料金の幅（${lo}〜${hi}万円）より上です。追加された項目と、その理由を確認しましょう。`:`公開されている料金の幅の「${TIER[t]}」にあります。`;
  return base+"高い・安いの良し悪しは判定しません。";
}
// 「このデータについて」：調べた範囲を数で正直に見せる（一度だけ作る）
function renderDataAbout(){
  const box=$("range-src");if(box.dataset.done||typeof RESEARCH==="undefined")return;box.dataset.done="1";
  const v=Object.values(RESEARCH),c=f=>v.filter(f).length;
  const ul=el("ul","info-list");
  const li=(h,t)=>{const x=el("li");x.append(el("b","",h),el("span","",t));ul.append(x)};
  li("調べた施術",`${v.length}施術（${RESEARCH_META.viewed}に各クリニックの公式料金ページを確認）`);
  li("日本の公式料金",`確認できた ${c(r=>r.status==="確認済")}／一部だけ ${c(r=>r.status==="一部")}／確認できず ${c(r=>r.status==="なし")}`);
  li("韓国の公式価格（参考）",`1院以上 ${c(r=>r.krN>=1)}施術、3院以上 ${c(r=>r.krN>=3)}施術。${RESEARCH_META.fx}`);
  li("施術後の変化の中立な出典",`施術を直接扱う出典が2件以上 ${c(r=>r.recD>=2)}／1件 ${c(r=>r.recD===1)}／総論ページのみ ${c(r=>!r.recD&&r.recG)}／未確認 ${c(r=>!r.recD&&!r.recG)}施術`);
  li("価格の単位",`単位が混ざった掲載が ${c(r=>r.jp&&r.mixed)}施術（価格のある${c(r=>r.jp)}施術中）。これらは価格帯に分けていません`);
  li("情報サイト等の目安",`${Object.keys(REF_PRICE).length}施術。鼻フルコースは公式料金表10プラン（2026-11-03確認）`);
  box.append(el("p","fine","画面の価格帯は、公式料金ページ2件以上の掲載があればそれを、なければ情報サイト等の目安を使っています。もう一方は各施術の「くわしく」に並べています。"),ul,
    srcFold("参照した主なページ "+RESEARCH_META.links.length+"件",RESEARCH_META.links.map(([t,u])=>[t,u,RESEARCH_META.viewed])));
}
function renderPrice(){
  const has=sel.before.length>0;$("price-box").hidden=!has;$("ask-box").hidden=!has;if(!has)return;
  const box=$("range-chart");box.replaceChildren();
  const bv=$("budget").value,bn=Number(bv),bad=bv!==""&&!(bn>=0&&bn<=10000);
  const budget=bad?null:bn||null;$("budget").setAttribute("aria-invalid",String(bad));
  if(sel.before.some(n=>primary(n)))box.append(rangeChart(budget,"予算"));
  const missing=sel.before.filter(n=>!primary(n));
  for(const n of missing){const w=el("div","tier-row");const h=el("div","tier-head");h.append(el("b","",n),el("span","","—"));const tb=el("div","trust");tb.append(el("i","tb none","公開価格を確認できず"));w.append(h,tb,el("p","fine","日本の公式料金ページで、公開されている料金を確認できませんでした。カウンセリングで見積もりをもらって確かめましょう。"),detailFor(n));box.append(w)}
  $("range-sum").hidden=priced().length<2;$("range-sum").textContent="合計は、それぞれの幅を足しただけです。セット料金や割引、麻酔・薬代は入っていません。";
  $("budget-text").hidden=!bad;if(bad){$("budget-text").className="note-warn";$("budget-text").textContent="予算は0〜10000万円の数字で入れてください。"}
  renderDataAbout();
  const asks=[...new Set(groupsOf(sel.before).flatMap(g=>g.ask))].slice(0,6);
  $("ask-list").replaceChildren(...asks.map(t=>el("li","",t)));
}
$("budget").oninput=renderPrice;
$("copy-ask").onclick=async()=>{const t=[...$("ask-list").children].map((li,i)=>`${i+1}. ${li.textContent}`).join("\n");try{await navigator.clipboard.writeText(t);$("copy-ask").textContent="コピーしました"}catch{$("copy-ask").textContent="コピーできませんでした"}setTimeout(()=>{$("copy-ask").textContent="質問をコピー"},2400)};

// 2 見積書
// 見積もりの項目名から、カタログの施術を探す（別の施術と比べてしまうのを防ぐ）
const keysOf=it=>{const core=it.name.replace(/（.*?）/g,""),inner=(it.name.match(/（(.+?)）/)||[])[1]||"";
  return[it.name,core+inner,inner.length>=3&&!/ヒアルロン酸|ボトックス|インプラント|脂肪/.test(inner)?inner:"",...(it.alias||"").split(/[、,]/)].map(k=>k.trim()).filter(k=>k.length>=3)};
function procsIn(text){const t=text.replace(/\s/g,"");return ITEMS.filter(it=>keysOf(it).some(k=>t.includes(k.replace(/\s/g,""))))}
function priceCompare(total,box,names){
  box.replaceChildren();if(!total)return;
  if(names&&names.length){
    const found=procsIn(names.join(" ")).map(i=>i.name),hit=sel.before.filter(n=>found.includes(n));
    if(found.length&&!hit.length){
      box.append(el("h3","","公開されている料金の目安と比べる"));
      const w=el("div","note-warn");w.append(el("p","",sel.before.length?`この見積もりは「${found.slice(0,3).join("・")}」の見積もりのようです。「料金」で選んでいる「${sel.before.join("・")}」とは別の施術なので、比べていません。`:`この見積もりは「${found.slice(0,3).join("・")}」の見積もりのようです。`));
      const b=el("button","secondary small",`「${found[0]}」の料金の目安と比べる`);b.type="button";b.onclick=()=>{setSel("before",[found[0]]);priceCompare(total,box,names)};w.append(b);box.append(w);return;
    }
    if(!found.length&&sel.before.length)box.append(el("p","fine",`見積もりの施術名と、「料金」で選んだ「${sel.before.join("・")}」が同じ施術か確かめてください。`));
  }
  if(!priced().length){box.append(el("p","fine","比べる施術を「料金」の画面で選ぶと、公開されている料金の目安と比べられます。"));return}
  box.append(el("h3","","公開されている料金の目安と比べる"),rangeChart(total,"見積もり"),el("p","",positionText(total)));
}
$("total").oninput=()=>{const v=Number($("total").value),bad=$("total").value!==""&&!(v>0);$("total").setAttribute("aria-invalid",String(bad));
  if(bad){const b=$("total-out");b.replaceChildren(el("p","note-warn","総額は0より大きい数字で入れてください。"));return}priceCompare(v||null,$("total-out"))};
function renderKnow(){
  const box=$("know");box.replaceChildren();
  if(!sel.before.length){box.append(el("p","fine","「料金」の画面で施術を選ぶと、ここに出ます。"));return}
  sel.before.forEach((n,i)=>{
    const g=GROUPS[byName(n).group],det=el("details","know");det.open=i===0;det.append(el("summary","",n));
    const b=el("div","stack");
    if(g.guide)b.append(el("p","note-info","指針の記載："+g.guide));
    if(g.know.length){const ul=el("ul","dots");for(const t of g.know)ul.append(el("li","",t));b.append(el("h3","","知っておくこと"),ul)}
    if(g.flow.length){const ul=el("ul","dots");for(const [lab,t] of flowRows(g))ul.append(el("li","",lab+"："+t));b.append(el("h3","","ダウンタイムの目安"),ul)}
    b.append(srcLine(g));det.append(b);box.append(det);
  });
}
let estFile=null;
$("estimate").onchange=e=>{const label=e.target.parentElement,f=e.target.files[0];estFile=f||null;label.querySelector("img")?.remove();label.querySelector("span").hidden=!!f;if(f){const img=new Image();img.alt="";img.src=URL.createObjectURL(f);label.prepend(img)}};
const yen=n=>n?`${(n/10000).toLocaleString("ja-JP")}万円`:"読み取れず";
let est={items:[],total:null};
function showEstimate(r){
  if(!r.isEstimate){$("est-status").textContent="見積書を読み取れませんでした。文字がはっきり写った写真でもう一度お試しください。";return}
  est={items:r.items.map(i=>({name:i.name,man:i.amountYen?i.amountYen/10000:null})),total:r.totalYen?r.totalYen/10000:null};
  renderEstItems();
  $("est-missing").replaceChildren(...r.notFound.map(t=>el("li","",t)));$("est-missing-box").hidden=!r.notFound.length;
  $("est-questions").value=r.questions.map((q,i)=>`${i+1}. ${q}`).join("\n");
  if(r.doctorName)$("doctor").value=r.doctorName;
  $("est-out").hidden=false;$("est-status").textContent="";$("est-out").scrollIntoView({behavior:"smooth",block:"start"});
}
// 読み取り結果は直せる。直した金額で比べる。
function renderEstItems(){
  const box=$("est-items");box.replaceChildren();
  est.items.forEach((it,k)=>{
    const li=el("li","edit"),n=el("input"),m=el("input"),x=el("button","del","×");
    n.type="text";n.value=it.name;n.setAttribute("aria-label",`項目${k+1}の名前`);n.oninput=()=>{it.name=n.value};
    m.type="number";m.inputMode="decimal";m.step="0.1";m.min="0";m.value=it.man??"";m.placeholder="読み取れず";m.setAttribute("aria-label",`項目${k+1}の金額（万円）`);m.oninput=()=>{it.man=m.value===""?null:Number(m.value);estCheck()};
    x.type="button";x.setAttribute("aria-label",`項目${k+1}を消す`);x.onclick=()=>{est.items.splice(k,1);renderEstItems()};
    const w=el("span","yen");w.append(m,el("small","","万円"));li.append(n,w,x);box.append(li);
  });
  const add=el("li","add"),ab=el("button","text-btn","＋ 項目を足す");ab.type="button";ab.onclick=()=>{est.items.push({name:"",man:null});renderEstItems()};add.append(ab);box.append(add);
  const tl=el("li","edit sum"),tn=el("b","","総額"),tm=el("input");tm.type="number";tm.inputMode="decimal";tm.step="0.1";tm.min="0";tm.value=est.total??"";tm.placeholder="読み取れず";tm.setAttribute("aria-label","総額（万円）");
  tm.oninput=()=>{est.total=tm.value===""?null:Number(tm.value);estCheck()};
  const tw=el("span","yen");tw.append(tm,el("small","","万円"));tl.append(tn,tw,el("span"));box.append(tl);
  estCheck();
}
function estCheck(){
  const sum=num(est.items.reduce((s,i)=>s+(i.man||0),0)),box=$("est-check");
  if(est.items.some(i=>i.man!=null&&i.man<0)||(est.total!=null&&!(est.total>0))){box.hidden=false;box.className="note-warn";box.textContent="金額は0以上（総額は0より大きい）数字で入れてください。";$("est-price").replaceChildren();return}
  const miss=est.items.some(i=>i.man==null);
  box.hidden=false;
  box.className=est.total==null?"note-warn":miss||Math.abs(sum-est.total)>0.05?"note-warn":"done";
  box.textContent=est.total==null?"総額を読み取れませんでした。見積書を見て、総額を入れてください。":miss?"金額を読み取れなかった項目があります。見積書を見て入れてください。":Math.abs(sum-est.total)>0.05?`内訳の合計（${sum}万円）と総額（${est.total}万円）が合いません。値引き、税、読み間違いがないか、見積書と見比べてください。`:"内訳の合計と総額が合っています。";
  priceCompare(est.total,$("est-price"),est.items.map(i=>i.name).filter(Boolean));
}
function working(id,steps){const box=$(id);let i=0;box.className="working";box.textContent=steps[0];const t=setInterval(()=>{i=Math.min(i+1,steps.length-1);box.textContent=steps[i]},2600);return()=>{clearInterval(t);box.className="fine"}}
const errorText=e=>e?.message||"うまくいきませんでした。もう一度お試しください。";
async function post(url,body){const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"作成できませんでした。もう一度試してください。");return data}
function toJpeg(file){return new Promise((ok,ng)=>{const url=URL.createObjectURL(file),img=new Image();img.onerror=()=>ng(new Error("この写真は読み込めません。JPEGかPNGで試してください。"));img.onload=()=>{const k=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);ok(c.toDataURL("image/jpeg",.85).split(",")[1])};img.src=url})}
async function runEstimate(blob){
  const btn=$("est-run");btn.disabled=true;const stop=working("est-status",["見積書を読み取っています…","項目と金額を整理しています…","クリニックに確認したいことをまとめています…"]);$("est-out").hidden=true;
  try{const r=await post("/api/estimate",{image:await toJpeg(blob),consent:true});stop();showEstimate(r)}
  catch(e){stop();$("est-status").textContent=errorText(e)}finally{btn.disabled=false}
}
$("est-run").onclick=()=>{
  if(!estFile){$("est-status").textContent="見積書の写真を選んでください。";return}
  if(!$("est-consent").checked){$("est-status").textContent="送信への同意にチェックを入れてください。";return}
  runEstimate(estFile);
};
$("est-sample").onclick=async()=>{
  if(!sel.before.length)setSel("before",["鼻フルコース"]);
  const label=$("estimate").parentElement;label.querySelector("img")?.remove();const img=new Image();img.alt="サンプルの見積書";img.src="sample-estimate.jpg";label.prepend(img);label.querySelector("span").hidden=true;
  runEstimate(await (await fetch("sample-estimate.jpg")).blob());
};
async function copyFrom(btnId,boxId,label){
  try{await navigator.clipboard.writeText($(boxId).value);$(btnId).textContent="コピーしました";setTimeout(()=>{$(btnId).textContent=label},2400)}
  catch{$(boxId).select();$(btnId).textContent="コピーしたい文章を選択しました。端末の「コピー」を使ってください。"}
}
$("est-copy").onclick=()=>copyFrom("est-copy","est-questions","質問をコピー");
// 見積もりを何院分でも保存して並べる（この端末の中だけ。見積書の画像は保存しない）。
// アプリは良し悪しや順位を判定しない。見積書に「書かれているか」の違いと、確かめる質問だけを出す。
const CATS=[["麻酔",["麻酔"]],["薬",["薬","処方","内服","抗生"]],["検査",["検査","採血"]],["診察・カウンセリング",["診察","カウンセリング","初診"]],["術後の通院・抜糸",["抜糸","検診","通院","術後","アフター"]],["保証・修正",["保証","修正"]],["材料（軟骨など）",["軟骨","プロテーゼ","材料","ヒアルロン"]]];
let ests=store.get("estimates",[]).filter(e=>e&&typeof e.total==="number");
const estLabel=(e)=>e.clinic||`クリニック${"ABCDEF"[ests.indexOf(e)]||ests.indexOf(e)+1}`;
// 見積もりごとに対象の施術を持つ。料金の画面で今選んでいる施術では判定しない
function rangeOf(procs){const p=(procs||[]).filter(n=>primary(n));if(!p.length||p.some(n=>!tierable(n)))return null;
  return p.length>1?[num(p.reduce((s,n)=>s+primary(n).lo,0)),num(p.reduce((s,n)=>s+primary(n).hi,0))]:[primary(p[0]).lo,primary(p[0]).hi]}
const procsOfEst=e=>e.procs||(e.items.length?procsIn(e.items.map(i=>i.name).join(" ")).map(i=>i.name):[]);
function curRange(){const p=priced();return p.length?(p.length>1?sumRange():[primary(p[0]).lo,primary(p[0]).hi]):null}
function posLabel(total,[lo,hi]){const t=tierOf(total,lo,hi);return t<0?"料金の目安より下":t>2?"料金の目安より上":`料金の目安の${TIER[t]}`}
function saveEst(clinic,items,total,statusId,clear){
  const say=t=>{$(statusId).textContent=t};
  if(total==null||!(total>0))return say("総額を入れてから保存してください。");
  if(ests.length>=6)return say("保存できる見積もりは6件までです。いらないものを削除してから保存してください。");
  const its=items.filter(i=>(i.name||"").trim()||i.man!=null).map(i=>({name:(i.name||"").trim().slice(0,60),man:i.man}));
  const found=its.length?[...new Set(procsIn(its.map(i=>i.name).join(" ")).map(i=>i.name))]:[];
  // 項目名から施術が分かればそれを、分からなければ保存した時に選んでいた施術を対象にする
  const procs=found.length?found:[...sel.before];
  ests.push({id:Date.now(),date:today,clinic:clinic.trim().slice(0,40),items:its,total:num(total),procs,procsFrom:found.length?"items":"selected"});
  store.set("estimates",ests);clear();renderCmpEst();
  say(`保存しました（${ests.length}件目）。下の「保存した見積もり」で並べて比べられます。`);
}
$("est-save").onclick=()=>saveEst($("est-clinic").value,est.items,est.total,"est-save-status",()=>{$("est-clinic").value=""});
$("total-save").onclick=()=>saveEst($("total-clinic").value,[],Number($("total").value)||null,"total-save-status",()=>{$("total-clinic").value=""});
function renderCmpEst(){
  const box=$("cmp-est");box.hidden=!ests.length;if(!ests.length)return;
  $("cmp-est-title").textContent=`保存した見積もり（${ests.length}件）`;
  const list=$("cmp-est-list");list.replaceChildren();
  for(const e of ests){
    const row=el("div","est-row"),head=el("div","est-row-head");
    head.append(el("b","",estLabel(e)),el("span","est-total",`${e.total}万円`));
    const meta=[`${md(e.date)}に保存`,e.items.length?`項目${e.items.length}件`:"総額のみ"],ps=procsOfEst(e),pr=rangeOf(ps);
    meta.push(ps.length?`対象：${ps.join("・")}`:"対象の施術：未設定");
    meta.push(pr?posLabel(e.total,pr):ps.length?"料金の目安とは比べられません（価格帯のない施術を含むため）":"料金の目安とは比べていません");
    const del=el("button","text-btn small-del","削除");del.type="button";del.setAttribute("aria-label",`${estLabel(e)}の見積もりを削除`);
    del.onclick=()=>{if(!confirm(`${estLabel(e)}の見積もりを削除します。`))return;ests=ests.filter(x=>x.id!==e.id);store.set("estimates",ests);renderCmpEst()};
    const foot=el("div","est-row-foot");foot.append(el("span","fine",meta.join(" ・ ")),del);row.append(head,foot);list.append(row);
  }
  list.append(el("p","fine","料金の目安との位置は、見積もりごとの「対象」の施術で計算しています。対象は見積書の項目名から探し、見つからないときは保存したときに「料金」で選んでいた施術です。"));
  const grid=$("cmp-est-grid"),withItems=ests.filter(e=>e.items.length);grid.replaceChildren();grid.hidden=withItems.length<2;
  if(withItems.length<2){if(ests.length>=2)list.append(el("p","fine","項目まで読み取った見積もりが2件以上あると、書かれている項目の違いも並べて表示します。"));return}
  grid.append(el("h3","","見積書に書かれている項目の違い"),el("p","fine","項目名に含まれる言葉で分けています。「記載なし」は見積書に書かれていないという意味で、含まれていないとは限りません。"));
  const wrap=el("div","cmp-table-wrap"),t=el("table","cmp-table"),hr=el("tr");hr.append(el("th","","項目"));for(const e of withItems)hr.append(el("th","",estLabel(e)));t.append(hr);
  const asks=[];
  for(const [cat,kw] of CATS){
    const has=withItems.map(e=>e.items.some(it=>kw.some(k=>it.name.includes(k))));
    if(!has.some(Boolean))continue;
    const tr=el("tr");tr.append(el("th","",cat));has.forEach(h=>tr.append(el("td",h?"yes":"no",h?"記載あり":"記載なし")));t.append(tr);
    withItems.forEach((e,j)=>{if(!has[j])asks.push(`${estLabel(e)}：見積書に「${cat}」の記載がありません。総額に含まれていますか。`)});
  }
  wrap.append(t);grid.append(wrap);
  if(asks.length){
    const f=el("div","field"),lb=el("label","","クリニックへの質問"),ta=el("textarea"),cb=el("button","secondary","質問をコピー");
    ta.id="cmp-asks";lb.htmlFor="cmp-asks";ta.rows=Math.min(8,asks.length+1);ta.value=asks.map((q,i)=>`${i+1}. ${q}`).join("\n");
    cb.type="button";cb.id="cmp-asks-copy";cb.onclick=()=>copyFrom("cmp-asks-copy","cmp-asks","質問をコピー");f.append(lb,ta,cb);grid.append(f);
  }
}
$("prep").onclick=async()=>{
  const goal=$("goal").value.trim();if(!goal){$("prep-status").textContent="変えたいことを入力してください。";return}
  const btn=$("prep");btn.disabled=true;$("prep-status").textContent="作成しています。";$("prep-out").hidden=true;
  try{
    const r=await post("/api/prep",{procedure:sel.before.join("、")||"未定",goal,said:"",pressure:checked("pressure").map(i=>PRESSURE[i]),facts:groupsOf(sel.before).filter(g=>g.guide).slice(0,5).map(g=>("指針の記載："+g.guide).slice(0,200))});
    $("questions").replaceChildren(...r.questions.map(q=>el("li","",q)));
    $("options").replaceChildren(...r.options.map(o=>{const li=el("li");li.append(el("b","",o.option),el("span","",o.note));return li}));
    $("prep-out").hidden=false;$("prep-status").textContent="";
  }catch(e){$("prep-status").textContent=errorText(e)}finally{btn.disabled=false}
};

// 3 経過：施術日がない・未来の日付のときは「一般的な経過」とし、個人の時期の言葉を使わない
$("surgery").max=today;$("prev-date").max=today;
$("surgery").value=store.get("surgery","");$("prev-date").value=daysAgo(1);
const isFuture=()=>Boolean($("surgery").value)&&diff($("surgery").value,today)<0;
const dayNow=()=>!$("surgery").value||isFuture()?null:diff($("surgery").value,today);
const rangeLabel=(from,to)=>to>=9999?`${from}日〜`:from===0?`〜${to}日`:`${from}〜${to}日`;
function flowRows(g){let from=0;return g.flow.map(([to,t])=>{const r=[rangeLabel(from===0?0:from+1,to),t,from,to];from=to;return r})}
function stageCards(g,d){
  const box=el("div","stages");if(!g.flow.length)return box;
  const rows=flowRows(g);
  if(d===null){for(const [lab,t] of rows){const c=el("div","stage");c.append(el("b","",lab),el("span","",t.split("。")[0]+"。"));box.append(c)}return box}
  let i=rows.findIndex(r=>d<=r[3]);
  if(i<0){const c=el("div","stage on");c.append(el("b","","今"),el("span","","この時期の目安は、確認した出典にありません。"));box.append(c);return box}
  rows.slice(i,i+3).forEach(([lab,t],n)=>{const c=el("div","stage"+(n===0?" on":""));c.append(el("b","",n===0?"今":lab),el("span","",t.split("。")[0]+"。"));box.append(c)});
  return box;
}
const dayAngle=(d)=>-130+Math.log1p(Math.min(d,365))/Math.log1p(365)*260;
function drawDial(d){
  const c=150,pt=(deg,r)=>{const a=(deg-90)*Math.PI/180;return[c+r*Math.cos(a),c+r*Math.sin(a)]},arc=(from,to,r)=>{const [x1,y1]=pt(from,r),[x2,y2]=pt(to,r);return`M${x1} ${y1}A${r} ${r} 0 ${to-from>180?1:0} 1 ${x2} ${y2}`};
  let t="";for(let i=0;i<=78;i++){const deg=-130+i/78*260,[x1,y1]=pt(deg,i%13?126:121),[x2,y2]=pt(deg,131);t+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tk${i%13?"":" maj"}"/>`}
  const marks=[[0,"当日"],[7,"1週"],[30,"1か月"],[90,"3か月"],[365,"1年"]].map(([v,l])=>{const [x,y]=pt(dayAngle(v),108);return`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${l}</text>`}).join("");
  const ang=dayAngle(d),[nx,ny]=pt(ang,131),[sx,sy]=pt(ang,92);
  $("dial").innerHTML=`<svg viewBox="0 0 300 250">${t}${d>0?`<path d="${arc(-130,ang,139)}" fill="none" stroke="#526AE8" stroke-width="2.5" stroke-linecap="round"/>`:""}${marks}<line x1="${sx}" y1="${sy}" x2="${nx}" y2="${ny}" stroke="#3F55CF" stroke-width="2" stroke-linecap="round"/><circle cx="${nx}" cy="${ny}" r="3.6" fill="#FFFFFF" stroke="#3F55CF" stroke-width="1.5"/></svg>`;
}
const modelIndex=(d)=>{let k=0;if(d!==null)MODEL.forEach(([,,v],i)=>{if(d>=v)k=i});return k};
function modelViewer(){
  const box=el("details","model");box.append(el("summary","","AIで作成した写真で、変化の流れを見る"));
  const fig=el("figure"),img=el("img");img.alt="AIで作成した架空の人物による、鼻の手術後の変化の見本";img.loading="lazy";
  const cap=el("figcaption");fig.append(img,cap);
  const seg=el("div","seg seg7");
  const show=(k)=>{const [f,l]=MODEL[k];img.src=`model/${f}-front.jpg`;cap.textContent=`${l}（AIで作成した架空の人物の写真です。実際の患者の写真ではなく、回復の標準や目標を示すものでもありません）`;[...seg.children].forEach((b,i)=>b.setAttribute("aria-pressed",String(i===k)))};
  MODEL.forEach(([,l],k)=>{const b=el("button","",l);b.type="button";b.onclick=()=>show(k);seg.append(b)});
  box.append(seg,fig,el("p","fine","変化の流れを思い浮かべるための見本です。あなたの回復の基準ではありません。"));
  box.addEventListener("toggle",()=>{if(box.open&&!img.getAttribute("src"))show(modelIndex(dayNow()))});
  return box;
}
function drawCurve(day){
  const L=36,R=464,T=14,B=120,lx=v=>L+(Math.log(v)-Math.log(3))/(Math.log(365)-Math.log(3))*(R-L),y=v=>B-v/100*(B-T);
  const line=BANDS.std.map((v,i)=>`${lx(BANDS.days[i])},${y(v)}`).join(" ");
  const measured=[[30,33.3],[180,5],[365,2.5]].map(([d,v])=>`<circle cx="${lx(d)}" cy="${y(v)}" r="5" class="pt-m"/>`).join("");
  const labels=[[3,"3日"],[14,"2週"],[30,"1か月"],[90,"3か月"],[365,"1年"]].map(([d,t])=>`<text x="${lx(d)}" y="136" text-anchor="middle">${t}</text>`).join("");
  const mx=day===null?0:lx(Math.max(3,Math.min(365,day)));
  const m=day===null?"":`<line x1="${mx}" x2="${mx}" y1="${T}" y2="${B}" stroke="#3F55CF" stroke-width="2"/><text x="${Math.min(mx+4,430)}" y="${T+8}" class="today">今日</text>`;
  $("curve").innerHTML=`<svg viewBox="0 0 490 142" role="img" aria-label="鼻の腫れが引いていく一般的な流れ。研究で測った値は1か月で約3分の1、6か月で5%、1年で2.5%が残る。${day===null?"":"縦線は施術からの日数。"}"><polyline points="${line}" fill="none" stroke="#A69AE8" stroke-width="2" stroke-dasharray="5 4"/>${measured}<text x="0" y="${y(100)+4}">100%</text><text x="8" y="${y(0)+2}">0%</text>${labels}${m}</svg>`;
}
// 予定と目安：施術日・クリニックの予定・変化の目安を、日付つきの1本の流れに並べる
const WD="日月火水木金土";
const addDays=(iso,n)=>toISO(new Date(new Date(iso+"T00:00:00").getTime()+n*864e5));
const dl=iso=>{const t=new Date(iso+"T00:00:00");return`${t.getMonth()+1}/${t.getDate()}`};
const wd=iso=>WD[new Date(iso+"T00:00:00").getDay()];
let appts=store.get("appts",[]).filter(a=>a&&a.date&&a.title);
function timeline(d){
  const s=$("surgery").value&&!isFuture()?$("surgery").value:null,items=[];
  if(s)items.push({date:s,kind:"op",title:"施術日"});
  for(const a of appts)items.push({date:a.date,kind:"appt",title:a.title,time:a.time,id:a.id});
  const gs=afterGroups().filter(g=>g.flow.length);
  for(const g of gs)for(const [lab,t,from,to] of flowRows(g)){
    const st=from===0?0:from+1;
    if(s&&to<9999&&addDays(s,to)<today&&d!==null&&to<d)continue; // 過ぎた時期は省く
    items.push({kind:"stage",date:s?addDays(s,st):null,end:s&&to<9999?addDays(s,to):null,lab,title:t.split("。")[0],group:gs.length>1?g.label:"",st,to});
  }
  items.sort((a,b)=>a.date&&b.date?(a.date<b.date?-1:a.date>b.date?1:(a.kind==="stage")-(b.kind==="stage")):(a.st??-1)-(b.st??-1));
  return{items,s};
}
function renderTimeline(d){
  const {items,s}=timeline(d),box=$("timeline");box.replaceChildren();let todayDone=!s;
  const mark=()=>{const li=el("li","tl-today");li.append(el("span","tl-d",`${dl(today)}`),el("span","tl-b","今日"));box.append(li);todayDone=true};
  for(const it of items){
    if(!todayDone&&it.date>today)mark();
    const li=el("li","tl-"+it.kind+(it.date&&it.date<today&&it.kind!=="stage"?" past":"")),dd=el("span","tl-d");
    if(it.date){dd.append(el("b","",dl(it.date)),el("small","",wd(it.date)))}else dd.append(el("b","",it.lab));
    const body=el("span","tl-b");
    if(it.kind==="stage"){body.append(el("em","","目安"+(it.end?`〜${dl(it.end)}`:"")),document.createTextNode((it.group?it.group+"："+"":"")+it.title))}
    else{body.append(el("strong","",it.title+(it.time?` ${it.time}`:"")));if(it.kind==="appt"){const x=el("button","tl-del","×");x.type="button";x.setAttribute("aria-label",`${it.title}（${dl(it.date)}）の予定を消す`);x.onclick=()=>{appts=appts.filter(a=>a.id!==it.id);store.set("appts",appts);refresh()};body.append(x)}}
    li.append(dd,body);box.append(li);
  }
  if(!todayDone)mark();
  if(!s)box.append(el("li","tl-note","施術日を入れると、目安が日付で出ます。"));
}
$("appt-kind").onchange=()=>{$("appt-title-wrap").hidden=$("appt-kind").value!==""};
$("appt-add").onclick=()=>{
  const title=($("appt-kind").value||$("appt-title").value).trim(),date=$("appt-date").value;
  if(!title||!date){$("appt-status").textContent="予定の名前と日付を入れてください。";return}
  appts.push({id:Date.now(),title:title.slice(0,30),date,time:$("appt-time").value||""});appts.sort((a,b)=>a.date<b.date?-1:1);store.set("appts",appts.slice(-20));
  $("appt-status").textContent=`${dl(date)}の「${title}」を足しました。`;$("appt-date").value="";$("appt-time").value="";refresh();
};
// スマホのカレンダーに入れるファイル（.ics）を、この端末の中で作る。送信はしない。
const icsEsc=t=>String(t).replace(/[\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
const ymd=iso=>iso.replaceAll("-","");
$("ics").onclick=()=>{
  const s=$("surgery").value&&!isFuture()?$("surgery").value:null,stamp=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z",ev=[];
  const add=(uid,start,end,title,desc,alarm)=>ev.push(["BEGIN:VEVENT",`UID:${uid}@pare`,`DTSTAMP:${stamp}`,...start,...end,`SUMMARY:${icsEsc(title)}`,`DESCRIPTION:${icsEsc(desc)}`,...(alarm?["BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${icsEsc(title)}`,"TRIGGER:PT0M","END:VALARM"]:[]),"END:VEVENT"].join("\r\n"));
  for(const a of appts){
    if(a.time){const t=a.time.replace(":","")+"00";add("appt-"+a.id,[`DTSTART:${ymd(a.date)}T${t}`],[`DURATION:PT1H`],a.title,"Pareで登録した予定です。",true)}
    else add("appt-"+a.id,[`DTSTART;VALUE=DATE:${ymd(a.date)}`],[`DTEND;VALUE=DATE:${ymd(addDays(a.date,1))}`],a.title,"Pareで登録した予定です。",false);
  }
  if($("ics-daily").checked&&s){
    const left=14-Math.max(0,diff(s,today));
    if(left>0)ev.push(["BEGIN:VEVENT",`UID:daily-${ymd(s)}@pare`,`DTSTAMP:${stamp}`,`DTSTART:${ymd(today)}T210000`,"DURATION:PT10M",`RRULE:FREQ=DAILY;COUNT=${left}`,"SUMMARY:今日の変化を記録する",`DESCRIPTION:${icsEsc("Pareを開いて、痛み・腫れ・内出血と写真を残しましょう。気になる症状があるときは、記録を待たずにクリニックへ連絡してください。")}`,"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:今日の変化を記録する","TRIGGER:PT0M","END:VALARM","END:VEVENT"].join("\r\n"));
  }
  if($("ics-stage").checked&&s)for(const it of timeline(dayNow()).items.filter(i=>i.kind==="stage"&&i.date&&i.end&&i.end>=today))
    add(`stage-${ymd(it.date)}-${it.st}`,[`DTSTART;VALUE=DATE:${ymd(it.date)}`],[`DTEND;VALUE=DATE:${ymd(addDays(it.end,1))}`],"目安："+(it.group?it.group+" ":"")+it.title,"一般的な目安です。あなたの状態を示すものではありません。担当の医師の説明を優先してください。",false);
  if(!ev.length){$("ics-status").textContent=s?"入れる予定がありません。クリニックの予定を足すか、毎晩の記録にチェックを入れてください。":"施術日を入れるか、クリニックの予定を足してください。";return}
  const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Pare//JA","CALSCALE:GREGORIAN","METHOD:PUBLISH",...ev,"END:VCALENDAR"].join("\r\n");
  const a=el("a");a.href=URL.createObjectURL(new Blob([body],{type:"text/calendar;charset=utf-8"}));a.download="pare.ics";document.body.append(a);a.click();a.remove();
  $("ics-status").textContent=`予定${ev.length}件のファイルを作りました。開くと、スマホのカレンダーに追加できます。`;
};
function renderGuide(d){
  const box=$("guide");box.replaceChildren();$("guide-box").hidden=!sel.after.length;
  $("guide-title").textContent="これからの予定と目安";
  renderTimeline(d);
  for(const g of afterGroups()){
    const c=el("div","guide-item");c.append(el("h3","",g.label));
    if(g.flow.length){const ul=el("ul","dots");for(const [lab,t] of flowRows(g))ul.append(el("li","",lab+"："+t));c.append(ul)}
    else c.append(el("p","","時期の目安は、確認した出典にありません。"));
    if(g===GROUPS.nose){
      const det=el("details","dist"),cv=el("div");cv.id="curve";
      det.append(el("summary","","腫れが引いていく流れを見る"),el("p","fine","縦は、手術直後を100%としたときに残っている腫れの割合です。●は研究で測った値（Pavri 2016：鼻の手術を受けた40人の3D計測。1か月・6か月・1年）。点線は、大学病院の説明をもとに点の間を補った線で、測った値ではありません。人による違いの幅は、裏付けとなるデータがないため示していません。"),cv);
      c.append(det,modelViewer());
    }
    c.append(srcLine(g));box.append(c);
  }
  if($("curve"))drawCurve(d);
}

// 記録
const realRows=()=>store.get("records",[]).filter(r=>typeof r==="object"&&r);
const lastRec=()=>realRows().filter(r=>r.date!==today).at(-1)||null;
function upsertRecord(){const recs=realRows().filter(r=>r.date!==today),note=$("note").value.trim().slice(0,200);recs.push({date:today,day:dayNow(),...levels,...(note?{note}:{})});recs.sort((a,b)=>a.date<b.date?-1:1);store.set("records",recs.slice(-60));return recs.length}
function meter(v){const s=el("span","m");if(v==null){s.textContent="−";return s}s.append(el("b","",String(v)));const bar=el("i");bar.style.setProperty("--v",v);s.append(bar);return s}
function recRows(rows,title){
  const box=$("records");box.replaceChildren();
  if(title)box.append(el("h3","",title));
  if(!rows.length){box.append(el("p","fine","まだ記録がありません。今日の症状から記録できます。"));return}
  const tb=el("div","rec"),hd=el("div","rec-row rec-head");hd.append(el("span","","日付"),...LEVELS.map(([,l])=>el("span","",l)));tb.append(hd);
  for(const r of [...rows].reverse()){const row=el("div","rec-row"),d=el("span","rec-d");d.append(el("b","",r.date?md(r.date):"−"),el("small","",r.day==null?"":r.day===0?"当日":`${r.day}日目`));row.append(d,...LEVELS.map(([k])=>meter(r[k])));tb.append(row);if(r.note)tb.append(el("p","rec-note","メモ："+r.note))}
  box.append(tb);
}
let showingSample=false;
function renderRecDiff(){
  const rows=realRows(),box=$("rec-diff");
  if(showingSample||rows.length<2){box.hidden=true;return}
  const [a,b]=rows.slice(-2),parts=LEVELS.filter(([k])=>a[k]!=null||b[k]!=null).map(([k,l])=>`${l} ${a[k]??"−"}→${b[k]??"−"}`);
  box.hidden=!parts.length;box.textContent=`前回（${md(a.date)}）と今回（${md(b.date)}）：${parts.join("、")}`;
}
function renderWeek(){
  const dates=new Set(realRows().map(r=>r.date)),box=$("week-dots");box.replaceChildren();let n=0;
  for(let k=6;k>=0;k--){const iso=daysAgo(k),w="日月火水木金土"[new Date(iso+"T00:00:00").getDay()],i=el("i","",w);if(dates.has(iso)){i.className="on";n++}if(k===0)i.classList.add("now");box.append(i)}
  $("week-count").textContent=n?`7日のうち${n}日、記録できました`:"まだ今週の記録はありません";
}
$("sample-rec").onclick=()=>{showingSample=!showingSample;$("sample-rec").textContent=showingSample?"自分の記録に戻る":"7日分のサンプル記録を見る";if(showingSample)recRows(SAMPLE.map(([day,pain,swell,bruise])=>({day,pain,swell,bruise})),"サンプル記録（架空）");else recRows(realRows());renderRecDiff()};
$("clear-rec").onclick=()=>{if(!confirm("この端末の記録と写真をすべて削除します。元に戻せません。"))return;store.del("records");idb.clear().then(()=>loadPhotos(false));showingSample=false;$("sample-rec").textContent="7日分のサンプル記録を見る";refresh()};

// 今日の感じ：前回の値を横に見せる。自動では選ばない。
const levels={};
function renderLevels(){
  const box=$("levels"),prev=lastRec();box.replaceChildren();
  box.append(el("p","q","今日の症状（0：なし〜5：強い）"));
  for(const [k,label] of LEVELS){
    const f=el("fieldset","level"),lg=el("legend");lg.append(el("span","",label));
    const pv=prev&&prev[k]!=null?prev[k]:null;if(pv!=null)lg.append(el("span","prev",`前回 ${pv}（${md(prev.date)}）`));f.append(lg);
    const row=el("div","level-row");
    for(let v=0;v<=5;v++){const b=el("button","",v===0?"なし":String(v));b.type="button";b.setAttribute("aria-pressed",String(levels[k]===v));b.setAttribute("aria-label",`${label} ${v}${pv===v?"（前回の値）":""}`);if(pv===v)b.classList.add("was");
      b.onclick=()=>{if(levels[k]===v)delete levels[k];else levels[k]=v;[...row.children].forEach((c,i)=>c.setAttribute("aria-pressed",String(levels[k]===i)));saveLabel()};row.append(b)}
    f.append(row);box.append(f);
  }
}

const saveLabel=()=>{$("save-rec").textContent="保存して相談メモを作る"};
// 受診を急ぐサイン：毎回、未回答から。答えるまで記録もメモも作らない。
let safety=null;
function updateSafety(){
  for(const b of $("safety-seg").children)b.setAttribute("aria-pressed",String(b.dataset.v===safety));
  $("flags").hidden=safety!=="some";$("flag-list").hidden=safety==="some";
  const f=checked("flag"),box=$("urgent");box.hidden=safety!=="some";
  const inject=afterGroups().some(g=>g===GROUPS.hyal||g===GROUPS.fat||g===GROUPS.inject);
  box.textContent=f.some(i=>FLAGS[i][1])||(inject&&f.includes(7))?"今すぐ119番に連絡してください。":"記録やメモを待たず、今すぐクリニックへ電話してください。時間外なら緊急連絡先へ。つながらないときは、救急安心センター #7119（地域による）へ。";
}
for(const b of $("safety-seg").children)b.onclick=()=>{safety=b.dataset.v;if(safety==="none")for(const i of document.querySelectorAll("input[name=flag]"))i.checked=false;updateSafety()};
$("flags").onchange=updateSafety;

// 写真：前回の自分か、AI生成の見本と、この端末の中だけで見比べる。自分の写真は端末の中（IndexedDB）に日付ごとに残す。
const idb=(()=>{let p=null;const open=()=>p??=new Promise((ok,ng)=>{try{const r=indexedDB.open("dc-photos",1);r.onupgradeneeded=()=>r.result.createObjectStore("photos",{keyPath:"date"});r.onsuccess=()=>ok(r.result);r.onerror=()=>ng(r.error)}catch(e){ng(e)}});
  const run=async(mode,fn)=>{const db=await open();return new Promise((ok,ng)=>{const t=db.transaction("photos",mode),req=fn(t.objectStore("photos"));t.oncomplete=()=>ok(req?.result);t.onerror=()=>ng(t.error)})};
  return{put:r=>run("readwrite",s=>s.put(r)).catch(()=>null),all:()=>run("readonly",s=>s.getAll()).catch(()=>[]),clear:()=>run("readwrite",s=>s.clear()).catch(()=>null)}})();
const photos={};let cmpTarget="prev",modelView="front",modelStage=null;
const modelSrc=(k,v)=>`model/${MODEL[k][0]}-${v}.jpg`;
function setPhoto(id,blob,src){
  const label=$(id).parentElement;label.querySelector("img")?.remove();
  photos[id]=blob||null;label.querySelector("span").hidden=!!blob;
  if(blob){const img=new Image();img.alt="";img.src=src||URL.createObjectURL(blob);label.prepend(img)}
  updateCmp();
}
for(const id of["yesterday","today"])$(id).onchange=e=>{photos.sample=false;if(id==="yesterday")$("prev-info").hidden=true;setPhoto(id,e.target.files[0])};
$("photo-sample").onclick=async()=>{
  const [a,b]=await Promise.all([modelSrc(1,"front"),modelSrc(2,"front")].map(async u=>(await fetch(u)).blob()));
  photos.sample=true;setTarget("prev");setPhoto("yesterday",a,modelSrc(1,"front"));setPhoto("today",b,modelSrc(2,"front"));$("prev-date").value=daysAgo(4);
  $("prev-info").hidden=true;
  // 見本写真は術後3日目と7日目。施術日がずれていると相談文の日数が合わないので知らせる
  const d=dayNow();if(d!==7){const p=$("prev-info");p.hidden=false;p.replaceChildren(el("span","","見本は、術後3日目と7日目の架空の写真です。"+(d==null?"":`いまの施術日だと${d}日目になり、相談文の日数と合いません。`)));
    const b=el("button","text-btn","施術日を7日前にする");b.type="button";b.onclick=()=>{$("surgery").value=daysAgo(7);$("surgery").dispatchEvent(new Event("change"));p.hidden=true};p.append(b)}
};
function setTarget(t){cmpTarget=t;for(const c of $("cmp-target").children)c.setAttribute("aria-pressed",String(c.dataset.t===t));$("prev-wrap").hidden=t!=="prev";$("model-opts").hidden=t!=="model";$("prev-info").classList.toggle("off",t==="model");updateCmp()}
for(const b of $("cmp-target").children)b.onclick=()=>setTarget(b.dataset.t);
$("model-stage").replaceChildren(...MODEL.map(([,l],k)=>{const o=el("option","",l);o.value=k;return o}));
$("model-stage").onchange=()=>{modelStage=Number($("model-stage").value);updateCmp()};
for(const b of $("model-view").children)b.onclick=()=>{modelView=b.dataset.v;for(const c of $("model-view").children)c.setAttribute("aria-pressed",String(c===b));updateCmp()};
function updateCmp(){
  const a=$("cmp-a"),b=$("cmp-b"),k=modelStage??modelIndex(dayNow());$("model-stage").value=k;
  const ready=photos.today&&(cmpTarget==="model"||photos.yesterday);$("cmp").hidden=!ready;if(!ready)return;
  if(b.dataset.u)URL.revokeObjectURL(b.dataset.u);b.dataset.u=URL.createObjectURL(photos.today);
  b.onload=()=>{$("cmp-stage").style.aspectRatio=`${b.naturalWidth}/${b.naturalHeight}`};b.src=b.dataset.u;
  if(cmpTarget==="model"){const l=MODEL[k][1];a.src=modelSrc(k,modelView);$("tag-a").textContent=`AI見本 ${l}`;$("cmp-note").textContent=`AIで作成した架空の人物の写真です（鼻の手術、${l}、${modelView==="front"?"正面":"横顔"}）。実際の患者の写真ではなく、回復の標準や目標を示すものでもありません。違いの判断は、あなたと医師が行います。`}
  else{if(a.dataset.u)URL.revokeObjectURL(a.dataset.u);a.dataset.u=URL.createObjectURL(photos.yesterday);a.src=a.dataset.u;$("tag-a").textContent=photos.sample?"前回":`前回 ${md($("prev-date").value)}`;$("cmp-note").textContent=photos.sample?"AIで作成した架空の人物の写真（3日後と1週間後）で試しています。実際の患者の写真ではなく、回復の標準や目標を示すものでもありません。":"変化の判断は、あなたと医師が行います。"}
}
let cmpMode="slide";
function setCmp(){const v=$("cmp-range").value,st=$("cmp-stage");st.classList.toggle("blend",cmpMode==="blend");if(cmpMode==="blend")st.style.setProperty("--o",v);else st.style.setProperty("--p",v+"%")}
$("cmp-range").oninput=setCmp;
for(const b of $("cmp-seg").children)b.onclick=()=>{cmpMode=b.dataset.m;for(const c of $("cmp-seg").children)c.setAttribute("aria-pressed",String(c===b));setCmp()};
const pairReady=()=>cmpTarget==="prev"&&photos.yesterday&&photos.today;
// 保存した経過写真：前回の写真を自動で入れ、並びを出す
let savedPhotos=[];
async function loadPhotos(first){
  savedPhotos=(await idb.all()).sort((x,y)=>x.date<y.date?-1:1);
  const box=$("photo-timeline");box.replaceChildren();$("tl-box").hidden=!savedPhotos.length;
  for(const r of [...savedPhotos].reverse()){
    const b=el("button","tl-item");b.type="button";const img=new Image();img.alt=`${md(r.date)}の写真`;img.src=URL.createObjectURL(r.blob);
    b.append(img,el("span","",md(r.date)+(r.day!=null?` ・ ${r.day?r.day+"日目":"当日"}`:"")));
    b.onclick=()=>{if(r.date===today)return;usePrev(r);setTarget("prev");$("photo-box").scrollIntoView({behavior:"smooth",block:"start"})};box.append(b);
  }
  if(first){
    const prev=savedPhotos.filter(r=>r.date<today).at(-1),own=savedPhotos.find(r=>r.date===today);
    if(prev)usePrev(prev);
    if(own&&!photos.today){photos.sample=false;setPhoto("today",own.blob)}
  }
}
function usePrev(r){photos.sample=false;$("prev-date").value=r.date;setPhoto("yesterday",r.blob);$("prev-info").hidden=false;$("prev-info").textContent=`前回の写真に、${md(r.date)}${r.day!=null?`（${r.day?r.day+"日目":"当日"}）`:""}に残した写真を入れました。`}
$("clinic").value=store.get("clinic","");$("clinic").onchange=()=>store.set("clinic",$("clinic").value.trim());

// 記録して短いメモを作る（送信しない）
function checkToday(statusId){
  const say=t=>{$(statusId).textContent=t;return false};
  if(!sel.after.length){const f=$("setup-form");if(f)f.scrollIntoView({behavior:"smooth",block:"start"});return say("受けた施術がまだ選ばれていません。画面上の「受けた施術」で選んでください。")}
  if(dayNow()===null)return say(isFuture()?"施術日が未来の日付です。受けた日を入れてください。":"施術日を入れてください。");
  if(!safety)return say("はじめに「受診を急ぐサインはありますか」に答えてください。");
  if(!Object.keys(levels).length&&!$("note").value.trim())return say("今日の症状を選ぶか、気になっていることを書いてください。");
  return true;
}
function memoText(){
  const d=dayNow(),lv=LEVELS.filter(([k])=>levels[k]!=null).map(([k,l])=>`${l} ${levels[k]===0?"なし":levels[k]+"/5"}`).join("　"),fl=checked("flag").map(i=>FLAGS[i][0]),note=$("note").value.trim();
  const clinic=$("clinic").value.trim(),obs=$("obs").value.trim();
  const L=clinic?[`${clinic} ご担当者様`,""]:[];L.push(`【${sel.after.join("・")}／術後${d?d+"日目":"当日"}】`);
  if(lv)L.push("・今日の症状："+lv);
  L.push(safety==="none"?"・受診を急ぐサイン：一覧の項目には当てはまらない（本人の確認）":fl.length?"・気になる症状："+fl.join("、"):"・受診を急ぐサイン：あるかもしれない（本人が判断できない）");
  if(note)L.push("・気になっていること："+note);
  if(obs&&!$("cmp").hidden)L.push("・写真を見て気づいたこと："+obs);
  if(pairReady()&&!photos.sample)L.push(`・写真：${md($("prev-date").value)}と${md(today)}の2枚を添付します`);
  L.push(safety==="some"?"至急、ご指示をお願いします。":"このまま様子を見てよいか、ご確認をお願いします。");
  return L.join("\n");
}
$("save-rec").onclick=()=>{
  if(!checkToday("save-status"))return;$("save-status").textContent="";
  const hasLv=true,n=upsertRecord();
  if(photos.today&&!photos.sample)idb.put({date:today,day:dayNow(),blob:photos.today}).then(r=>{if(r==null){$("saved").textContent=$("saved").textContent.replace("。写真もこの端末に保存しました","");$("photo-fail").hidden=false}else{$("photo-fail").hidden=true;loadPhotos(false)}});
  $("memo").value=memoText();$("long-out").hidden=true;$("long-empty").hidden=false;
  $("saved").textContent=hasLv?`今日の記録を保存しました（${n}回目）${photos.today&&!photos.sample?"。写真もこの端末に保存しました":""}。相談メモを作りました`:"相談メモを作りました（症状を選んでいないため、記録には保存していません）";
  $("report-meta").textContent=`${sel.after.join("、")} ・ 施術後${dayNow()}日目 ・ ${md(today)}`;
  $("report").hidden=false;refresh();$("report").scrollIntoView({behavior:"smooth",block:"start"});
};
$("copy-memo").onclick=()=>copyFrom("copy-memo","memo","相談メモをコピー");
$("copy-long").onclick=()=>copyFrom("copy-long","message","相談文をコピー");
const TREND={reduced:"軽減",same:"変化なし",increased:"増加",unclear:"不明"};
$("compare").onclick=async()=>{
  if(!checkToday("compare-status"))return;
  if(!$("consent").checked){$("compare-status").textContent="送信への同意にチェックを入れてください。";return}
  const btn=$("compare");btn.disabled=true;const stop=working("compare-status",["入力を確認しています…","相談文を作っています…","文章を整えています…"]);
  try{
    const pair=pairReady(),[yesterday,todayImg]=pair?await Promise.all([toJpeg(photos.yesterday),toJpeg(photos.today)]):[undefined,undefined];
    const r=await post("/api/analyze",{procedures:sel.after,postOpDay:Math.min(730,dayNow()),levels:Object.fromEntries(Object.entries(levels).filter(([,v])=>v>0)),intervalDays:pair?Math.max(1,diff($("prev-date").value||daysAgo(1),today)):undefined,note:[LEVELS.filter(([k])=>levels[k]===0).map(([,l])=>l+"：なし").join("、"),$("note").value.trim(),$("obs").value.trim()&&!$("cmp").hidden?"写真を見て気づいたこと："+$("obs").value.trim():""].filter(Boolean).join("\n").slice(0,300),redFlags:checked("flag").map(i=>FLAGS[i][0]),yesterday,today:todayImg,consent:true});
    const blocked=r.comparability==="not_comparable";
    $("limit").textContent=blocked?`この2枚は比較できませんでした。${r.comparabilityNote} 同じ部位を同じ角度で撮り直してください。`:(r.comparabilityNote||"");
    $("limit").hidden=!$("limit").textContent;$("diff").hidden=blocked;
    $("summary").textContent=r.summary||"";$("changes").hidden=!(r.changes||[]).length;
    $("changes").replaceChildren(...(r.changes||[]).map(c=>{const li=el("li");li.append(el("b","",c.area),el("span","",`${c.change}（${TREND[c.trend]||"不明"}）`));return li}));
    $("message").value=blocked?"":r.consultationMessage;$("message").closest(".field").hidden=blocked;$("copy-long").hidden=blocked;
    if(!blocked)upsertRecord();
    $("long-out").hidden=false;stop();$("compare-status").textContent="";refresh();
  }catch(e){stop();$("compare-status").textContent=errorText(e)}finally{btn.disabled=false}
};

// 全体の更新
let editingSetup=null;
function refresh(){
  const d=dayNow(),has=sel.after.length>0&&d!==null;
  renderChips();renderPrice();renderKnow();renderCmpEst();renderGuide(d);renderLevels();updateSafety();
  // ホーム
  $("home").classList.toggle("has",has);
  $("hero-day").hidden=!has;$("home-procs").hidden=!has;$("home-week").hidden=!has;
  const entries=[...document.querySelectorAll(".journey .entry")];
  entries.forEach((e,i)=>e.classList.toggle("primary",has?i===2:i===0));
  $("go-after-label").textContent=has?"今日の変化を記録する":"施術後の変化を記録する";
  if(has){drawDial(d);$("home-day").textContent=d||"当";$("home-procs").textContent=sel.after.join("、")}
  renderWeek();
  // 経過の設定
  $("daytext").textContent=!$("surgery").value?"施術日を入れると、施術からの日数に合わせた目安を出します。":isFuture()?"未来の日付です。施術を受けた日を入れてください。":d?`施術後${d}日目`:"施術当日";
  $("daytext").classList.toggle("warn",isFuture());
  if(editingSetup===null)editingSetup=!has;
  $("setup-done").hidden=!has||!editingSetup;$("setup-view").hidden=!has||editingSetup;$("setup-form").hidden=has&&!editingSetup;
  if(has){$("setup-procs").textContent=sel.after.join("、");$("setup-day").textContent=`施術日 ${md($("surgery").value)} ・ ${d?d+"日目":"当日"}`}
  const cb=$("copy-before");cb.hidden=!(sel.before.length&&!sel.after.length);if(!cb.hidden)cb.textContent=`「${sel.before.join("・")}」を受けた`;
  const noPhoto=sel.after.some(n=>byName(n).noPhoto);
  $("photo-box").hidden=noPhoto;$("no-photo").hidden=!noPhoto;if(noPhoto)photos.yesterday=photos.today=null;
  if(!showingSample)recRows(realRows());renderRecDiff();
}
$("copy-before").onclick=()=>setSel("after",[...sel.before]);
$("surgery").onchange=()=>{store.set("surgery",isFuture()?"":$("surgery").value);refresh()};
$("setup-edit").onclick=()=>{editingSetup=true;refresh()};
$("setup-done").onclick=()=>{editingSetup=false;refresh();$("today-box").scrollIntoView({behavior:"smooth",block:"start"})};

// 書き出しと読み込み：記録と写真を1つのファイルにして持ち出せる
const b64=blob=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(blob)});
$("export").onclick=async()=>{
  const ph=await idb.all(),data={app:"pare",version:1,exported:today,procsAfter:sel.after,surgery:$("surgery").value,clinic:$("clinic").value,estimates:ests,records:realRows(),photos:await Promise.all(ph.map(async r=>({date:r.date,day:r.day,image:await b64(r.blob)})))};
  const a=el("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));a.download=`pare-${today}.json`;document.body.append(a);a.click();a.remove();
  $("io-status").textContent=`記録${data.records.length}件と写真${data.photos.length}枚をファイルに保存しました。健康の情報が含まれるため、ほかの人に送らず大切に保管してください。`;
};
$("import").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const d=JSON.parse(await f.text());if(d.app!=="pare"&&d.app!=="downtime-compass")throw 0;
    const merged=[...realRows().filter(r=>!d.records.some(x=>x.date===r.date)),...d.records].sort((a,b)=>a.date<b.date?-1:1);
    store.set("records",merged.slice(-60));if(d.procsAfter?.length&&!sel.after.length)setSel("after",d.procsAfter.filter(byName));
    if(d.surgery&&!$("surgery").value){$("surgery").value=d.surgery;store.set("surgery",d.surgery)}
    if(d.clinic&&!$("clinic").value){$("clinic").value=d.clinic;store.set("clinic",d.clinic)}
    if(Array.isArray(d.estimates)){for(const e of d.estimates)if(e&&typeof e.total==="number"&&!ests.some(x=>x.id===e.id)&&ests.length<6)ests.push(e);store.set("estimates",ests)}
    let n=0;for(const p of d.photos||[]){const blob=await (await fetch(p.image)).blob();if(await idb.put({date:p.date,day:p.day,blob})!=null)n++}
    $("io-status").textContent=`記録${d.records.length}件と写真${n}枚を読み込みました。`;refresh();loadPhotos(true);
  }catch{$("io-status").textContent="このファイルは読み込めませんでした。このアプリで保存したファイルを選んでください。"}
  e.target.value="";
};
try{navigator.storage?.persist?.()}catch{}

refresh();
loadPhotos(true);
