"use client";

import { useMemo, useRef, useState } from "react";

type View = "overview" | "materials" | "agent" | "products" | "report";

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
  const [view, setView] = useState<View>("overview");
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [files, setFiles] = useState(5);
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
    setView("agent");
    setRunning(true);
    setComplete(false);
    window.setTimeout(() => { setRunning(false); setComplete(true); }, 2300);
  }

  const nav: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "融资体检", icon: "⌂" },
    { id: "materials", label: "材料中心", icon: "▤" },
    { id: "agent", label: "Agent 工作台", icon: "✦" },
    { id: "products", label: "产品匹配", icon: "◈" },
    { id: "report", label: "准备度报告", icon: "▥" },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">融</span><span>融税通<small>小微融资智能管家</small></span></div>
        <nav>{nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "materials" && <b>{files}</b>}</button>)}</nav>
        <div className="side-note"><span>数据保护</span><strong>演示数据已脱敏</strong><p>分析仅作辅助参考，不构成税务或授信意见。</p></div>
        <div className="profile"><span>杭</span><div><strong>杭州青禾餐饮</strong><small>企业管理员</small></div><i>···</i></div>
      </aside>

      <section className="workspace">
        <header><div><span className="eyebrow">2026 GOAI · AI + 金融</span><h1>{view === "overview" ? "融资准备度体检" : nav.find(n => n.id === view)?.label}</h1></div><div className="header-actions"><button className="ghost">操作日志</button><button className="primary" onClick={runCheck}>✦ 运行 Agent 体检</button></div></header>

        {view === "overview" && <Overview readiness={readiness} complete={complete} runCheck={runCheck} setView={setView} />}
        {view === "materials" && <Materials files={files} onUpload={() => fileRef.current?.click()} />}
        {view === "agent" && <AgentView running={running} complete={complete} resolved={resolved} steps={steps} onResolve={() => setResolved(true)} />}
        {view === "products" && <Products resolved={resolved} />}
        {view === "report" && <Report readiness={readiness} resolved={resolved} />}
      </section>

      <input ref={fileRef} className="hidden" type="file" multiple onChange={e => { const n = e.target.files?.length || 0; setFiles(v => v + n); }} />
    </main>
  );
}

function Overview({ readiness, complete, runCheck, setView }: { readiness: number; complete: boolean; runCheck: () => void; setView: (v: View) => void }) {
  return <div className="content">
    <section className="hero-card">
      <div className="hero-copy"><span className="status-pill"><i /> 企业档案已建立</span><h2>融资前，先把企业经营<br/>情况讲清楚。</h2><p>自动核验发票、流水与财务材料，提前发现需要解释的问题，准备一份银行看得懂的融资材料包。</p><div className="hero-actions"><button className="primary large" onClick={runCheck}>✦ 开始智能体检</button><button className="text-button" onClick={() => setView("materials")}>查看已上传材料 →</button></div></div>
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

function Materials({ files, onUpload }: { files: number; onUpload: () => void }) {
  return <div className="content"><div className="page-intro"><div><h2>企业材料中心</h2><p>上传材料后，系统会自动分类、抽取关键字段并等待你的确认。</p></div><button className="primary" onClick={onUpload}>＋ 上传新材料</button></div>
    <section className="upload-zone" onClick={onUpload}><span>⇧</span><strong>拖入发票、流水、执照或财务报表</strong><small>支持 PDF、JPG、PNG、XLSX · 单个文件不超过 20MB</small></section>
    <section className="panel table-panel"><div className="panel-title"><div><span className="section-kicker">已上传 {files} 份</span><h3>材料识别结果</h3></div><span className="success-text">● 敏感字段已遮罩</span></div><div className="doc-table"><div className="table-head"><span>材料名称</span><span>类别</span><span>识别摘要</span><span>核验状态</span></div>{documents.map((d,i)=><div className="table-row" key={d.name}><span><i className="file-icon">{i===1?"X":"P"}</i><b>{d.name}</b></span><span>{d.type}</span><span>{d.meta}</span><span><em className={d.state.includes("已核验")?"ok":d.state.includes("缺失")?"bad":"pending"}>{d.state}</em></span></div>)}</div></section>
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

function Report({readiness,resolved}:{readiness:number;resolved:boolean}) { return <div className="content"><div className="page-intro"><div><h2>小微企业融资准备度报告</h2><p>报告编号 RST-2026-0807-001 · 生成于 2026-08-07</p></div><button className="primary" onClick={()=>window.print()}>⇩ 导出 PDF 报告</button></div><section className="report-cover"><div><span className="status-pill"><i/> 分析已完成</span><h2>杭州青禾餐饮管理有限公司</h2><p>融资目标：80 万元 · 设备采购与库存补充 · 期限 24 个月</p></div><div className="report-score"><strong>{readiness}</strong><span>融资准备度</span></div></section><div className="report-grid"><section className="panel"><span className="section-kicker">结论摘要</span><h3>材料基础较好，仍有 {resolved?"2":"3"} 项待处理</h3><p className="report-text">企业经营时间、现金流稳定性符合多数模拟产品的基础规则。建议优先补充 4 月纳税申报记录，并核对采购合同与发票之间的 8 万元差额。</p><div className="report-tags"><span>现金流良好</span><span>客户集中度较高</span><span>纳税材料待补</span></div></section><section className="panel"><span className="section-kicker">行动清单</span><h3>下一步建议</h3><ol><li>补充 4 月纳税申报记录</li><li>提供第一大客户长期合作合同</li><li>解释采购合同与发票金额差异</li><li>向银行确认贷款用途材料格式</li></ol></section></div><section className="disclaimer"><strong>重要提示</strong><p>本报告仅基于用户提供的模拟材料进行信息整理、规则匹配和风险线索提示，不构成税务、法律、授信或贷款审批意见。异常线索不代表违规事实，实际处理应由企业、专业财税人员及持牌金融机构确认。</p></section></div> }
