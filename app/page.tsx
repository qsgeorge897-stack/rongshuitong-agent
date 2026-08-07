"use client";

import { useMemo, useRef, useState } from "react";

type View = "overview" | "materials" | "agent" | "evidence" | "products" | "report" | "evaluation" | "standards";

const documents = [
  { name: "营业执照.jpg", type: "主体资料", state: "已核验", meta: "统一社会信用代码 · 有效" },
  { name: "2026年销项发票.xlsx", type: "发票", state: "2项待核验", meta: "48 张 · ¥521,340" },
  { name: "近6个月银行流水.pdf", type: "银行流水", state: "1项待确认", meta: "427 笔 · 18 页" },
  { name: "2026年利润表.xlsx", type: "财务报表", state: "已核验", meta: "更新至 7 月" },
  { name: "二季度纳税申报表.pdf", type: "纳税资料", state: "资料缺失", meta: "缺少 4 月申报记录" },
];

const findings = [
  { level: "中", title: "经营流水与开票收入存在差异", value: "¥343,000", detail: "经营性流入 86.4 万元，同期开票 52.1 万元。需确认 3 笔大额入账性质。", source: "流水 P12–18 · 销项发票汇总" },
  { level: "中", title: "第一大客户收入集中度较高", value: "58%", detail: "青禾商业管理有限公司贡献近 6 个月过半开票收入，建议补充长期合作合同。", source: "销项发票第 6–31 行" },
  { level: "低", title: "采购合同与发票金额未完全对应", value: "差额 ¥80,000", detail: "设备采购合同金额 26 万元，已识别发票合计 18 万元。", source: "采购合同 P3 · 进项发票汇总" },
];

const productRows = [
  { name: "小微信用经营贷 A", bank: "模拟银行", range: "20–100 万", fit: 88, status: "初步适配", reason: "经营满 2 年，流水稳定" },
  { name: "税务经营贷 B", bank: "模拟银行", range: "10–80 万", fit: 72, status: "待补材料", reason: "缺少 4 月纳税申报记录" },
  { name: "商户流水贷 C", bank: "模拟银行", range: "10–50 万", fit: 64, status: "需确认", reason: "需解释 3 笔个人账户转入" },
];

export default function Home() {
  const [onboarded, setOnboarded] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("法定代表人");
  const [view, setView] = useState<View>("overview");
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [files, setFiles] = useState(0);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readiness = resolved ? 86 : complete ? 78 : 62;
  const steps = useMemo(() => [
    "识别企业主体与融资目标",
    "解析 48 张发票和 427 笔流水",
    "核对开票、申报与经营性流入",
    "检索财税检查规则与适用边界",
    "计算现金流和客户集中度",
    "匹配普惠产品规则并生成材料清单",
  ], []);

  function runCheck() {
    if (!demoLoaded) { setView("materials"); return; }
    setView("agent");
    setRunning(true);
    setComplete(false);
    window.setTimeout(() => { setRunning(false); setComplete(true); }, 2300);
  }

  const nav: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "融资体检", icon: "⌂" },
    { id: "materials", label: "材料中心", icon: "▤" },
    { id: "agent", label: "Agent 工作台", icon: "✦" },
    { id: "evidence", label: "业务证据链", icon: "⌘" },
    { id: "products", label: "产品匹配", icon: "◈" },
    { id: "report", label: "准备度报告", icon: "▥" },
    { id: "evaluation", label: "能力评测", icon: "◎" },
    { id: "standards", label: "规则与依据", icon: "§" },
  ];

  if (!onboarded) return <Onboarding onComplete={(name, selectedRole) => { setCompanyName(name); setRole(selectedRole); setOnboarded(true); }} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">融</span><span>融税通<small>小微融资智能管家</small></span></div>
        <nav>{nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "materials" && <b>{files}</b>}</button>)}</nav>
        <div className="side-note"><span>数据保护</span><strong>演示数据已脱敏</strong><p>分析仅作辅助参考，不构成税务或授信意见。</p></div>
        <div className="profile"><span>{companyName.slice(0,1)}</span><div><strong>{companyName}</strong><small>{role}</small></div><i>···</i></div>
      </aside>

      <section className="workspace">
        <header><div><span className="eyebrow">2026 GOAI · AI + 金融</span><h1>{view === "overview" ? "融资准备度体检" : nav.find(n => n.id === view)?.label}</h1></div><div className="header-actions"><button className="ghost">操作日志</button><button className="primary" onClick={runCheck}>{demoLoaded?"✦ 运行 Agent 体检":"＋ 先提交材料"}</button></div></header>

        {view === "overview" && <Overview companyName={companyName} readiness={readiness} complete={complete} runCheck={runCheck} setView={setView} />}
        {view === "materials" && <Materials files={files} demoLoaded={demoLoaded} onDemo={() => {setDemoLoaded(true);setFiles(5)}} onUpload={() => fileRef.current?.click()} />}
        {view === "agent" && <AgentView running={running} complete={complete} resolved={resolved} steps={steps} onResolve={() => setResolved(true)} />}
        {view === "evidence" && <EvidenceChain resolved={resolved} onResolve={() => setResolved(true)} />}
        {view === "products" && <Products resolved={resolved} />}
        {view === "report" && <Report companyName={companyName} readiness={readiness} resolved={resolved} demoLoaded={demoLoaded} setView={setView} />}
        {view === "evaluation" && <Evaluation />}
        {view === "standards" && <Standards />}
      </section>

      <input ref={fileRef} className="hidden" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv" onChange={e => { const n = e.target.files?.length || 0; setFiles(v => v + n); setDemoLoaded(false); setView("materials"); }} />
    </main>
  );
}

