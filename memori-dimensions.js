/* 创忆录 · 内容类型 / 使用场景 / 角色 三维筛选
   说明：不新增一级分类，只在现有筛选面板里增加三组可多选的维度。
   标签在浏览器端根据标题、正文与所属分类实时推导，因此每日新增条目也会自动获得标签。 */
(function(){
  "use strict";
  if (window.__MEMORI_DIMENSIONS__) return;
  window.__MEMORI_DIMENSIONS__ = true;

  var TYPE_VALUES = ["速览","实测","教程","对比","合集","机会","情报"];
  var SCENE_VALUES = ["找工具","找免费额度","找灵感","找选题","找机会","学习"];
  var ROLE_VALUES = ["独立开发者","设计师","AI 创作者","YouTube 创作者","学生研究者"];
  var SCENE_PRIORITY = ["找机会","找免费额度","学习","找选题","找灵感","找工具"];

  var ROLE_BASE = {
    "免费资源":["独立开发者"],
    "网页动效":["设计师"],
    "排版网站":["设计师"],
    "YouTube 选题":["YouTube 创作者"],
    "前端·AI":["独立开发者"],
    "AI 实战":["AI 创作者"],
    "黑科技工具":["独立开发者"],
    "视频创作":["YouTube 创作者"],
    "科学可视化":["学生研究者"],
    "学习成长":["学生研究者"],
    "设计素材":["设计师"],
    "前沿追踪":["AI 创作者"]
  };
  var ROLE_WORDS = {
    "独立开发者":/开发者|编程|代码|api|sdk|github|自托管|部署|cli|mcp|agent|前端|后端|数据库|服务器|docker|vercel|npm|ide|git/,
    "设计师":/设计师|设计|字体|排版|配色|图标|ui|视觉|海报|插画|壁纸|figma|logo|品牌|动效/,
    "AI 创作者":/ai\s*(绘画|视频|音乐|配音|生成|创作|图像)|生成式|提示词|声音克隆|数字人|文生图|图生视频|智能体/,
    "YouTube 创作者":/youtube|视频|剪辑|字幕|录制|封面|选题|频道|口播|直播|bgm|音效/,
    "学生研究者":/课程|学习|论文|研究|学术|教材|实验|数据|可视化|模拟|科普|奖学金|刷题/
  };

  function arr(v){ return Array.isArray(v) ? v : []; }
  function uniq(a){
    var out=[];
    a.forEach(function(v){ if(v && out.indexOf(v)<0) out.push(v); });
    return out;
  }
  function low(s){ return String(s==null?"":s).toLowerCase(); }
  function title(x){ return low(x.title); }
  function body(x){
    var d=String(x.desc==null?"":x.desc);
    d=d.replace(/建议标题[^。]*。/g,"");
    var i=d.search(/注意[:：]/);
    if(i>0) d=d.slice(0,i);
    return low(d);
  }
  function fullDesc(x){ return low(x.desc); }
  function bodyAll(x){
    return low(String(x.desc==null?"":x.desc).replace(/建议标题[^。]*。/g,""));
  }

  function contentType(x, cat, ti, dm, df){
    /* 先看明确的内容形态，再按栏目语义兜底，避免描述里的偶发词把整类带偏 */
    if(/教程|课程|公开课|教材|入门课|速成课|指南|从零|手把手|教你|刷题|实战教程/.test(ti)
      || /教程|课程|公开课|教材|入门课|速成课|实战教程|手把手教你|从零.{0,8}(学|做|训)|教你.{0,8}(用|做|学)|照着练/.test(dm)) return "教程";
    if(/合集|收录|汇总|清单|资源库|素材库|图库|汇集|集合|一次放出|大全|awesome/.test(ti)
      || /合集|汇总|清单|收录.{0,12}(资源|素材|工具|网站)|汇集|素材库|图库|资源库/.test(dm)
      || /\d{2,}\s*[+＋]?\s*(个|张|款|套|组)?\s*(免费|开源)?\s*(图标|字体|插画|模板|壁纸|素材|渐变|音效|课程|实验室|效果|工具)/.test(ti+" "+dm)) return "合集";
    if(/实测|评测|亲测|上手体验|试用体验|体验报告|踩坑|跑分|benchmark|性能测试|压力测试/.test(ti)
      || /独立实测|作者实测|亲测|上手体验|试用体验|体验报告|实测(显示|发现|结果|数据|脚本|一部|部署|后|约|速度|耗时|跑|省|只)|benchmark|性能测试|压力测试/.test(df)) return "实测";
    if(/对比|平替|替代|取代|选型|竞品|\bvs\b|横评/.test(ti)
      || /平替|替代方案|替代品|横向测评|对比评测|对比测评|横评/.test(df)) return "对比";
    if(cat==="免费资源" || /免费档|免费额度|免费版|免费账号|试用金|免绑卡领|免费领|领取|申请|招募|大赛|内测|名额|创业计划|奖学金|资助|早鸟|优惠|折扣|限免/.test(ti)) return "机会";
    if(cat==="前沿追踪" || /正式发布|发布|上线|更新|新版本|正式版|预览版|论文|报告|融资|收购|榜单|趋势|预告|\bga\b|检查点/.test(ti)) return "情报";
    if(cat==="学习成长") return "教程";
    return "速览";
  }

  function scenesFor(x, cat, ct, ti, dm){
    var out=[];
    if(/限时|截止|申请|领取|招募|大赛|内测|名额|优惠|试用金|创业计划|早鸟|奖学金|资助/.test(ti+" "+dm)) out.push("找机会");
    if(cat==="免费资源" || /免费档|免费额度|免费版|免费账号|试用金|免登录|无需注册|限免|免费试用/.test(ti)) out.push("找免费额度");
    if(ct==="教程" || cat==="学习成长" || /课程|公开课|教材|教程|速成课|入门课|从零|手把手|教学|刷题|论文|文档|手册|指南/.test(ti)) out.push("学习");
    if(cat==="YouTube 选题" || /选题|建议标题|拍法|频道|口播|封面|脚本|分镜/.test(fullDesc(x))) out.push("找选题");
    if(["网页动效","排版网站","设计素材","科学可视化"].indexOf(cat)>=0 || /灵感|创意|作品集|案例|风格|排版|字体|配色|图标|动效|视觉|插画|壁纸|艺术/.test(ti)) out.push("找灵感");
    if(["前端·AI","AI 实战","黑科技工具","视频创作"].indexOf(cat)>=0 || /工具|插件|cli|客户端|桌面端|编辑器|应用|平台|生成器|网站|skill|mcp|sdk|api/.test(ti)) out.push("找工具");
    out=uniq(out);
    out.sort(function(a,b){ return SCENE_PRIORITY.indexOf(a)-SCENE_PRIORITY.indexOf(b); });
    if(!out.length) out=["找工具"];
    return out.slice(0,2);
  }

  function rolesFor(x, cat, ti, dm){
    var text=ti+" "+dm;
    var scores={};
    (ROLE_BASE[cat]||[]).forEach(function(r){ scores[r]=3; });
    ROLE_VALUES.forEach(function(r){
      var m=text.match(ROLE_WORDS[r]);
      if(m) scores[r]=(scores[r]||0)+3;
    });
    var ranked=ROLE_VALUES.map(function(r){ return [r,scores[r]||0]; })
      .filter(function(p){ return p[1]>=3; })
      .sort(function(a,b){ return b[1]-a[1]; });
    var out=ranked.slice(0,2).map(function(p){ return p[0]; });
    return out.length?out:["独立开发者"];
  }

  function classify(x){
    var cat=String(x.cat==null?"":x.cat);
    var ti=title(x), dm=body(x), df=bodyAll(x);
    var ct=contentType(x,cat,ti,dm,df);
    return { ctype:[ct], scene:scenesFor(x,cat,ct,ti,dm), role:rolesFor(x,cat,ti,dm) };
  }

  function ensureData(){
    if(!Array.isArray(window.DATA)) return false;
    window.DATA.forEach(function(x){
      if(!x._dims) x._dims=classify(x);
    });
    return true;
  }

  function ensureFacetFields(obj){
    if(!obj) return;
    ["ctype","scene","role"].forEach(function(k){ obj[k]=arr(obj[k]); });
  }

  function patchState(){
    ensureFacetFields(window.F);
    ensureFacetFields(window.P);
  }

  /* ---- 面板 UI ---- */
  function facetGroup(key,label){
    return '<div class="facet-row" data-facet="'+key+'">'
      + '<span class="facet-label">'+label+'</span>'
      + '<div class="facet-chips" role="group" aria-label="'+label+'">'
      + '<span class="facet-loading">加载中…</span>'
      + '</div></div>';
  }

  function buildFacetBlock(){
    if(document.getElementById("memoriFacets")) return;
    var grid=document.querySelector(".deck-filters .filter-grid");
    if(!grid) return;
    var block=document.createElement("div");
    block.className="facet-block";
    block.id="memoriFacets";
    block.innerHTML='<div class="facet-head"><span class="facet-kicker">DIMENSIONS</span><span class="facet-hint">内容类型 · 使用场景 · 角色，可多选叠加</span></div>'
      + facetGroup("ctype","内容类型")
      + facetGroup("scene","使用场景")
      + facetGroup("role","角色");
    grid.parentNode.insertBefore(block, grid.nextSibling);
  }

  function syncFacetChips(){
    var block=document.getElementById("memoriFacets");
    if(!block) return;
    ensureFacetFields(window.P);
    [["ctype",TYPE_VALUES],["scene",SCENE_VALUES],["role",ROLE_VALUES]].forEach(function(pair){
      var key=pair[0], values=pair[1];
      var row=block.querySelector('[data-facet="'+key+'"] .facet-chips');
      if(!row) return;
      var chosen=arr(window.P[key]);
      row.innerHTML=values.map(function(v){
        var on=chosen.indexOf(v)>=0;
        return '<button type="button" class="facet-chip'+(on?" on":"")+'" data-facet-key="'+key+'" data-facet-value="'+v+'" aria-pressed="'+(on?"true":"false")+'">'+v+'</button>';
      }).join("");
    });
  }

  function toggleFacet(key,value,chip){
    ensureFacetFields(window.P);
    var a=arr(window.P[key]).slice();
    var i=a.indexOf(value);
    if(i>=0) a.splice(i,1); else a.push(value);
    window.P[key]=a;
    if(chip){
      var on=a.indexOf(value)>=0;
      chip.classList.toggle("on",on);
      chip.setAttribute("aria-pressed",on?"true":"false");
    } else {
      syncFacetChips();
    }
  }

  /* ---- 与现有筛选逻辑衔接 ---- */
  function selectedDimsHtml(x){
    var f=window.F||{};
    var d=x._dims;
    if(!d) return "";
    var out=[];
    ["ctype","scene","role"].forEach(function(k){
      var chosen=arr(f[k]);
      if(!chosen.length) return;
      chosen.forEach(function(v){ if(arr(d[k]).indexOf(v)>=0 && out.indexOf(v)<0) out.push(v); });
    });
    if(!out.length) return "";
    return out.slice(0,4).map(function(v){
      var s=String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      return '<span class="dimtag">'+s+'</span>';
    }).join("");
  }
  function patchFilters(){
    var origFiltered=window.filtered;
    if(!origFiltered) return;
    window.filtered=function(){
      var list=origFiltered.apply(this,arguments);
      var f=window.F;
      if(!f) return list;
      var ct=arr(f.ctype), sc=arr(f.scene), ro=arr(f.role);
      if(!ct.length&&!sc.length&&!ro.length) return list;
      return list.filter(function(x){
        var d=x._dims||{ctype:["速览"],scene:["找工具"],role:[]};
        if(ct.length && ct.some(function(v){ return d.ctype.indexOf(v)>=0; })===false) return false;
        if(sc.length && sc.some(function(v){ return d.scene.indexOf(v)>=0; })===false) return false;
        if(ro.length && ro.some(function(v){ return d.role.indexOf(v)>=0; })===false) return false;
        return true;
      });
    };

    var origTags=window.tagsHtml;
    if(origTags) window.tagsHtml=function(x){
      var html=origTags.apply(this,arguments);
      var extra=selectedDimsHtml(x);
      return extra?html.replace(/<\/div>$/,extra+"</div>"):html;
    };

    var origFp=window.filterFp;
    if(origFp) window.filterFp=function(){
      var f=window.F||{};
      return origFp.apply(this,arguments)+"|"
        +arr(f.ctype).join(",")+"|"+arr(f.scene).join(",")+"|"+arr(f.role).join(",");
    };

    var origActive=window.activeFilters;
    if(origActive) window.activeFilters=function(){
      var out=origActive.apply(this,arguments);
      var f=window.F||{};
      if(arr(f.ctype).length) out.push(["ctype","内容："+arr(f.ctype).join(" / ")]);
      if(arr(f.scene).length) out.push(["scene","场景："+arr(f.scene).join(" / ")]);
      if(arr(f.role).length) out.push(["role","角色："+arr(f.role).join(" / ")]);
      return out;
    };

    var origClear=window.clearFilter;
    if(origClear) window.clearFilter=function(key){
      if(key==="ctype"||key==="scene"||key==="role"){
        if(window.F) window.F[key]=[];
        if(window.P) window.P[key]=[];
        syncFacetChips();
        window.render();
        return;
      }
      return origClear.apply(this,arguments);
    };

    var origLabels=window.panelLabels;
    if(origLabels) window.panelLabels=function(){
      var out=origLabels.apply(this,arguments);
      var p=window.P||{};
      if(arr(p.ctype).length) out.push("内容类型："+arr(p.ctype).join(" / "));
      if(arr(p.scene).length) out.push("使用场景："+arr(p.scene).join(" / "));
      if(arr(p.role).length) out.push("角色："+arr(p.role).join(" / "));
      return out;
    };

    var origSyncPanel=window.syncPanelFromF;
    if(origSyncPanel) window.syncPanelFromF=function(){
      origSyncPanel.apply(this,arguments);
      ensureFacetFields(window.P);
      window.P.ctype=arr(window.F&&window.F.ctype).slice();
      window.P.scene=arr(window.F&&window.F.scene).slice();
      window.P.role=arr(window.F&&window.F.role).slice();
      syncFacetChips();
    };

    var origControls=window.syncPanelControls;
    if(origControls) window.syncPanelControls=function(){
      origControls.apply(this,arguments);
      ensureFacetFields(window.P);
      syncFacetChips();
    };

    var origResetAll=window.resetFiltersOnly;
    if(origResetAll) window.resetFiltersOnly=function(){
      origResetAll.apply(this,arguments);
      if(window.F){ window.F.ctype=[]; window.F.scene=[]; window.F.role=[]; }
      syncFacetChips();
    };
  }

  /* ---- 面板内交互 ---- */
  function copyPanelFacetsToF(){
    if(!window.F) return;
    window.F.ctype=arr(window.P&&window.P.ctype).slice();
    window.F.scene=arr(window.P&&window.P.scene).slice();
    window.F.role=arr(window.P&&window.P.role).slice();
  }
  function revealPanel(){
    var panel=document.getElementById("deckFilters");
    if(!panel||!panel.classList.contains("open")) return;
    var r=panel.getBoundingClientRect();
    var vh=window.innerHeight||document.documentElement.clientHeight;
    var overflow=r.bottom-(vh-12);
    if(overflow>0) window.scrollBy({top:overflow,behavior:"smooth"});
  }
  function bindUi(){
    var block=document.getElementById("memoriFacets");
    if(!block) return;
    block.addEventListener("click",function(e){
      var chip=e.target.closest ? e.target.closest(".facet-chip") : null;
      if(!chip) return;
      e.preventDefault();
      toggleFacet(chip.getAttribute("data-facet-key"),chip.getAttribute("data-facet-value"),chip);
    });

    /* 面板确认：原 applyPanel 会先应用传统字段，这里再把三维字段写入并补一次渲染。
       在 pointerdown/keydown 阶段提前写入，保证原 toast 的“共 N 条”也按三维筛选计数。 */
    var apply=document.getElementById("panelApply");
    if(apply){
      apply.addEventListener("pointerdown",copyPanelFacetsToF,true);
      apply.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" ") copyPanelFacetsToF(); },true);
      apply.addEventListener("click",function(){
        copyPanelFacetsToF();
        window.render();
      });
    }

    /* 底部“清除全部筛选”会重建 F 对象，补回三维字段 */
    var reset=document.getElementById("resetBtn");
    if(reset) reset.addEventListener("click",function(){
      patchState();
      syncFacetChips();
      window.render();
    });

    /* 重置面板：原 resetPanel 会重建 P 对象，补回三维字段 */
    var panelReset=document.getElementById("panelReset");
    if(panelReset) panelReset.addEventListener("click",function(){
      patchState();
      syncFacetChips();
    });

    /* 首屏直接点“筛选”时，面板可能落在视口下方；打开后确保整块面板可见 */
    var more=document.getElementById("moreBtn");
    if(more) more.addEventListener("click",function(){
      setTimeout(revealPanel,0);
    });
  }

  function boot(){
    if(!ensureData()) return;
    patchState();
    buildFacetBlock();
    syncFacetChips();
    patchFilters();
    bindUi();
    /* 首次渲染时把新的筛选胶囊接入工具栏 */
    if(typeof window.render==="function" && window.F) window.render();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  } else {
    boot();
  }
})();
