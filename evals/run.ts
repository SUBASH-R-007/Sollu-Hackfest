import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  CandidateSchema,
  getMockCandidates,
  type Candidate,
} from "../packages/shared/src/index";
import { validateCandidates } from "../apps/server/src/lib/validation";
import { intentCases } from "./intent/cases";

const live = process.argv.includes("--live");
const urlArg = process.argv.find((a) => a.startsWith("--url="));
const base = urlArg?.slice(6) ?? "http://127.0.0.1:8787";
const outputDir = fileURLToPath(new URL("./intent/", import.meta.url));
let token = "",
  model = "mock-deterministic-v1";
if (live) {
  const response = await fetch(`${base}/api/health`);
  if (!response.ok)
    throw new Error("Start the API server before running --live.");
  const health = (await response.json()) as { providers?: { intent?: string } };
  if (health.providers?.intent === "mock")
    throw new Error(
      "--live requires a real local provider. Set MOCK_PROVIDERS=0, LLM_PROVIDER=ollama and a downloaded local model first.",
    );
  const registration = await fetch(`${base}/api/device/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode: process.env.ACCESS_CODE ?? "" }),
  });
  if (!registration.ok)
    throw new Error("Device registration failed; check ACCESS_CODE.");
  token = ((await registration.json()) as { token: string }).token;
}
type Result = {
  id: string;
  description: string;
  valid: boolean;
  distinct: boolean;
  top1: boolean;
  top3: boolean;
  guardViolations: number;
  reading: boolean;
  formal: boolean;
  latencyMs: number;
  count: number;
};
const results: Result[] = [];
for (const test of intentCases) {
  const started = performance.now();
  let candidates: Candidate[];
  if (live) {
    const response = await fetch(`${base}/api/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ context: test.context }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(
        `Intent request ${test.id} returned ${response.status}. No successful report was generated.`,
      );
    const result = (await response.json()) as {
      candidates: Candidate[];
      model: string;
    };
    candidates = result.candidates;
    model = result.model;
  } else
    candidates = validateCandidates(
      getMockCandidates(test.context),
      test.context,
    ).candidates;
  const latencyMs = performance.now() - started;
  const haystack = (c: Candidate) => `${c.intent} ${c.gloss_en} ${c.text}`;
  const hit = (c: Candidate) =>
    test.acceptableIntents.some((pattern) => pattern.test(haystack(c)));
  const guardViolations = candidates.filter((c) =>
    test.mustNot?.some((pattern) => pattern.test(c.text + " " + c.gloss_en)),
  ).length;
  const urgencyOkay =
    !test.expectedUrgency ||
    candidates.some((c) => c.urgency === test.expectedUrgency && hit(c));
  results.push({
    id: test.id,
    description: test.description,
    count: candidates.length,
    valid: candidates.every((c) => CandidateSchema.safeParse(c).success),
    distinct:
      candidates.length === 3 &&
      new Set(candidates.map((c) => c.intent.toLowerCase())).size === 3,
    top1:
      !!candidates[0] &&
      hit(candidates[0]) &&
      (!test.expectedUrgency || candidates[0].urgency === test.expectedUrgency),
    top3: candidates.some(hit) && urgencyOkay,
    guardViolations,
    reading: candidates.every(
      (c) =>
        c.reading.length <= 40 &&
        c.reading.split("→").every((part) => part.trim()),
    ),
    formal:
      test.context.outputLang === "ta" &&
      candidates.some((c) =>
        /தண்ணீர்|கொடுங்கள்|வாருங்கள்|வேண்டும்/u.test(c.text),
      ),
    latencyMs,
  });
}
const count = (fn: (r: Result) => boolean) => results.filter(fn).length;
const percent = (n: number) => `${((n / results.length) * 100).toFixed(1)}%`;
const latency = results.map((r) => r.latencyMs).sort((a, b) => a - b);
const percentile = (p: number) =>
  latency[
    Math.min(latency.length - 1, Math.ceil(p * latency.length) - 1)
  ]!.toFixed(1);
