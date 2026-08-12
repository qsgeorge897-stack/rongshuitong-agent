export type DocumentKind = "银行流水" | "发票明细" | "财务报表" | "合同" | "营业执照" | "纳税资料" | "其他";

export type ParsedFile = {
  id: string;
  name: string;
  kind: DocumentKind;
  status: "解析中" | "已解析" | "需确认" | "失败";
  rows: number;
  text: string;
  fields: Record<string, string | number>;
  evidence: string[];
  error?: string;
};

const money = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[¥￥,，\s]/g, "").replace(/[()]/g, "-");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

function classify(name: string, text = ""): DocumentKind {
  const sample = `${name} ${text.slice(0, 3000)}`.toLowerCase();
  if (/流水|交易明细|贷方发生额|借方发生额|交易对手|银行账号/.test(sample)) return "银行流水";
  if (/发票|价税合计|发票号码|销项|进项/.test(sample)) return "发票明细";
  if (/资产负债表|利润表|现金流量表|财务报表|主营业务收入/.test(sample)) return "财务报表";
  if (/合同|甲方|乙方|协议|采购订单/.test(sample)) return "合同";
  if (/营业执照|统一社会信用代码|法定代表人/.test(sample)) return "营业执照";
  if (/纳税|申报表|税款所属期|应纳税额/.test(sample)) return "纳税资料";
  return "其他";
}

function extractTextFields(text: string) {
  const amounts = [...text.matchAll(/(?:¥|￥)?\s*([0-9]{1,3}(?:[,，][0-9]{3})*(?:\.[0-9]{1,2})?)(?:\s*元)?/g)]
    .map(match => money(match[1]))
    .filter(value => value > 0 && value < 1e10)
    .slice(0, 800);
  const creditCode = text.match(/[0-9A-Z]{18}/)?.[0] || "";
  const invoiceNos = [...text.matchAll(/(?:发票号码|号码)[:：\s]*([0-9]{8,20})/g)].map(match => match[1]);
  const dates = [...text.matchAll(/20\d{2}[-年/.](?:0?[1-9]|1[0-2])(?:[-月/.](?:0?[1-9]|[12]\d|3[01])日?)?/g)].map(match => match[0]);
  return {
    "识别字符数": text.length,
    "金额字段数": amounts.length,
    "金额字段合计（仅供核对）": Number(amounts.reduce((sum, value) => sum + value, 0).toFixed(2)),
    ...(dates.length ? { "识别期间": `${dates[0]} 至 ${dates.at(-1)}` } : {}),
    ...(creditCode ? { "统一社会信用代码": creditCode } : {}),
    ...(invoiceNos.length ? { "发票号码数": invoiceNos.length } : {}),
  };
}

function findHeader(headers: string[], patterns: RegExp[]) {
  return headers.find(header => patterns.some(pattern => pattern.test(header.trim())));
}

async function parseSheet(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  let totalRows = 0;
  let income = 0;
  let expense = 0;
  let invoice = 0;
  let tax = 0;
  const evidence: string[] = [];
  const textBlocks: string[] = [];
  const allHeaders = new Set<string>();

  workbook.SheetNames.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    totalRows += rows.length;
    headers.forEach(header => allHeaders.add(header));
    evidence.push(`${sheetName} · ${rows.length} 行 · 字段：${headers.slice(0, 8).join("、") || "未识别"}`);
    textBlocks.push(`【${sheetName}】\n${headers.join(" | ")}\n${rows.slice(0, 120).map(row => headers.map(header => String(row[header])).join(" | ")).join("\n")}`);

    const incomeKey = findHeader(headers, [/收入金额/, /贷方发生额/, /^收入$/, /流入金额/, /收款金额/]);
    const expenseKey = findHeader(headers, [/支出金额/, /借方发生额/, /^支出$/, /流出金额/, /付款金额/]);
    const invoiceKey = findHeader(headers, [/价税合计/, /^合计金额$/, /^金额$/, /发票金额/]);
    const taxKey = findHeader(headers, [/^税额$/, /合计税额/, /应纳税额/]);
    rows.forEach(row => {
      income += incomeKey ? money(row[incomeKey]) : 0;
      expense += expenseKey ? money(row[expenseKey]) : 0;
      invoice += invoiceKey ? money(row[invoiceKey]) : 0;
      tax += taxKey ? money(row[taxKey]) : 0;
    });
  });

  const text = textBlocks.join("\n");
  return {
    text,
    rows: totalRows,
    fields: {
      "工作表数量": workbook.SheetNames.length,
      "工作表": workbook.SheetNames.join("、"),
      "数据行数": totalRows,
      "字段数": allHeaders.size,
      ...(income ? { "经营流入": Number(income.toFixed(2)) } : {}),
      ...(expense ? { "经营流出": Number(expense.toFixed(2)) } : {}),
      ...(invoice ? { "发票价税合计": Number(invoice.toFixed(2)) } : {}),
      ...(tax ? { "税额合计": Number(tax.toFixed(2)) } : {}),
    },
    evidence: evidence.slice(0, 12),
  };
}