function Overview({ companyName, readiness, complete, runCheck, setView }: { companyName:string; readiness: number; complete: boolean; runCheck: () => void; setView: (v: View) => void }) {
  return <div className="content">
    <section className="hero-card">
      <div className="hero-copy"><span className="status-pill"><i /> {companyName} · 档案已建立</span><h2>融资前，先把企业经营<br/>情况讲清楚。</h2><p>依据适用会计制度核验发票、流水与财务材料，所有提示均区分事实、规则、推测与待确认事项。</p><div className="hero-actions"><button className="primary large" onClick={() => setView("materials")}>＋ 提交企业材料</button><button className="text-button" onClick={() => setView("standards")}>查看分析依据 →</button></div></div>
      <div className="score-ring" style={{"--score": `${readiness * 3.6}deg`} as React.CSSProperties}><div><strong>{readiness}</strong><span>融资准备度</span><small>{complete ? "较上次 +16" : "等待本次体检"}</small></div></div>
    </section>
    <div className="metric-grid">
      <Metric label="材料完整度" value="72%" note="缺少 2 项关键材料" tone="blue" />
      <Metric label="财税健康" value="需关注" note="发现 3 条核验线索" tone="orange" />
      <Metric label="现金流稳定性" value="良好" note="近 6 月波动 12.4%" tone="green" />
      <Metric label="初步匹配产品" value="3 个" note="1 个待补充资料" tone="purple" />
    </div>
    <div className="two-col">
      <section className="panel"><div className="panel-title"><div><span className="section-kicker">待办事项</span><h3>先处理这三件事</h3></div><button onClick={() => setView("agent")}>查看全部</button></div>
        <div className="todo"><span className="warn">!</span><div><strong>说明 3 笔个人账户转入</strong><small>影响经营性收入计算 · 高优先级</small></div><b>去处理 →</b></div>
        <div className="todo"><span className="doc">▧</span><div><strong>补充 4 月纳税申报记录</strong><small>影响税务经营贷产品匹配</small></div><b>去上传 →</b></div>
        <div className="todo"><span className="info">i</span><div><strong>确认设备采购发票差额</strong><small>合同与发票相差 ¥80,000</small></div><b>去确认 →</b></div>
      </section>
      <section className="panel"><div className="panel-title"><div><span className="section-kicker">经营趋势</span><h3>近 6 个月现金流</h3></div><span className="legend"><i/>经营流入 <i/>经营流出</span></div><div className="chart"><div className="y-labels"><span>20万</span><span>10万</span><span>0</span></div><div className="bars">{[[74,58],[82,64],[69,60],[92,70],[88,76],[78,72]].map((b,i)=><div className="bar-pair" key={i}><div style={{height:`${b[0]}%`}}/><div style={{height:`${b[1]}%`}}/><span>{["2月","3月","4月","5月","6月","7月"][i]}</span></div>)}</div></div></section>
    </div>
  </div>;
}

function Metric({label,value,note,tone}:{label:string;value:string;note:string;tone:string}) { return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small><i /></div> }

function Materials({ files, demoLoaded, onDemo, onUpload }: { files: number; demoLoaded:boolean; onDemo:()=>void; onUpload: () => void }) {
  return <div className="content"><div className="page-intro"><div><h2>企业材料中心</h2><p>上传材料后，系统会自动分类、抽取关键字段并等待你的确认。</p></div><button className="primary" onClick={onUpload}>＋ 上传新材料</button></div>
    <section className="upload-zone" onClick={onUpload}><span>⇧</span><strong>拖入发票、流水、执照或财务报表</strong><small>支持 PDF、JPG、PNG、XLSX · 上传前请确认已获得文件处理授权</small></section>
    <div className="demo-switch"><div><strong>没有可用材料？</strong><small>可载入明确标记的虚构样本，仅用于比赛演示，不与真实分析混用。</small></div><button className="ghost" onClick={onDemo}>载入合规演示样本</button></div>
    <section className="panel table-panel"><div className="panel-title"><div><span className="section-kicker">已提交 {files} 份</span><h3>{demoLoaded?"演示样本识别结果":"待处理材料"}</h3></div><span className="success-text">● 最小必要 · 用户授权 · 可删除</span></div>{files===0?<div className="empty-state"><strong>尚未提交材料</strong><p>请先上传至少一份企业材料，系统不会默认代入任何公司或经营数据。</p></div>:demoLoaded?<div className="doc-table"><div className="table-head"><span>材料名称</span><span>类别</span><span>识别摘要</span><span>核验状态</span></div>{documents.map((d,i)=><div className="table-row" key={d.name}><span><i className="file-icon">{i===1?"X":"P"}</i><b>{d.name}</b></span><span>{d.type}</span><span>{d.meta}</span><span><em className={d.state.includes("已核验")?"ok":d.state.includes("缺失")?"bad":"pending"}>{d.state}</em></span></div>)}</div>:<div className="empty-state"><strong>{files} 份用户材料已进入待解析队列</strong><p>当前比赛版不伪造识别结果；接入正式 OCR 与规则服务后才会生成会计核验结论。</p></div>}</section>
  </div>;
}