const passed =
  results.every(
    (r) => r.valid && r.distinct && r.reading && r.guardViolations === 0,
  ) &&
  count((r) => r.top3) / results.length >= 0.8 &&
  count((r) => r.top1) / results.length >= 0.55;
const report =
  `# Intent ${live ? "local-provider heuristic evaluation" : "mock fixture regression"}\n\nGenerated: ${new Date().toISOString()}\n\n` +
  `Mode: **${live ? "LIVE LOCAL PROVIDER — heuristics only" : "MOCK — deterministic fixtures; no AI quality evidence"}**. Model: \`${model}\`.\n\n` +
  `The 13 hackathon cases from Appendix G ran. e11 (Hindi) belongs to M10 and is excluded. These are synthetic cases, with no patient data.\n\n` +
  `| Check | Result |\n|---|---|\n| Candidate schema validity | ${percent(count((r) => r.valid))} |\n| Three different intent labels | ${percent(count((r) => r.distinct))} |\n| Top-1 acceptable-intent heuristic | ${percent(count((r) => r.top1))} |\n| Top-3 acceptable-intent heuristic | ${percent(count((r) => r.top3))} |\n| Explicit forbidden-pattern violations | ${results.reduce((n, r) => n + r.guardViolations, 0)} |\n| Reading format | ${percent(count((r) => r.reading))} |\n| Tamil formal-marker cases | ${count((r) => r.formal)} |\n| ${live ? "HTTP" : "Fixture execution"} p50 / p95 | ${percentile(0.5)} / ${percentile(0.95)} ms |\n\n` +
  `| Case | Scenario | Cards | Top-1 | Top-3 | Format / distinct / guards |\n|---|---|---:|---|---|---|\n` +
  results
    .map(
      (r) =>
        `| ${r.id} | ${r.description} | ${r.count} | ${r.top1 ? "pass" : "miss"} | ${r.top3 ? "pass" : "miss"} | ${r.valid && r.distinct && r.reading && r.guardViolations === 0 ? "pass" : "FAIL"} |`,
    )
    .join("\n") +
  `\n\nRegression result: **${passed ? "PASS" : "FAIL"}**.\n\n` +
  `## What this does not establish\n\nNo LLM judge was used. Semantic intent distinction, invented names outside the contact list, extra events, colloquial Tamil quality, register, clinical suitability and speech/voice quality require separate review. ${live ? "Local-provider hardware latency is not phone-to-audio latency." : "Mock latency is not real-provider, speech or phone-to-audio latency. Real model quality and all provider performance targets remain unmeasured."} Native-speaker and real-device checks remain pending.\n\n` +
  `Run \`pnpm eval\` for deterministic regression. After configuring a downloaded local Ollama model and starting the API, run \`pnpm eval --live\`; this refuses a mock server. No paid API is called.\n`;
await mkdir(outputDir, { recursive: true });
await writeFile(
  `${outputDir}${live ? "report-live.md" : "report.md"}`,
  report,
  "utf8",
);
await writeFile(
  `${outputDir}cases.jsonl`,
  intentCases
    .map((t) =>
      JSON.stringify({
        id: t.id,
        context: t.context,
        acceptable_intents: t.acceptableIntents.map((p) => p.source),
        must_not: t.mustNot?.map((p) => p.source),
        notes: t.description,
      }),
    )
    .join("\n") + "\n",
  "utf8",
);
console.log(
  `${live ? "LIVE LOCAL HEURISTIC" : "MOCK FIXTURE"}: ${passed ? "PASS" : "FAIL"}; ${results.length} cases; top-1 ${percent(count((r) => r.top1))}; top-3 ${percent(count((r) => r.top3))}. Report: evals/intent/${live ? "report-live.md" : "report.md"}`,
);
if (!passed) process.exitCode = 1;