async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const chunks: string[] = [];
  for (let index = 1; index <= Math.min(pdf.numPages, 50); index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    chunks.push(`【第${index}页】 ${content.items.map(item => "str" in item ? item.str : "").join(" ")}`);
  }
  const text = chunks.join("\n");
  return {
    text,
    rows: pdf.numPages,
    fields: { "PDF页数": pdf.numPages, ...extractTextFields(text) },
    evidence: chunks.filter(chunk => chunk.length > 12).slice(0, 8).map(chunk => chunk.slice(0, 150)),
  };
}

async function parseImage(file: File) {
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "chi_sim+eng");
  const text = result.data.text || "";
  return {
    text,
    rows: 1,
    fields: { "OCR置信度": Number(result.data.confidence.toFixed(1)), ...extractTextFields(text) },
    evidence: text.split("\n").filter(Boolean).slice(0, 10),
  };
}

export async function parseRealFile(file: File): Promise<ParsedFile> {
  const base: ParsedFile = { id: `${Date.now()}-${file.name}`, name: file.name, kind: "其他", status: "解析中", rows: 0, text: "", fields: {}, evidence: [] };
  try {
    const extension = file.name.split(".").pop()?.toLowerCase();
    let result: { text: string; rows: number; fields: Record<string, string | number>; evidence: string[] };
    if (["xlsx", "xls", "csv"].includes(extension || "")) result = await parseSheet(file);
    else if (extension === "pdf") result = await parsePdf(file);
    else if (["jpg", "jpeg", "png", "webp"].includes(extension || "")) result = await parseImage(file);
    else result = { text: await file.text(), rows: 1, fields: {}, evidence: [] };

    const kind = classify(file.name, result.text);
    const isWeak = result.text.trim().length < 30;
    const lowOcr = typeof result.fields["OCR置信度"] === "number" && result.fields["OCR置信度"] < 70;
    return {
      ...base,
      ...result,
      kind,
      status: isWeak || lowOcr || kind === "其他" ? "需确认" : "已解析",
      fields: { ...result.fields, "文件大小KB": Number((file.size / 1024).toFixed(1)) },
      error: isWeak ? "可提取文字较少，可能是扫描版 PDF；请转为清晰图片或人工确认。" : lowOcr ? "OCR 置信度较低，请对照原件确认。" : kind === "其他" ? "暂未识别材料类型，请人工选择或确认。" : undefined,
    };
  } catch (error) {
    return { ...base, status: "失败", error: error instanceof Error ? error.message : "文件解析失败" };
  }
}

export type RealAnalysis = {
  files: ParsedFile[];
  kinds: DocumentKind[];
  income: number;
  expense: number;
  invoiceTotal: number;
  taxTotal: number;
  parsedAt: string;
  failedFiles: number;
  uncertainFiles: number;
  netCash: number;
};

export function summarizeFiles(files: ParsedFile[]): RealAnalysis {
  const usable = files.filter(file => file.status !== "失败");
  const sum = (key: string) => usable.reduce((total, file) => total + money(file.fields[key]), 0);
  const income = sum("经营流入");
  const expense = sum("经营流出");
  return {
    files,
    kinds: [...new Set(usable.map(file => file.kind))],
    income,
    expense,
    invoiceTotal: sum("发票价税合计"),
    taxTotal: sum("税额合计"),
    parsedAt: new Date().toLocaleString("zh-CN"),
    failedFiles: files.filter(file => file.status === "失败").length,
    uncertainFiles: files.filter(file => file.status === "需确认").length,
    netCash: Number((income - expense).toFixed(2)),
  };
}