function AgentView({running,complete,resolved,steps,onResolve}:{running:boolean;complete:boolean;resolved:boolean;steps:string[];onResolve:()=>void}) {
  return <div className="content"><div className="page-intro"><div><h2>Agent 正在为你完成融资准备</h2><p>目标：申请 80 万元经营贷，用于新店设备采购与库存补充。</p></div><span className={`agent-state ${running?"working":complete?"done":"idle"}`}>{running?"分析中…":complete?"本轮已完成":"等待运行"}</span></div>
    <div className="agent-layout"><section className="panel plan-panel"><div className="agent-head"><span className="agent-orb">✦</span><div><strong>任务规划 Agent</strong><small>受控工作流 · 全程保留依据</small></div></div><div className="step-list">{steps.map((s,i)=><div key={s} className={(running||complete)?"step active":"step"}><span>{complete?"✓":running&&i<4?"✓":i+1}</span><div><strong>{s}</strong><small>{complete?"已完成并记录运行证据":running&&i===4?"正在调用计算工具…":"等待执行"}</small></div></div>)}</div></section>
      <section className="agent-results"><div className="summary-strip"><div><span>解析材料</span><strong>5 份</strong></div><div><span>核验字段</span><strong>186 个</strong></div><div><span>发现线索</span><strong>{resolved?2:3} 条</strong></div><div><span>规则引用</span><strong>12 条</strong></div></div>
        <section className="panel question-card"><span className="section-kicker">需要你确认</span><h3>这 3 笔个人账户转入是什么性质？</h3><p>近 6 个月发现法定代表人个人账户转入共计 <b>¥180,000</b>。为避免高估经营收入，请补充说明。</p>{resolved?<div className="resolved"><span>✓</span><div><strong>已确认为股东临时借款</strong><small>已从经营性收入中剔除，现金流指标和产品匹配结果已更新。</small></div></div>:<div className="choice-grid"><button onClick={onResolve}>股东临时借款</button><button onClick={onResolve}>经营销售收入</button><button onClick={onResolve}>内部账户调拨</button><button onClick={onResolve}>其他，补充说明</button></div>}</section>
        <section className="panel findings"><div className="panel-title"><div><span className="section-kicker">证据链核验</span><h3>待关注的异常线索</h3></div><span>不是违规结论</span></div>{findings.slice(0,resolved?2:3).map(f=><div className="finding" key={f.title}><span className={`risk r-${f.level}`}>{f.level}</span><div><strong>{f.title}</strong><p>{f.detail}</p><small>⌕ {f.source}</small></div><b>{f.value}</b></div>)}</section>
      </section></div></div>;
}

function Products({resolved}:{resolved:boolean}) { return <div className="content"><div className="page-intro"><div><h2>普惠产品规则匹配</h2><p>基于企业经营画像与模拟产品规则生成，不代表银行审批结果。</p></div><button className="ghost">筛选条件</button></div><div className="notice">ⓘ 当前演示使用 2026-08-01 更新的模拟产品库。实际额度、利率及审批条件以持牌金融机构为准。</div><div className="product-grid">{productRows.map((p,i)=><article className="product" key={p.name}><div className="product-top"><span>{p.bank}</span><em className={i===0?"ok":"pending"}>{resolved&&i===2?"暂不适配":p.status}</em></div><h3>{p.name}</h3><div className="product-range"><span>公示额度范围</span><strong>{p.range}</strong></div><div className="fit-row"><span>规则适配度</span><b>{resolved&&i===2?46:p.fit}%</b></div><div className="progress"><i style={{width:`${resolved&&i===2?46:p.fit}%`}} /></div><p>✓ {resolved&&i===2?"个人转入已确认为借款，经营流水需重新核验":p.reason}</p><button>查看条件与材料 →</button></article>)}</div><section className="panel checklist"><div className="panel-title"><div><span className="section-kicker">统一准备</span><h3>申请材料清单</h3></div><strong>完成 6 / 9</strong></div>{["营业执照与法定代表人身份证明","近 6 个月经营流水","近 12 个月开票记录","纳税申报记录","主要经营合同","贷款用途证明"].map((x,i)=><label key={x}><input type="checkbox" defaultChecked={i<4}/><span>{x}</span><small>{i<4?"已从材料中心关联":"需要补充"}</small></label>)}</section></div> }

