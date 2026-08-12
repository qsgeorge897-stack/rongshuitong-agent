"use client";

import { useMemo, useRef, useState } from "react";
import { parseRealFile, summarizeFiles, type ParsedFile, type RealAnalysis } from "./file-parser";

type View = "overview" | "demand" | "materials" | "precheck" | "actions" | "products" | "application" | "standards" | "audit";
type Result = "符合" | "部分符合" | "不符合" | "无法判断";

type Demand = {
  amount: number;
  purpose: string;
  term: number;
  loanType: "流动资金贷款" | "固定资产贷款" | "续贷" | "暂不确定";
  city: string;
  industry: string;
  urgency: string;
  existingDebt: number;
  guarantee: string;
};

type Check = {
  id: string;
  title: string;
  result: Result;
  conclusion: string;
  evidence: string;
  rule: string;
  confidence: "高" | "中" | "待补证";
};

const defaultDemand: Demand = {
  amount: 80,
  purpose: "采购原材料并补充日常经营周转",
  term: 24,
  loanType: "流动资金贷款",
  city: "杭州市",
  industry: "餐饮服务",
  urgency: "30天内",
  existingDebt: 20,
  guarantee: "暂无抵押物，可接受政策性担保",
};

const demoFiles: ParsedFile[] = [
  { id: "demo-license", name: "演示样本_营业执照.jpg", kind: "营业执照", status: "已解析", rows: 1, text: "虚构样本，仅用于比赛演示", fields: { "统一社会信用代码": "91330100DEMO000001", "OCR置信度": 96.8 }, evidence: ["样本第1页 · 企业名称及统一社会信用代码"] },
  { id: "demo-flow", name: "演示样本_近6个月经营流水.xlsx", kind: "银行流水", status: "已解析", rows: 427, text: "虚构样本，仅用于比赛演示", fields: { "经营流入": 864320, "经营流出": 691200, "数据行数": 427 }, evidence: ["工作表：交易明细 · 427行"] },
  { id: "demo-invoice", name: "演示样本_销项发票.xlsx", kind: "发票明细", status: "已解析", rows: 48, text: "虚构样本，仅用于比赛演示", fields: { "发票价税合计": 521340, "税额合计": 15184, "数据行数": 48 }, evidence: ["工作表：销项明细 · 48行"] },
  { id: "demo-report", name: "演示样本_利润表.xlsx", kind: "财务报表", status: "已解析", rows: 12, text: "虚构样本，仅用于比赛演示", fields: { "数据行数": 12 }, evidence: ["工作表：利润表 · 2026年1—6月"] },
  { id: "demo-tax", name: "演示样本_纳税申报表.pdf", kind: "纳税资料", status: "需确认", rows: 8, text: "虚构样本，仅用于比赛演示", fields: { "PDF页数": 8 }, evidence: ["第1—8页 · 缺少4月所属期申报记录"], error: "缺少4月所属期申报记录" },
];

const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "融资任务", icon: "⌂" },
  { id: "demand", label: "融资需求", icon: "◎" },
  { id: "materials", label: "材料与核对", icon: "▤" },
  { id: "precheck", label: "条件预审", icon: "⌕" },
  { id: "actions", label: "整改清单", icon: "✓" },
  { id: "products", label: "融资路径", icon: "◇" },
  { id: "application", label: "申请包", icon: "▥" },
  { id: "standards", label: "规则依据", icon: "§" },
];

const currency = (value: number) => value ? `¥${Math.round(value).toLocaleString("zh-CN")}` : "待识别";

