import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Rongshuitong onboarding and compliance copy", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /融税通｜融资准备与协同 Agent/);
  assert.match(html, /真实文件在当前浏览器本地解析/);
  assert.match(html, /机器识别结果必须由企业确认/);
  assert.match(html, /不承诺贷款额度、利率或审批结果/);
  assert.match(html, /不构成会计、税务、法律或授信意见/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("bundles a web-safe PDF worker and OCR fallback", async () => {
  const parser = await readFile(new URL("../app/file-parser.ts", import.meta.url), "utf8");
  assert.match(parser, /pdf\.worker\.min\.mjs\?url/);
  assert.match(parser, /createWorker\("chi_sim\+eng"\)/);
  assert.match(parser, /文件超过 30MB/);
  assert.match(parser, /PDF 已加密或需要密码/);

  const chunksRoot = new URL("../dist/client/_next/static/chunks/", import.meta.url);
  const files = await readdir(chunksRoot);
  const workerChunk = files.find(file => /^pdf\.worker\.min-.*\.js$/.test(file));
  assert.ok(workerChunk, "PDF worker URL bundle should exist");
  const bundledWorkerUrl = await readFile(new URL(workerChunk, chunksRoot), "utf8");
  assert.match(bundledWorkerUrl, /\/_next\/static\/media\/pdf\.worker\.min/);
  assert.doesNotMatch(bundledWorkerUrl, /file:\/\/\/ROOT\/app\/file-parser/);
});