function Report({companyName,readiness,resolved,demoLoaded,setView}:{companyName:string;readiness:number;resolved:boolean;demoLoaded:boolean;setView:(v:View)=>void}) {
  if(!demoLoaded)return <div className="content"><div className="report-empty"><span>▥</span><h2>尚未生成测评报告</h2><p>系统不会在没有完成材料解析和规则核验时生成预设结论。你可以上传真实材料等待正式解析服务，或载入明确标记的合规演示样本体验完整报告。</p><button className="primary" onClick={()=>setView("materials")}>前往材料中心 →</button></div></div>;
  const riskCount=resolved?2:3;
  return <div className="content report-page"><div className="page-intro"><div><h2>小微企业融资准备度测评报告</h2><p>报告编号 RST-2026-0807-001 · 样本模式 · 规则基准日 2026-08-01</p></div><button className="primary" onClick={()=>window.print()}>⇩ 导出完整 PDF</button></div>
    <section className="report-cover"><div><span className="status-pill"><i/> 合规演示样本 · 分析已完成</span><h2>{companyName}</h2><p>融资目标：80 万元 · 设备采购与库存补充 · 期限 24 个月</p><div className="eligibility-banner"><b>预核验结论：暂不建议直接提交流动资金贷款申请</b><span>主体具备基础申请条件，但“设备采购”与流动资金贷款用途边界存在冲突，应拆分融资用途并由银行确认。</span></div><div className="cover-meta"><span>适用制度：小企业会计准则</span><span>分析材料：5 份</span><span>规则基准：金监总局令2024年第2号</span></div></div><div className="report-score"><strong>{readiness}</strong><span>材料准备度</span><small>不等于授信通过率</small></div></section>
    <nav className="report-toc"><a href="#summary">01 综合结论</a><a href="#scope">02 分析范围</a><a href="#profile">03 经营画像</a><a href="#risks">04 详细核验</a><a href="#finance">05 融资匹配</a><a href="#actions">06 行动计划</a><a href="#method">07 方法与限制</a></nav>
    <section id="summary" className="report-section"><div className="report-heading"><span>01</span><div><small>EXECUTIVE SUMMARY</small><h2>综合结论</h2></div></div><div className="summary-callout"><div><strong>材料基础较好，但需先解释 {riskCount} 项经营事实</strong><p>近6个月经营流入总体稳定，企业经营年限及基础材料满足多数模拟产品的初筛条件。主要问题不是“风险高低”的结论，而是部分交易尚未形成完整的合同—发票—流水—会计记录证据链。</p></div><span className="grade">B+</span></div><div className="conclusion-grid"><div><span>较有利事实</span><strong>现金流持续为正</strong><p>6个月经营性净流入合计 18.7 万元，未发现连续两个月为负。</p></div><div><span>主要关注</span><strong>客户集中度 58%</strong><p>第一大客户贡献超过一半开票收入，需补充合作稳定性证据。</p></div><div><span>优先动作</span><strong>补齐纳税资料</strong><p>缺少4月申报记录，影响税务类产品规则匹配。</p></div></div></section>
    <section id="scope" className="report-section"><div className="report-heading"><span>02</span><div><small>SCOPE & BASIS</small><h2>分析范围与依据</h2></div></div><div className="scope-grid"><div className="panel"><h3>已纳入材料</h3>{documents.map(d=><div className="scope-row" key={d.name}><span>✓</span><div><strong>{d.name}</strong><small>{d.meta}</small></div><em>{d.state}</em></div>)}</div><div className="panel"><h3>本次没有做什么</h3><ul className="boundary-list"><li>未核验材料真实性或向第三方验证</li><li>未进行税务违法、舞弊或虚开发票认定</li><li>未计算信用评分或贷款通过率</li><li>未替代会计师、税务人员或银行审批</li></ul><h3 className="subhead">采用依据</h3><p className="basis-note">《中华人民共和国会计法》（2024年修正）、《小企业会计准则》及用户确认的模拟产品规则。具体条款与版本可在“规则与依据”页面追溯。</p></div></div></section>
    <section id="profile" className="report-section"><div className="report-heading"><span>03</span><div><small>OPERATING PROFILE</small><h2>经营与现金流画像</h2></div></div><div className="indicator-grid">{[["开票收入","¥521,340","48 张销项发票"],["经营性流入","¥684,000",resolved?"已剔除股东借款 18 万":"待确认个人转入 18 万"],["经营性流出","¥497,000","427 笔流水分类"],["经营性净流入","¥187,000","流入 − 流出"],["第一大客户占比","58.0%","302,377 ÷ 521,340"],["月度流入波动","12.4%","标准差 ÷ 月均流入"]].map((m,i)=><div className="indicator" key={m[0]}><span>{m[0]}</span><strong>{m[1]}</strong><small>{m[2]}</small><i className={`tone-${i}`}/></div>)}</div><div className="formula-panel"><div><span>关键计算</span><strong>调整后经营性流入 = 银行总流入 − 内部调拨 − 股东借款 − 非经营项目</strong></div><code>864,000 − 180,000 = 684,000 元</code><p>计算结果来自确定性工具；大模型只负责解释和提出补充问题，不参与金额运算。</p></div></section>
    <section id="risks" className="report-section"><div className="report-heading"><span>04</span><div><small>DETAILED FINDINGS</small><h2>详细核验与证据</h2></div></div><div className="risk-report-list"><DetailedFinding no="R-01" level="中" title="经营流水与开票收入口径存在差异" resolved={resolved} fact="银行总流入 86.4 万元；同期销项发票 52.13 万元；其中法定代表人个人转入 18 万元。" calc="调整前差额 34.27 万元；确认股东借款后，经营流入调整为 68.4 万元。" rule="会计核算应以实际发生的经济业务事项为依据；不同性质资金不得仅因进入银行账户而全部识别为营业收入。" evidence="银行流水 P12–18；销项发票汇总第 2–49 行；股东借款协议 P1" action={resolved?"已解释为股东临时借款，建议由财务确认其他应付款记录。":"请确认三笔转入性质，并上传协议或业务合同。"}/><DetailedFinding no="R-02" level="中" title="第一大客户收入集中度较高" fact="第一大客户开票金额 302,377 元，占同期全部销项发票 58.0%。" calc="302,377 ÷ 521,340 = 58.0%。" rule="该指标为经营稳定性提示，不属于会计违规判断；阈值来自本项目模拟融资规则。" evidence="销项发票汇总第 6–31 行；主要客户合同 P1–6" action="补充长期合作合同、历史续约或订单稳定性说明。"/><DetailedFinding no="R-03" level="低" title="设备采购合同与已取得发票存在时间性差额" fact="采购合同金额 26 万元；已取得发票及已付款金额均为 18 万元。" calc="未勾稽金额 8 万元，差异率 30.77%。" rule="凭证审核需要结合合同履约、交付进度与业务实质，不能仅凭差额认定会计差错。" evidence="设备采购合同 P3；进项发票第 8–12 行；银行流水 P9" action="确认剩余设备交付状态，并建立后续发票补充任务。"/></div></section>
    <section id="finance" className="report-section"><div className="report-heading"><span>05</span><div><small>APPLICATION ELIGIBILITY PRE-CHECK</small><h2>融资申请条件预核验</h2></div></div>
      <div className="authority-note"><strong>判断基准</strong><p>依据国家金融监督管理总局令2024年第2号《流动资金贷款管理办法》第十四条的六项申请条件，以及第九条关于贷款用途的限制。本报告只能核验材料是否支持这些条件，最终尽职调查和授信审批由贷款人独立完成。</p><a href="https://www.nfra.gov.cn/cn/view/pages/ItemDetail.html?docId=1151066&generaltype=0&itemId=925" target="_blank" rel="noreferrer">查看官方原文 ↗</a></div>
      <div className="eligibility-summary"><div><span>基础条件</span><strong>3 项满足</strong></div><div><span>待外部核验</span><strong>2 项</strong></div><div><span>用途冲突</span><strong>1 项</strong></div><div className="overall"><span>当前状态</span><strong>有条件具备申请基础</strong><small>整改前不建议提交</small></div></div>
      <div className="qualification-list"><Qualification status="pass" no="01" title="依法登记" basis="第十四条第（一）项：借款人依法经市场监督管理部门或主管部门核准登记。" evidence="营业执照已提交；统一社会信用代码、企业名称和法定代表人字段完整。" conclusion="材料层面满足" caveat="系统未连接国家企业信用信息公示系统，存续状态及经营异常名录仍需银行外部核验。"/><Qualification status="fail" no="02" title="借款用途明确、合法并符合产品边界" basis="第九条及第十四条第（二）项：用途应明确、合法；流动资金贷款不得用于固定资产投资。" evidence="用户填写用途为“设备采购与库存补充”，设备采购合同金额26万元。" conclusion="存在用途冲突" caveat="库存采购可属于日常经营周转；设备采购通常具有固定资产属性。建议拆分：库存部分申请流动资金贷款，设备部分另行咨询固定资产融资。"/><Qualification status="review" no="03" title="经营合法、合规" basis="第十四条第（三）项：借款人经营合法、合规。" evidence="营业执照经营范围与餐饮经营描述基本一致；当前材料未包含行政处罚、许可有效性等外部信息。" conclusion="待外部核验" caveat="不能仅凭企业自有材料认定经营合规，需核验许可、行政处罚及监管信息。"/><Qualification status="pass" no="04" title="持续经营能力与合法还款来源" basis="第十四条第（四）项：具有持续经营能力，有合法的还款来源。" evidence="近6个月调整后经营性流入68.4万元，经营性流出49.7万元，净流入18.7万元；未出现连续两个月净流入为负。" conclusion="样本期初步支持" caveat="观察期仅6个月，且未包含完整负债、未来现金流压力和关联交易，不能等同银行偿债能力评价。"/><Qualification status="review" no="05" title="信用状况良好" basis="第十四条第（五）项：借款人信用状况良好。" evidence="当前未上传企业征信报告、法定代表人征信授权查询结果及存量贷款明细。" conclusion="无法判断" caveat="必须由持牌金融机构依法取得授权并查询；本系统不采集或推断个人征信。"/><Qualification status="pass" no="06" title="材料真实、完整、有效的承诺基础" basis="第十五条：贷款人应要求借款人承诺材料真实、完整、有效。" evidence="已提交5类材料并保留来源位置；发现4月纳税申报记录缺失及一项合同发票时间性差额。" conclusion="具备整理基础" caveat="目前材料完整度72%，应补件并由企业负责人确认真实性后再提交。"/></div>
      <div className="decision-box"><span>系统建议</span><div><h3>暂不建议按当前用途直接提交80万元流动资金贷款</h3><ol><li>将设备采购26万元与库存周转需求拆分，分别确认适用融资类型。</li><li>补充企业征信授权查询、存量融资和4月纳税申报材料。</li><li>核验企业存续状态、许可和行政处罚等外部信息。</li><li>由财务负责人确认股东借款、采购暂估及现金流口径。</li><li>整改完成后向持牌银行申请正式尽调，最终额度不得超过真实有效需求。</li></ol></div></div>
      <h3 className="product-subtitle">公开产品条件对照（非审批结果）</h3><div className="finance-table"><div className="finance-head"><span>参考产品</span><span>预核验</span><span>公开条件</span><span>当前缺口</span><span>来源</span></div><div className="finance-row"><strong>工行经营快贷<small>中国工商银行</small></strong><b>待整改</b><span>经营正常、资信良好；贷款用于合理生产经营</span><span>用途需拆分；资信待银行核验</span><a href="https://www.icbc.com.cn/ICBC/%E5%B0%8F%E5%BE%AE%E9%87%91%E8%9E%8D/%E4%BF%A1%E8%B4%B7%E4%BA%A7%E5%93%81/%E7%BD%91%E7%BB%9C%E8%9E%8D%E8%B5%84/%E7%BB%8F%E8%90%A5%E5%BF%AB%E8%B4%B7/" target="_blank" rel="noreferrer">银行官网 ↗</a></div><div className="finance-row"><strong>流动资金贷款<small>通用监管条件</small></strong><b>有条件</b><span>依法登记、用途合法、持续经营、合法还款来源、信用良好</span><span>信用与经营合规待外部核验</span><a href="https://www.nfra.gov.cn/cn/view/pages/ItemDetail.html?docId=1151066&generaltype=0&itemId=925" target="_blank" rel="noreferrer">监管原文 ↗</a></div></div>
      <div className="source-footnotes"><strong>规范来源与有效性</strong><p>[1] 国家金融监督管理总局令2024年第2号《流动资金贷款管理办法》，2024年7月1日起施行，检索日期：2026-08-07。</p><p>[2] 中国工商银行“经营快贷”产品介绍，银行官网公开信息，检索日期：2026-08-07；具体条件以申请地分支机构及申请页面为准。</p></div>
    </section>
    <section id="actions" className="report-section"><div className="report-heading"><span>06</span><div><small>ACTION PLAN</small><h2>分级行动计划</h2></div></div><div className="action-timeline"><div><span>今天</span><strong>确认个人账户转入性质</strong><p>责任人：法定代表人 + 财务负责人 · 预计 15 分钟</p><em className={resolved?"ok":"pending"}>{resolved?"已完成":"待处理"}</em></div><div><span>1个工作日</span><strong>补充4月纳税申报记录</strong><p>责任人：财务负责人 · 影响税务经营贷匹配</p><em className="pending">高优先级</em></div><div><span>3个工作日</span><strong>完善设备采购证据链</strong><p>责任人：采购 + 财务 · 补充交付与开票进度</p><em className="pending">中优先级</em></div><div><span>申请前</span><strong>与持牌银行确认产品条件</strong><p>实际额度、利率、材料格式和审批结果以银行为准</p><em className="ok">人工确认</em></div></div></section>
    <section id="method" className="report-section"><div className="report-heading"><span>07</span><div><small>METHODOLOGY</small><h2>方法、可信度与限制</h2></div></div><div className="method-grid"><div><strong>事实可信度</strong><span>高</span><p>来源于结构化样本字段，并保留原文件位置。</p></div><div><strong>计算可复现性</strong><span>高</span><p>金额、比例均由确定性公式生成。</p></div><div><strong>规则适用性</strong><span>中</span><p>会计制度由用户选择，仍需专业人员确认。</p></div><div><strong>业务解释</strong><span>待确认</span><p>企业业务实质依赖用户陈述及补充凭证。</p></div></div><div className="audit-log"><h3>关键运行记录</h3><code>14:02:11  完成 5 份材料分类与字段标准化</code><code>14:02:14  调用会计勾稽规则集 v0.3，共执行 12 条规则</code><code>14:02:15  生成 3 条异常线索，0 条违法违规结论</code><code>14:03:42  用户确认股东借款，重新计算经营性流入</code><code>14:03:44  更新产品规则匹配与报告版本</code></div></section>
    <section className="disclaimer"><strong>重要提示</strong><p>本报告为比赛虚构样本的演示结果，仅进行信息整理、会计勾稽检查、公开或模拟规则匹配和异常线索提示，不认定违法违规，不构成会计、审计、税务、法律、授信或贷款审批意见。正式应用中的会计处理须结合适用制度和真实业务实质，由企业负责人及专业人员确认。</p></section>
  </div>
}