function getAssessment(data: RealAnalysis | null, demand: Demand, confirmed: Set<string>): Check[] {
  const kinds = new Set(data?.kinds || []);
  const has = (kind: ParsedFile["kind"]) => kinds.has(kind);
  const useConflict = demand.loanType === "流动资金贷款" && /设备|装修|厂房|固定资产/.test(demand.purpose);
  const cashKnown = Boolean(data && data.income > 0 && data.expense > 0);
  const allConfirmed = Boolean(data && data.files.filter(file => file.status !== "失败").every(file => confirmed.has(file.id)));
  const source = (kind: ParsedFile["kind"]) => data?.files.find(file => file.kind === kind)?.name || "尚未提交对应材料";

  return [
    {
      id: "entity",
      title: "主体资格",
      result: has("营业执照") ? "部分符合" : "无法判断",
      conclusion: has("营业执照") ? "已识别主体材料，登记状态仍需通过官方渠道或银行核验。" : "缺少营业执照，无法核验企业主体。",
      evidence: source("营业执照"),
      rule: "《流动资金贷款管理办法》第十四条（一）",
      confidence: has("营业执照") ? "中" : "待补证",
    },
    {
      id: "operation",
      title: "持续经营",
      result: has("银行流水") && (has("发票明细") || has("财务报表")) ? "部分符合" : "无法判断",
      conclusion: has("银行流水") && (has("发票明细") || has("财务报表")) ? "已形成流水与经营材料证据，但仍需核验覆盖期间和业务真实性。" : "缺少连续流水或经营佐证材料。",
      evidence: `${source("银行流水")}；${has("发票明细") ? source("发票明细") : source("财务报表")}`,
      rule: "《流动资金贷款管理办法》第十四条（四）",
      confidence: has("银行流水") ? "中" : "待补证",
    },
    {
      id: "repayment",
      title: "还款来源",
      result: cashKnown ? (data!.netCash > 0 ? "部分符合" : "不符合") : "无法判断",
      conclusion: cashKnown ? (data!.netCash > 0 ? `识别期经营净流入为 ${currency(data!.netCash)}，尚需结合期间、现有负债和还款方式复核。` : "识别期经营现金净流量为负，暂未形成稳定还款来源证据。") : "尚未从材料中同时识别经营流入和流出。",
      evidence: cashKnown ? `经营流入 ${currency(data!.income)}；经营流出 ${currency(data!.expense)}` : "银行流水字段待补充或确认",
      rule: "《流动资金贷款管理办法》第十四条（四）",
      confidence: cashKnown ? "中" : "待补证",
    },
    {
      id: "purpose",
      title: "贷款用途",
      result: !demand.purpose ? "无法判断" : useConflict ? "不符合" : "部分符合",
      conclusion: !demand.purpose ? "尚未填写资金用途。" : useConflict ? "当前用途包含固定资产事项，与流动资金贷款用途存在冲突，建议拆分融资需求。" : "用途描述明确，但仍需合同、订单或预算证明资金需求。",
      evidence: demand.purpose || "未填写",
      rule: "《流动资金贷款管理办法》第九条、第十四条（二）",
      confidence: demand.purpose ? "中" : "待补证",
    },
    {
      id: "tax",
      title: "纳税与开票",
      result: has("纳税资料") && has("发票明细") ? "部分符合" : "无法判断",
      conclusion: has("纳税资料") && has("发票明细") ? `已识别纳税和开票材料，发票价税合计 ${currency(data?.invoiceTotal || 0)}，需与申报期逐月勾稽。` : "纳税申报或发票材料不完整。",
      evidence: `${source("纳税资料")}；${source("发票明细")}`,
      rule: "贷款人尽职调查与材料真实性要求",
      confidence: has("纳税资料") && has("发票明细") ? "中" : "待补证",
    },
    {
      id: "truth",
      title: "材料真实性",
      result: allConfirmed ? "部分符合" : "无法判断",
      conclusion: allConfirmed ? "企业已确认机器识别结果，但真实性仍须由原件、授权数据或金融机构进一步核验。" : "存在尚未由企业确认的识别结果，系统不据此作资格结论。",
      evidence: data ? `${confirmed.size}/${data.files.filter(file => file.status !== "失败").length} 份识别结果已确认` : "尚无可核验材料",
      rule: "《流动资金贷款管理办法》第十五条、第十六条",
      confidence: allConfirmed ? "中" : "待补证",
    },
  ];
}

function overall(checks: Check[]) {
  if (checks.some(check => check.result === "不符合")) return { label: "存在关键障碍", tone: "danger", note: "先完成整改，再向机构提交" };
  if (checks.filter(check => check.result === "无法判断").length >= 3) return { label: "证据尚不充分", tone: "neutral", note: "补充材料后才能形成预审结论" };
  return { label: "可进入人工复核", tone: "warning", note: "不代表银行授信或审批结果" };
}

function buildTasks(checks: Check[]) {
  return checks.filter(check => check.result !== "符合").map(check => ({
    id: check.id,
    title: check.result === "不符合" ? `处理：${check.title}` : `补强：${check.title}`,
    why: check.conclusion,
    action: check.id === "entity" ? "补充营业执照原件并通过企业信息公示渠道核验状态" : check.id === "operation" ? "补充近6—12个月对公流水、发票或财务报表" : check.id === "repayment" ? "确认流水收支字段，补充现有负债和还款计划" : check.id === "purpose" ? "补充采购合同、订单或预算；如含设备采购，拆分贷款类型" : check.id === "tax" ? "补齐所属期纳税申报表并逐月核对开票数据" : "逐份对照原件确认识别结果和异常字段",
    owner: check.id === "tax" ? "企业 / 会计" : "企业",
  }));
}

