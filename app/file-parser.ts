export type ParsedFile = {
  id: string;
  name: string;
  kind: "银行流水" | "发票明细" | "财务报表" | "合同" | "营业执照" | "纳税资料" | "其他";
  status: "解析中" | "已解析" | "需确认" | "失败";
  rows: number;
  text: string;
  fields: Record<string, string | number>;
  evidence: string[];
  error?: string;
};

const money = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[¥￥,，\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function classify(name: string, text = ""): ParsedFile["kind"] {
  const s = `${name} ${text.slice(0, 1200)}`.toLowerCase();
  if (/流水|交易明细|贷方发生额|借方发生额|银行账号/.test(s)) return "银行流水";
  if (/发票|价税合计|发票号码|销项|进项/.test(s)) return "发票明细";
  if (/资产负债表|利润表|现金流量表|财务报表/.test(s)) return "财务报表";
  if (/合同|甲方|乙方|协议/.test(s)) return "合同";
  if (/营业执照|统一社会信用代码/.test(s)) return "营业执照";
  if (/纳税|申报表|税款所属期/.test(s)) return "纳税资料";
  return "其他";
}

function extractTextFields(text: string) {
  const amounts = [...text.matchAll(/(?:¥|￥)?\s*([0-9]{1,3}(?:[,，][0-9]{3})*(?:\.[0-9]{1,2})?)(?:\s*元)?/g)]
    .map(m => money(m[1])).filter(n => n > 0 && n < 1e10).slice(0, 500);
  const creditCode = text.match(/[0-9A-Z]{18}/)?.[0] || "";
  const invoiceNos = [...text.matchAll(/(?:发票号码|号码)[:：\s]*([0-9]{8,20})/g)].map(m => m[1]);
  return {
    "识别字符数": text.length,
    "金额字段数": amounts.length,
    "金额字段合计（仅供核对）": Number(amounts.reduce((a, b) => a + b, 0).toFixed(2)),
    ...(creditCode ? { "统一社会信用代码": creditCode } : {}),
    ...(invoiceNos.length ? { "发票号码数": invoiceNos.length } : {}),
  };
}

async function parseSheet(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const sumBy = (patterns: RegExp[]) => rows.reduce((sum, row) => {
    const key = headers.find(h => patterns.some(p => p.test(h)));
    return sum + (key ? money(row[key]) : 0);
  }, 0);
  const income = sumBy([/收入金额/, /贷方发生额/, /^收入$/, /流入金额/]);
  const expense = sumBy([/支出金额/, /借方发生额/, /^支出$/, /流出金额/]);
  const invoice = sumBy([/价税合计/, /^合计金额$/, /^金额$/]);
  const tax = sumBy([/^税额$/, /合计税额/]);
  const text = [headers.join(" | "), ...rows.slice(0, 80).map(r => headers.map(h => String(r[h])).join(" | "))].join("\n");
  return { text, rows: rows.length, fields: { "工作表": wb.SheetNames[0], "数据行数": rows.length, "字段数": headers.length, ...(income ? { "经营流入": Number(income.toFixed(2)) } : {}), ...(expense ? { "经营流出": Number(expense.toFixed(2)) } : {}), ...(invoice ? { "发票价税合计": Number(invoice.toFixed(2)) } : {}), ...(tax ? { "税额合计": Number(tax.toFixed(2)) } : {}) }, evidence: headers.slice(0, 12) };
}

async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const chunks: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    chunks.push(`【第${i}页】 ` + content.items.map(item => "str" in item ? item.str : "").join(" "));
  }
  const text = chunks.join("\n");
  return { text, rows: pdf.numPages, fields: { "PDF页数": pdf.numPages, ...extractTextFields(text) }, evidence: chunks.slice(0, 5).map((x, i) => `第${i + 1}页 · ${x.slice(0, 80)}`) };
}

async function parseImage(file: File) {
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "chi_sim+eng");
  const text = result.data.text || "";
  return { text, rows: 1, fields: { "OCR置信度": Number(result.data.confidence.toFixed(1)), ...extractTextFields(text) }, evidence: text.split("\n").filter(Boolean).slice(0, 8) };
}

export async function parseRealFile(file: File): Promise<ParsedFile> {
  const base: ParsedFile = { id: `${Date.now()}-${file.name}`, name: file.name, kind: "其他", status: "解析中", rows: 0, text: "", fields: {}, evidence: [] };
  try {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let result: { text: string; rows: number; fields: Record<string, string | number>; evidence: string[] };
    if (["xlsx", "xls", "csv"].includes(ext || "")) result = await parseSheet(file);
    else if (ext === "pdf") result = await parsePdf(file);
    else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) result = await parseImage(file);
    else result = { text: await file.text(), rows: 1, fields: {}, evidence: [] };
    const kind = classify(file.name, result.text);
    const weak = result.text.trim().length < 20;
    return { ...base, ...result, kind, status: weak ? "需确认" : "已解析", fields: { ...result.fields, "文件大小KB": Number((file.size / 1024).toFixed(1)) }, error: weak ? "识别文本较少，可能是扫描PDF，请改用图片OCR或人工确认。" : undefined };
  } catch (error) {
    return { ...base, status: "失败", error: error instanceof Error ? error.message : "文件解析失败" };
  }
}

export type RealAnalysis = {
  files: ParsedFile[];
  kinds: string[];
  income: number;
  expense: number;
  invoiceTotal: number;
  taxTotal: number;
  parsedAt: string;
};

export function summarizeFiles(files: ParsedFile[]): RealAnalysis {
  const sum = (key: string) => files.reduce((a, f) => a + money(f.fields[key]), 0);
  return { files, kinds: [...new Set(files.map(f => f.kind))], income: sum("经营流入"), expense: sum("经营流出"), invoiceTotal: sum("发票价税合计"), taxTotal: sum("税额合计"), parsedAt: new Date().toLocaleString("zh-CN") };
}