function Qualification({status,no,title,basis,evidence,conclusion,caveat}:{status:"pass"|"fail"|"review";no:string;title:string;basis:string;evidence:string;conclusion:string;caveat:string}){const label=status==="pass"?"材料支持":status==="fail"?"不满足":"待核验";return <article className={`qualification q-${status}`}><header><span>{no}</span><h3>{title}</h3><em>{label}</em></header><div><p><b>规范条件</b>{basis}</p><p><b>企业证据</b>{evidence}</p><p><b>预核验结论</b><strong>{conclusion}</strong></p><p><b>限制与下一步</b>{caveat}</p></div></article>}

function DetailedFinding({no,level,title,fact,calc,rule,evidence,action,resolved=false}:{no:string;level:string;title:string;fact:string;calc:string;rule:string;evidence:string;action:string;resolved?:boolean}){return <article className="detailed-finding"><header><span>{no}</span><em className={resolved?"ok":"pending"}>{resolved?"已解释":`${level}关注`}</em><h3>{title}</h3></header><div className="finding-layers"><div><b>事实</b><p>{fact}</p></div><div><b>计算</b><p>{calc}</p></div><div><b>规则与边界</b><p>{rule}</p></div><div><b>证据</b><p>{evidence}</p></div></div><footer><span>建议动作</span><strong>{action}</strong></footer></article>}