export default function Home() {
  const [onboarded, setOnboarded] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("法定代表人");
  const [view, setView] = useState<View>("overview");
  const [demand, setDemand] = useState(defaultDemand);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [analysis, setAnalysis] = useState<RealAnalysis | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeFiles = demoMode ? demoFiles : parsedFiles;
  const activeAnalysis = useMemo(() => demoMode ? summarizeFiles(demoFiles) : analysis, [demoMode, analysis]);
  const checks = useMemo(() => getAssessment(activeAnalysis, demand, confirmed), [activeAnalysis, demand, confirmed]);
  const status = overall(checks);
  const tasks = buildTasks(checks);
  const missingCount = checks.filter(check => check.result === "无法判断").length;

  function addLog(message: string) {
    setLogs(current => [`${new Date().toLocaleString("zh-CN")} · ${message}`, ...current].slice(0, 30));
  }

  function loadDemo() {
    setDemoMode(true);
    setAnalysis(null);
    setConfirmed(new Set(demoFiles.filter(file => file.status === "已解析").map(file => file.id)));
    addLog("载入脱敏虚构演示样本");
  }

  function analyzeReal() {
    const next = summarizeFiles(parsedFiles);
    setAnalysis(next);
    setDemoMode(false);
    setView("precheck");
    addLog(`生成真实材料预审，共 ${parsedFiles.length} 份文件`);
  }

  function toggleConfirm(id: string) {
    setConfirmed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    addLog("更新一份材料的人工确认状态");
  }

  function toggleTask(id: string) {
    setCompletedTasks(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    addLog("更新融资整改任务状态");
  }

  function downloadEvidence() {
    const payload = { reportType: "融税通融资准备底稿", generatedAt: new Date().toISOString(), companyName, demand, conclusion: status.label, checks, materials: activeFiles.map(file => ({ name: file.name, kind: file.kind, status: file.status, fields: file.fields, evidence: file.evidence })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${companyName || "企业"}_融资准备底稿.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addLog("导出结构化融资准备底稿");
  }

  if (!onboarded) return <Onboarding onComplete={(name, selectedRole) => { setCompanyName(name); setRole(selectedRole); setOnboarded(true); setLogs([`${new Date().toLocaleString("zh-CN")} · 创建企业融资准备档案`]); }} />;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">融</span><span>融税通<small>融资准备与协同 Agent</small></span></div>
      <nav>{nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "actions" && tasks.length > completedTasks.size && <b>{tasks.length - completedTasks.size}</b>}</button>)}</nav>
      <div className="side-note"><span>结论边界</span><strong>辅助准备，不替代审批</strong><p>所有结论区分已验证事实、机器识别、用户陈述与待核验事项。</p></div>
      <div className="profile"><span>{companyName.slice(0, 1)}</span><div><strong>{companyName}</strong><small>{role}</small></div></div>
    </aside>

    <section className="workspace">
      <header><div><span className="eyebrow">GOAI · AI + 金融</span><h1>{nav.find(item => item.id === view)?.label || "操作日志"}</h1></div><div className="header-actions"><button className="ghost" onClick={() => setView("audit")}>操作日志</button><button className="primary" onClick={() => setView(activeAnalysis ? "precheck" : "materials")}>{activeAnalysis ? "查看最新预审 →" : "＋ 提交材料"}</button></div></header>

      {view === "overview" && <Overview companyName={companyName} demand={demand} status={status} missingCount={missingCount} tasks={tasks.length} done={completedTasks.size} analysis={activeAnalysis} setView={setView} />}
      {view === "demand" && <DemandView demand={demand} onChange={value => { setDemand(value); addLog("更新融资需求"); }} setView={setView} />}
      {view === "materials" && <Materials files={activeFiles} demoMode={demoMode} parsing={parsing} confirmed={confirmed} onConfirm={toggleConfirm} onUpload={() => fileRef.current?.click()} onDemo={loadDemo} onAnalyze={demoMode ? () => { setView("precheck"); addLog("运行演示样本预审"); } : analyzeReal} />}
      {view === "precheck" && <Precheck checks={checks} status={status} hasData={Boolean(activeAnalysis)} setView={setView} />}
      {view === "actions" && <Actions tasks={tasks} completed={completedTasks} onToggle={toggleTask} />}
      {view === "products" && <Products demand={demand} checks={checks} />}
      {view === "application" && <ApplicationPack companyName={companyName} demand={demand} data={activeAnalysis} checks={checks} status={status} demoMode={demoMode} onPrint={() => window.print()} onDownload={downloadEvidence} setView={setView} />}
      {view === "standards" && <Standards />}
      {view === "audit" && <Audit logs={logs} />}
    </section>

    <input ref={fileRef} className="hidden" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.txt" onChange={async event => {
      const selected = Array.from(event.target.files || []);
      if (!selected.length) return;
      setParsing(true);
      setDemoMode(false);
      setAnalysis(null);
      setView("materials");
      const placeholders = selected.map(file => ({ id: `${Date.now()}-${file.name}`, name: file.name, kind: "其他" as const, status: "解析中" as const, rows: 0, text: "", fields: {}, evidence: [] }));
      setParsedFiles(current => [...current, ...placeholders]);
      const results: ParsedFile[] = [];
      for (const file of selected) results.push(await parseRealFile(file));
      setParsedFiles(current => [...current.filter(old => !placeholders.some(item => item.name === old.name)), ...results]);
      setParsing(false);
      addLog(`本地解析 ${selected.length} 份真实文件`);
      event.target.value = "";
    }} />
  </main>;
}