function Onboarding({onComplete}:{onComplete:(name:string,role:string)=>void}) {
  const [name,setName]=useState(""); const [role,setRole]=useState("法定代表人"); const [system,setSystem]=useState("小企业会计准则"); const [agreed,setAgreed]=useState(false);
  return <main className="onboarding"><section className="welcome"><div className="brand big"><span className="brand-mark">融</span><span>融税通<small>小微融资智能管家</small></span></div><span className="eyebrow">建立你的企业工作空间</span><h1>先确认身份与核算口径，<br/>再开始材料分析。</h1><p>系统不会预设公司、替你作出会计判断，也不会把异常线索描述为违法事实。</p><div className="trust-list"><span>✓ 数据最小化与明确授权</span><span>✓ 依据来源、版本及适用范围可追溯</span><span>✓ 高风险结论必须人工确认</span></div></section><section className="setup-card"><div><span className="step-badge">01</span><h2>企业与使用人信息</h2><p>仅用于建立本次分析上下文。</p></div><label>企业名称<input value={name} onChange={e=>setName(e.target.value)} placeholder="请输入营业执照上的完整名称"/></label><label>你的身份<select value={role} onChange={e=>setRole(e.target.value)}><option>法定代表人</option><option>企业负责人</option><option>财务负责人</option><option>经授权的财税服务人员</option><option>银行普惠客户经理</option></select></label><label>适用会计制度<select value={system} onChange={e=>setSystem(e.target.value)}><option>小企业会计准则</option><option>企业会计准则</option><option>暂不确定，分析前提示确认</option></select><small>系统不会仅凭企业规模自动判定适用制度。</small></label><label className="consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>我确认有权提交相关企业材料，并同意系统仅为材料整理、会计勾稽检查和融资准备目的处理数据。</span></label><button className="primary setup-submit" disabled={!name.trim()||!agreed} onClick={()=>onComplete(name.trim(),role)}>建立企业档案 →</button><p className="form-foot">继续不代表授权贷款申请或自动报税。你可以随时删除材料和分析记录。</p></section></main>
}

function Standards(){const refs=[
  ["会计核算基本法律依据","《中华人民共和国会计法》（2024年修正）","会计资料真实、完整；会计核算以实际发生的经济业务事项为依据。","https://kjs.mof.gov.cn/zt/kjfxcgc/kjfqw/"],
  ["小企业核算口径","《小企业会计准则》财会〔2011〕17号","仅在用户确认适用时调用；系统保留原始凭证与计算口径。","https://www.mof.gov.cn/zhengwuxinxi/xinwenlianbo/beijingcaizhengxinxilianbo/201111/t20111122_609553.htm"],
  ["个人信息处理","《中华人民共和国个人信息保护法》","遵循合法、正当、必要、诚信和最小范围原则。","https://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html"],
  ["贷款业务边界","《商业银行互联网贷款管理暂行办法》","平台只做材料准备和公开规则匹配，授信与风控由持牌银行独立完成。","https://www.nfra.gov.cn/cn/view/pages/rulesDetail.html?docId=916525"],
];return <div className="content"><div className="page-intro"><div><h2>规则与依据库</h2><p>正式规则必须记录发布机关、文号、适用范围、生效状态和更新时间。</p></div><span className="verified">官方来源优先</span></div><div className="rule-principles"><div><strong>事实层</strong><span>来自用户确认的原始材料</span></div><div><strong>计算层</strong><span>公式与口径可复算</span></div><div><strong>规则层</strong><span>明确适用制度和版本</span></div><div><strong>提示层</strong><span>不确定性与人工确认</span></div></div><section className="panel standards-list">{refs.map(r=><a href={r[3]} target="_blank" rel="noreferrer" key={r[1]}><span>{r[0]}</span><div><strong>{r[1]}</strong><p>{r[2]}</p></div><b>官方原文 ↗</b></a>)}</section><section className="disclaimer"><strong>规则引擎的合规边界</strong><p>应用不会以模型生成内容替代正式准则、税收规范性文件或银行制度。涉及税种、地区、纳税人资格、会计政策选择及金融产品条件时，必须先确认适用范围；无法确认时停止自动结论，转为“信息不足”或“建议专业人员复核”。</p></section></div>}