function Onboarding({ onComplete }: { onComplete: (name: string, role: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("法定代表人");
  const [consent, setConsent] = useState(false);
  return <main className="onboarding"><section className="welcome"><div className="brand big"><span className="brand-mark">融</span><span>融税通<small>融资准备与协同 Agent</small></span></div><span className="eyebrow">让经营事实成为可验证的融资证据</span><h1>不是替企业打分，<br />而是陪企业做好融资准备。</h1><p>从融资需求、材料核对、资格预审到整改和申请包，让小微企业知道缺什么、为什么，以及下一步该做什么。</p><div className="trust-list"><span>✓ 真实文件在当前浏览器本地解析</span><span>✓ 机器识别结果必须由企业确认</span><span>✓ 不承诺贷款额度、利率或审批结果</span></div></section><section className="setup-card"><span className="step-badge">建立企业档案</span><h2>这次为哪家企业准备融资？</h2><p>请填写真实名称，或使用“演示企业”体验虚构样本。</p><label>企业名称<input value={name} onChange={event => setName(event.target.value)} placeholder="例如：杭州青禾餐饮管理有限公司" /></label><label>你的身份<select value={role} onChange={event => setRole(event.target.value)}><option>法定代表人</option><option>企业负责人</option><option>财务负责人</option><option>授权经办人</option><option>会计服务人员</option></select></label><label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>我确认已获得企业授权，并同意系统仅为融资准备目的处理所提交材料。</span></label><button className="primary setup-submit" disabled={!name.trim() || !consent} onClick={() => onComplete(name.trim(), role)}>创建融资任务 →</button><p className="form-foot">平台仅提供辅助整理与规则预核验，不构成会计、税务、法律或授信意见。</p></section></main>;
}

function Overview({ companyName, demand, status, missingCount, tasks, done, analysis, setView }: { companyName: string; demand: Demand; status: { label: string; tone: string; note: string }; missingCount: number; tasks: number; done: number; analysis: RealAnalysis | null; setView: (view: View) => void }) {
  const stage = !analysis ? 1 : missingCount >= 3 ? 2 : tasks > done ? 3 : 4;
  return <div className="content"><section className="mission-card"><div><span className="status-pill"><i /> {companyName} · 融资任务进行中</span><h2>目标不是得到一个分数，<br />而是形成可提交的融资申请。</h2><p>{demand.loanType} · {demand.amount}万元 · {demand.term}个月 · {demand.purpose}</p><div className="hero-actions"><button className="primary large" onClick={() => setView(!analysis ? "materials" : "precheck")}>{!analysis ? "提交材料并开始 →" : "查看证据化预审 →"}</button><button className="text-button" onClick={() => setView("demand")}>修改融资需求</button></div></div><div className={`outcome ${status.tone}`}><span>当前结论</span><strong>{analysis ? status.label : "等待材料"}</strong><p>{analysis ? status.note : "系统不会在没有证据时生成资格结论"}</p></div></section>
    <section className="journey"><div className="section-head"><div><span className="section-kicker">融资闭环</span><h3>从原始材料到机构可读申请包</h3></div><span>当前阶段 {stage}/4</span></div><div className="stage-grid">{[{ n: 1, t: "需求确认", d: `${demand.amount}万元 · ${demand.loanType}` }, { n: 2, t: "证据核验", d: analysis ? `${analysis.files.length}份材料已进入预审` : "等待上传真实或样本材料" }, { n: 3, t: "问题整改", d: `${Math.max(tasks - done, 0)}项任务待完成` }, { n: 4, t: "申请准备", d: analysis ? "申请包可预览，待人工复核" : "完成预审后生成" }].map(item => <article className={stage >= item.n ? "reached" : ""} key={item.n}><span>{stage > item.n ? "✓" : item.n}</span><strong>{item.t}</strong><small>{item.d}</small></article>)}</div></section>
    <div className="metric-grid"><Metric label="融资用途" value={demand.loanType} note={demand.purpose} /><Metric label="材料状态" value={analysis ? `${analysis.files.length}份已解析` : "尚未提交"} note={analysis ? `${analysis.uncertainFiles}份仍需人工确认` : "支持真实材料和脱敏样本"} /><Metric label="预审缺口" value={analysis ? `${missingCount}项无法判断` : "等待分析"} note="无法判断不会被包装为通过" /><Metric label="整改进度" value={`${done}/${tasks}`} note="每项任务都有原因、动作和责任人" /></div>
    <section className="panel next-card"><div><span className="section-kicker">下一步</span><h3>{!analysis ? "提交营业执照、流水、发票和纳税材料" : tasks > done ? "先处理影响融资的证据缺口" : "导出申请包并交由专业人员复核"}</h3><p>{!analysis ? "你也可以载入明确标记的虚构样本，方便评委完整体验。" : "系统会随着材料确认和整改进度自动更新结论，不覆盖原始证据。"}</p></div><button className="primary" onClick={() => setView(!analysis ? "materials" : tasks > done ? "actions" : "application")}>继续办理 →</button></section>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }

function DemandView({ demand, onChange, setView }: { demand: Demand; onChange: (demand: Demand) => void; setView: (view: View) => void }) {
  const update = <K extends keyof Demand>(key: K, value: Demand[K]) => onChange({ ...demand, [key]: value });
  return <div className="content narrow"><div className="page-intro"><div><h2>先说清楚为什么需要这笔钱</h2><p>融资类型、金额、用途和还款安排决定后续材料与产品规则。</p></div><span className="verified">需求已保存</span></div><section className="panel form-panel"><div className="form-grid"><label>融资金额（万元）<input type="number" min="1" value={demand.amount} onChange={event => update("amount", Number(event.target.value))} /></label><label>预计期限（月）<input type="number" min="1" value={demand.term} onChange={event => update("term", Number(event.target.value))} /></label><label>融资类型<select value={demand.loanType} onChange={event => update("loanType", event.target.value as Demand["loanType"])}><option>流动资金贷款</option><option>固定资产贷款</option><option>续贷</option><option>暂不确定</option></select></label><label>资金需求时间<select value={demand.urgency} onChange={event => update("urgency", event.target.value)}><option>7天内</option><option>30天内</option><option>1—3个月</option><option>暂无明确时间</option></select></label><label>所在地区<input value={demand.city} onChange={event => update("city", event.target.value)} /></label><label>所属行业<input value={demand.industry} onChange={event => update("industry", event.target.value)} /></label><label className="span-2">具体资金用途<textarea value={demand.purpose} onChange={event => update("purpose", event.target.value)} placeholder="例如：采购原材料、支付房租工资、设备采购……" /></label><label>现有有息负债（万元）<input type="number" min="0" value={demand.existingDebt} onChange={event => update("existingDebt", Number(event.target.value))} /></label><label>担保条件<input value={demand.guarantee} onChange={event => update("guarantee", event.target.value)} /></label></div><div className="purpose-note"><strong>系统会据此选择规则，不会自动扩大融资用途。</strong><p>流动资金贷款主要用于日常经营周转；设备、厂房等固定资产需求应单独识别，并由金融机构确认适用产品。</p></div><button className="primary" onClick={() => setView("materials")}>保存并准备材料 →</button></section></div>;
}

function Materials({ files, demoMode, parsing, confirmed, onConfirm, onUpload, onDemo, onAnalyze }: { files: ParsedFile[]; demoMode: boolean; parsing: boolean; confirmed: Set<string>; onConfirm: (id: string) => void; onUpload: () => void; onDemo: () => void; onAnalyze: () => void }) {
  return <div className="content">
    <div className="page-intro"><div><h2>材料识别后，必须由企业确认</h2><p>系统保留文件、字段和证据位置；无法识别的内容明确标记为待确认。</p></div><button className="primary" onClick={onUpload}>＋ 上传真实材料</button></div>
    <button type="button" className="upload-zone" onClick={onUpload}><span>⇧</span><strong>选择营业执照、流水、发票、报表、申报表和合同</strong><small>支持 PDF、图片、Excel、CSV · 当前版本在浏览器本地解析，不上传文件原文</small></button>
    <div className="demo-switch"><div><strong>评委体验模式</strong><small>载入明确标记的虚构脱敏样本，完整展示预审、整改和申请包。</small></div><button className="ghost" onClick={onDemo}>载入演示样本</button></div>
    <section className="panel"><div className="section-head"><div><span className="section-kicker">{demoMode ? "虚构演示样本" : "真实文件"}</span><h3>已识别 {files.length} 份材料</h3></div><span className="local-badge">● 本地处理</span></div>{!files.length ? <div className="empty-state"><strong>尚未提交材料</strong><p>系统不会使用预设公司数据代替你的真实材料。</p></div> : <div className="material-list">{files.map(file => <article key={file.id}><div className="file-title"><span className="file-icon">{file.name.split(".").pop()?.slice(0, 1).toUpperCase()}</span><div><strong>{file.name}</strong><small>{file.kind} · {file.rows ? `${file.rows}页/行` : "等待读取"}</small></div><em className={file.status === "已解析" ? "ok" : file.status === "失败" ? "bad" : "pending"}>{file.status}</em></div><div className="field-grid">{Object.entries(file.fields).slice(0, 6).map(([key, value]) => <span key={key}><b>{key}</b>{typeof value === "number" && /流入|流出|合计|税额/.test(key) ? currency(value) : String(value)}</span>)}</div>{file.evidence[0] && <p className="evidence-line">证据定位：{file.evidence[0]}</p>}{file.error && <p className="parse-warning">{file.error}</p>}{file.status !== "失败" && <label className="confirm-row"><input type="checkbox" checked={confirmed.has(file.id)} onChange={() => onConfirm(file.id)} />我已对照原件确认本文件的识别结果</label>}</article>)}</div>}</section>
    {files.length > 0 && <div className="analysis-cta"><div><strong>{parsing ? "正在本地解析文件……" : "材料不会自动变成融资资格结论"}</strong><small>预审会把已确认、待核验、缺失和冲突分开显示。</small></div><button className="primary" disabled={parsing || files.every(file => file.status === "失败")} onClick={onAnalyze}>生成证据化预审 →</button></div>}
  </div>;
}

function Precheck({ checks, status, hasData, setView }: { checks: Check[]; status: { label: string; tone: string; note: string }; hasData: boolean; setView: (view: View) => void }) {
  if (!hasData) return <Empty title="尚未形成预审" text="请先上传真实材料或载入演示样本。" action="前往材料中心" onClick={() => setView("materials")} />;
  return <div className="content"><section className={`decision-banner ${status.tone}`}><div><span>融资条件预核验</span><h2>{status.label}</h2><p>{status.note}</p></div><button onClick={() => setView("actions")}>查看整改清单 →</button></section><div className="check-list">{checks.map(check => <article className="panel check-card" key={check.id}><div className="check-head"><div><span className={`result result-${check.result}`}>{check.result}</span><h3>{check.title}</h3></div><span className="confidence">证据置信度：{check.confidence}</span></div><p>{check.conclusion}</p><div className="check-meta"><span><b>证据</b>{check.evidence}</span><span><b>规则</b>{check.rule}</span></div></article>)}</div><div className="boundary"><strong>结论边界</strong><p>本页只判断当前材料是否足以进入人工复核，不查询征信、不核验工商实时状态，也不替代银行尽职调查和授信审批。</p></div></div>;
}

function Actions({ tasks, completed, onToggle }: { tasks: ReturnType<typeof buildTasks>; completed: Set<string>; onToggle: (id: string) => void }) {
  return <div className="content"><div className="page-intro"><div><h2>把“暂时不能判断”变成可执行任务</h2><p>每一项都说明原因、动作、责任人和完成状态。</p></div><span className="verified">已完成 {completed.size}/{tasks.length}</span></div><div className="task-list">{tasks.map((task, index) => <article className={completed.has(task.id) ? "task done" : "task"} key={task.id}><button className="task-check" onClick={() => onToggle(task.id)}>{completed.has(task.id) ? "✓" : index + 1}</button><div><div className="task-title"><strong>{task.title}</strong><span>{task.owner}</span></div><p>{task.why}</p><div className="task-action"><b>建议动作</b>{task.action}</div></div><button className="ghost" onClick={() => onToggle(task.id)}>{completed.has(task.id) ? "重新打开" : "标记完成"}</button></article>)}</div><div className="coordination-card"><span>机构协同接口（试点版）</span><h3>对暂不符合条件的企业，不止给出“拒绝”</h3><p>可由企业、会计、融资服务平台、担保机构和银行围绕同一问题清单补证、反馈和复核，保留每次更新记录。</p><div><span>企业补证</span><i>→</i><span>会计复核</span><i>→</i><span>机构反馈</span><i>→</i><span>更新申请包</span></div></div></div>;
}

function Products({ demand, checks }: { demand: Demand; checks: Check[] }) {
  const check = (id: string) => checks.find(item => item.id === id)?.result;
  const products = [
    { name: "经营周转融资路径", institution: "持牌银行产品库 · 待接入", type: "流动资金贷款", condition: demand.loanType === "流动资金贷款" && check("purpose") !== "不符合" && check("operation") !== "无法判断", missing: check("purpose") === "不符合" ? "用途与贷款类型冲突" : check("operation") === "无法判断" ? "缺少持续经营证据" : "等待银行人工复核", materials: "流水、发票、经营合同、用途证明" },
    { name: "纳税信用融资路径", institution: "持牌银行产品库 · 待接入", type: "信用经营贷", condition: check("tax") === "部分符合" && check("truth") === "部分符合", missing: check("tax") === "无法判断" ? "缺少纳税或发票材料" : "纳税数据需逐月勾稽", materials: "纳税申报、开票明细、授权书" },
    { name: "政府性融资担保路径", institution: "地方担保与协调机制 · 待接入", type: "银担合作", condition: /担保/.test(demand.guarantee) && check("entity") !== "无法判断", missing: check("entity") === "无法判断" ? "缺少企业主体证据" : "需确认当地准入和担保费率", materials: "企业基础材料、融资需求、还款来源说明" },
  ];
  return <div className="content"><div className="page-intro"><div><h2>先匹配融资路径，再匹配具体产品</h2><p>只展示规则条件，不使用不可解释的“适配百分比”。</p></div><span className="verified">规则基准日 2026-08-13</span></div><div className="notice">当前版本展示规则路径与待接入占位，不展示虚构利率或承诺额度。具体产品须接入持牌机构公开规则，并记录来源和最后核验日期。</div><div className="path-grid">{products.map(product => <article className="product" key={product.name}><div className="product-top"><span>{product.type}</span><em className={product.condition ? "ok" : "pending"}>{product.condition ? "可进入人工匹配" : "暂不进入匹配"}</em></div><h3>{product.name}</h3><small>{product.institution}</small><div className="rule-row"><b>当前判断</b><p>{product.missing}</p></div><div className="rule-row"><b>核心材料</b><p>{product.materials}</p></div><button>查看条件证据 →</button></article>)}</div><section className="panel product-policy"><h3>真实产品库必须包含</h3><div>{["适用地区与企业类型", "贷款用途与禁入条件", "金额、期限和还款方式", "抵押、担保及费用", "材料清单与官方来源", "最后核验日期和规则版本"].map(item => <span key={item}>✓ {item}</span>)}</div></section></div>;
}

function ApplicationPack({ companyName, demand, data, checks, status, demoMode, onPrint, onDownload, setView }: { companyName: string; demand: Demand; data: RealAnalysis | null; checks: Check[]; status: { label: string; tone: string; note: string }; demoMode: boolean; onPrint: () => void; onDownload: () => void; setView: (view: View) => void }) {
  if (!data) return <Empty title="尚未生成融资申请包" text="完成材料解析和证据化预审后，系统才会生成申请包。" action="前往材料中心" onClick={() => setView("materials")} />;
  return <div className="content report-page"><div className="page-intro no-print"><div><h2>融资申请准备包</h2><p>企业版摘要、机构版申请资料和核验底稿使用同一套证据。</p></div><div className="button-row"><button className="ghost" onClick={onDownload}>导出结构化底稿</button><button className="primary" onClick={onPrint}>导出/打印 PDF</button></div></div><section className="report-cover"><div><span className="status-pill"><i /> {demoMode ? "虚构样本模式" : "真实材料模式"} · {new Date().toLocaleDateString("zh-CN")}</span><h2>{companyName}</h2><p>{demand.city} · {demand.industry}</p><div className="cover-goal"><span>融资需求</span><strong>{demand.amount}万元 · {demand.term}个月 · {demand.loanType}</strong><small>{demand.purpose}</small></div></div><div className={`cover-result ${status.tone}`}><span>预核验结论</span><strong>{status.label}</strong><small>{status.note}</small></div></section><section className="report-section"><span className="section-kicker">01 · 执行摘要</span><h3>本报告能回答什么</h3><p>基于当前提交材料，系统识别企业主体、经营、现金流、纳税开票、资金用途和材料真实性证据，列出可进入人工复核的事项与尚需补证的障碍。报告不查询征信，不代表银行审批结果。</p><div className="report-numbers"><span><b>{data.files.length}</b>份分析材料</span><span><b>{checks.filter(item => item.result === "不符合").length}</b>项关键障碍</span><span><b>{checks.filter(item => item.result === "无法判断").length}</b>项无法判断</span><span><b>{data.uncertainFiles}</b>份材料需确认</span></div></section><section className="report-section"><span className="section-kicker">02 · 经营与现金流摘要</span><h3>识别数据，不等同于审计数据</h3><div className="summary-table"><span>经营流入<b>{currency(data.income)}</b></span><span>经营流出<b>{currency(data.expense)}</b></span><span>经营净流入<b>{currency(data.netCash)}</b></span><span>发票价税合计<b>{currency(data.invoiceTotal)}</b></span><span>税额合计<b>{currency(data.taxTotal)}</b></span><span>现有有息负债<b>{demand.existingDebt}万元</b></span></div><p className="report-note">上述金额来自机器识别字段，尚未完成审计、征信、账户归属、交易性质和会计期间复核。若字段无法可靠识别，则显示“待识别”。</p></section><section className="report-section"><span className="section-kicker">03 · 融资条件逐项预审</span><h3>结论—证据—规则对应表</h3><div className="report-checks">{checks.map(item => <article key={item.id}><span className={`result result-${item.result}`}>{item.result}</span><div><strong>{item.title}</strong><p>{item.conclusion}</p><small>证据：{item.evidence}</small><small>规则：{item.rule}</small></div></article>)}</div></section><section className="report-section"><span className="section-kicker">04 · 资料索引</span><h3>机构可回看原始证据位置</h3><div className="document-index">{data.files.map((file, index) => <div key={file.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{file.name}</strong><small>{file.kind} · {file.status}</small><p>{file.evidence[0] || "未形成可靠证据定位"}</p></div>)}</div></section><section className="report-section disclaimer"><strong>重要声明</strong><p>本报告用于融资材料整理和规则预核验，不构成会计鉴证、审计、税务、法律、征信、担保或授信意见。企业应确保材料真实、完整、有效；最终准入、额度、利率、期限及审批结果以持牌金融机构独立审核为准。</p></section></div>;
}

function Standards() {
  const links = [
    { name: "流动资金贷款管理办法", authority: "国家金融监督管理总局令 2024年第2号", use: "借款条件、材料真实性、贷款用途和尽职调查", url: "https://www.nfra.gov.cn/cn/view/pages/governmentDetail.html?docId=1151066&generaltype=1&itemId=" },
    { name: "小企业会计准则", authority: "财政部", use: "小企业会计确认、计量和报表口径", url: "https://kjs.mof.gov.cn/zhengcefabu/201111/t20111101_604099.htm" },
    { name: "个人信息保护法", authority: "全国人民代表大会常务委员会", use: "处理目的、授权、最小必要和个人权利", url: "https://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html" },
    { name: "数据安全法", authority: "全国人民代表大会常务委员会", use: "数据处理与安全保护责任", url: "https://www.npc.gov.cn/npc/c2/c30834/202106/t20210610_311888.html" },
  ];
  return <div className="content"><div className="page-intro"><div><h2>规则可追溯，版本有边界</h2><p>每项预审结论应能回到正式规则、证据位置和最后核验日期。</p></div><span className="verified">最后核验 2026-08-13</span></div><div className="principle-grid">{[{ n: "01", t: "事实", d: "来自文件或企业确认" }, { n: "02", t: "规则", d: "来自有效制度与公开条件" }, { n: "03", t: "推断", d: "展示方法、假设和置信度" }, { n: "04", t: "未知", d: "证据不足时拒绝下结论" }].map(item => <article key={item.n}><span>{item.n}</span><strong>{item.t}</strong><small>{item.d}</small></article>)}</div><section className="panel standards-list">{links.map(link => <a key={link.name} href={link.url} target="_blank" rel="noreferrer"><span>{link.authority}</span><div><strong>{link.name}</strong><p>{link.use}</p></div><b>查看官方原文 ↗</b></a>)}</section><div className="boundary"><strong>规则更新机制</strong><p>产品规则与法律依据应记录来源、版本、适用地区、适用对象和最后人工核验日期。规则过期或来源不明时，系统停止给出肯定结论。</p></div></div>;
}

function Audit({ logs }: { logs: string[] }) { return <div className="content narrow"><div className="page-intro"><div><h2>操作与结论留痕</h2><p>记录材料处理、用户确认、需求修改、整改和导出动作。</p></div><span className="verified">当前设备会话</span></div><section className="panel audit-list">{logs.length ? logs.map((log, index) => <div key={`${log}-${index}`}><span>{index === 0 ? "最新" : "记录"}</span><p>{log}</p></div>) : <div className="empty-state">暂无操作记录</div>}</section><div className="boundary"><strong>生产环境要求</strong><p>正式版本还需要不可篡改的服务端审计日志、角色权限、授权撤回、数据删除、加密存储和访问告警。当前Demo仅记录本次浏览器会话。</p></div></div>; }

function Empty({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) { return <div className="content"><div className="report-empty"><span>▥</span><h2>{title}</h2><p>{text}</p><button className="primary" onClick={onClick}>{action} →</button></div></div>; }