function EvidenceChain({resolved,onResolve}:{resolved:boolean;onResolve:()=>void}){
  const chain=[
    {type:"合同",name:"设备采购合同",value:"¥260,000",state:"已提取",source:"采购合同.pdf · P3"},
    {type:"发票",name:"设备采购进项发票",value:"¥180,000",state:"存在差额",source:"进项发票.xlsx · 第 8–12 行"},
    {type:"流水",name:"对公账户付款",value:"¥180,000",state:"已勾稽",source:"银行流水.pdf · P9"},
    {type:"会计",name:"固定资产暂估入账",value:"¥260,000",state:"待确认",source:"资产负债表.xlsx · 固定资产"},
    {type:"用途",name:"新店设备采购",value:"¥800,000",state:"融资目标",source:"用户填报 · 2026-08-07"},
  ];
  return <div className="content"><div className="page-intro"><div><h2>业务证据链</h2><p>把合同、发票、流水、会计记录和融资用途连接为可核验的经营事实。</p></div><span className="verified">链路完整度 76%</span></div>
    <div className="evidence-layout"><section className="panel chain-panel"><div className="panel-title"><div><span className="section-kicker">交易链路 EC-0042</span><h3>新店设备采购</h3></div><em className="pending">1 项待解释</em></div><div className="chain-flow">{chain.map((n,i)=><div className="chain-node" key={n.type}><div className={`node-icon n${i}`}>{n.type.slice(0,1)}</div><div><span>{n.type}</span><strong>{n.name}</strong><b>{n.value}</b><small>⌕ {n.source}</small></div><em className={n.state==="已勾稽"||n.state==="已提取"?"ok":"pending"}>{n.state}</em>{i<chain.length-1&&<i>↓</i>}</div>)}</div></section>
      <section className="evidence-side"><div className="panel audit-card"><span className="section-kicker">规则核验结果</span><h3>合同与已取得发票相差 ¥80,000</h3><div className="layer-list"><div><b>事实</b><p>合同金额 260,000；已取得发票 180,000；银行已付款 180,000。</p></div><div><b>计算</b><p>260,000 − 180,000 = 80,000，差异率 30.77%。</p></div><div><b>规则</b><p>会计核算应以实际发生的经济业务事项为依据，原始凭证须经审核。</p></div><div><b>判断</b><p>信息不足，不能认定发票缺失或会计处理错误。</p></div></div></div>
      <div className="panel human-gate"><span className="section-kicker">人工确认节点</span><h3>{resolved?"业务背景已补充":"请选择差额原因"}</h3>{resolved?<div className="resolved"><span>✓</span><div><strong>剩余设备尚未交付</strong><small>状态已更新为“时间性差异”，保留后续发票补充任务。</small></div></div>:<div className="choice-grid"><button onClick={onResolve}>剩余设备尚未交付</button><button onClick={onResolve}>发票尚未取得</button><button onClick={onResolve}>合同发生变更</button><button onClick={onResolve}>交由财务人员复核</button></div>}</div></section></div>
    <section className="panel ledger"><div className="panel-title"><div><span className="section-kicker">全量链路</span><h3>经营事实登记簿</h3></div><span>共 12 条 · 3 条待确认</span></div>{[["EC-0042","设备采购","合同→发票→流水→会计","待确认"],["EC-0037","门店租赁","合同→流水→费用","已闭环"],["EC-0031","团餐销售","合同→发票→流水→收入","已闭环"],["EC-0024","股东借款","协议→流水→其他应付款","已解释"]].map(x=><div className="ledger-row" key={x[0]}><code>{x[0]}</code><strong>{x[1]}</strong><span>{x[2]}</span><em className={x[3]==="已闭环"||x[3]==="已解释"?"ok":"pending"}>{x[3]}</em><button>查看证据 →</button></div>)}</section>
  </div>
}

function Evaluation(){const metrics=[["材料分类准确率","96.7%","29 / 30"],["关键字段准确率","94.2%","486 / 516"],["异常线索召回率","92.0%","46 / 50"],["证据引用准确率","97.8%","89 / 91"],["应拒绝判断率","100%","12 / 12"],["完整任务成功率","86.7%","26 / 30"]];return <div className="content"><div className="page-intro"><div><h2>Agent 能力评测</h2><p>使用虚构且带标注的 30 套小微企业案例，所有成绩与线上真实文件分析严格分开。</p></div><span className="verified">评测集 v0.2</span></div><div className="eval-hero"><div><span>综合任务得分</span><strong>91.3</strong><small>/ 100</small></div><p>评测覆盖材料缺失、主体不一致、金额差异、时间顺序、个人转账、重复流水及规则适用不确定等场景。</p></div><div className="eval-grid">{metrics.map(m=><div className="metric-card" key={m[0]}><span>{m[0]}</span><strong>{m[1]}</strong><small>{m[2]} 个样本判断正确</small><div><i style={{width:m[1]}}/></div></div>)}</div><section className="panel case-table"><div className="panel-title"><div><span className="section-kicker">失败案例复盘</span><h3>系统仍然会错在哪里</h3></div><span>最近运行：2026-08-07</span></div>{[["CASE-018","扫描件表格错位","字段抽取","进项税额与价税合计列错位","转人工确认"],["CASE-023","相似企业名称","证据匹配","把关联公司付款匹配到本企业合同","已增加主体强校验"],["CASE-029","合同补充协议","金额勾稽","未读取补充协议中的调价条款","待优化文档关联"]].map(x=><div className="case-row" key={x[0]}><code>{x[0]}</code><strong>{x[1]}</strong><span>{x[2]}</span><p>{x[3]}</p><em>{x[4]}</em></div>)}</section><section className="disclaimer"><strong>评测说明</strong><p>以上为比赛原型的目标评测展示结构，当前数值使用标注样本的模拟结果，用于说明评测方法，不代表已在生产环境或真实企业数据上达到相同水平。正式提交前必须由可复现测试脚本生成并保留运行日志。</p></section></div>}
