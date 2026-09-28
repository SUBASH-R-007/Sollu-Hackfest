import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  CandidateSchema,
  getMockCandidates,
  type Candidate,
  candidateMeaningKey,
  applyCandidatePolicy,
} from "../packages/shared/src/index";
import { challengeCases } from "./intent/challenges";

const live = process.argv.includes("--live");
const base =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) ??
  "http://127.0.0.1:8787";
const outputDir = fileURLToPath(new URL("./intent/", import.meta.url));
let token = "",
  model = "controlled-catalog-vocabulary-1";
if (live) {
  const healthResponse = await fetch(`${base}/api/health`);
  if (!healthResponse.ok) throw new Error("Start the local API before --live.");
  const health = (await healthResponse.json()) as {
    providers?: { intent?: string };
  };
  if (health.providers?.intent !== "ollama")
    throw new Error(
      "--live requires an actual configured local Ollama provider; mock output cannot be reported as model evidence.",
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
  raw: string;
  lang: string;
  expected: string;
  count: number;
  valid: boolean;
  distinct: boolean;
  correctLanguage: boolean;
  meaning: boolean;
  contradictions: boolean;
  latencyMs: number;
  error?: string;
};
const results: Result[] = [];
async function liveCandidates(context: unknown): Promise<Candidate[]> {
  const response = await fetch(`${base}/api/intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ context }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as {
    candidates: Candidate[];
    model: string;
  };
  model = payload.model;
  return payload.candidates;
}
for (const test of challengeCases) {
  // Pace live calls without including the pause in provider timing.
  if (live && results.length)
    await new Promise((resolve) => setTimeout(resolve, 2100));
  const start = performance.now();
  let candidates: Candidate[] = [],
    error: string | undefined;
  try {
    candidates = live
      ? await liveCandidates(test.context)
      : applyCandidatePolicy(getMockCandidates(test.context), test.context)
          .candidates;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Request failed";
  }
  const exp = test.expected;
  const matches = (c: Candidate) =>
    !!exp.gloss?.test(c.gloss_en) &&
    (!exp.speechAct || c.speechAct === exp.speechAct) &&
    (!exp.polarity || c.polarity === exp.polarity) &&
    (!exp.side || c.side === exp.side);
  const valid =
    !error &&
    candidates.length <= 3 &&
    candidates.every(
      (c) => CandidateSchema.safeParse(c).success && c.text.length <= 90,
    );
  results.push({
    id: test.id,
    raw: test.description,
    lang: test.context.outputLang,
    expected: exp.response,
    count: candidates.length,
    valid,
    distinct:
      new Set(candidates.map(candidateMeaningKey)).size === candidates.length,
    correctLanguage: candidates.every(
      (c) =>
        c.lang === test.context.outputLang &&
        /\p{Script=Tamil}/u.test(c.text) === (test.context.outputLang === "ta"),
    ),
    meaning:
      !error &&
      (exp.response === "abstain"
        ? candidates.length === 0
        : candidates.some(matches)),
    contradictions:
      (!!exp.polarity && candidates.some((c) => c.polarity !== exp.polarity)) ||
      (!!exp.side && candidates.some((c) => c.side !== exp.side)),
    latencyMs: performance.now() - start,
    error,
  });
}
const passed = (r: Result) =>
  r.valid && r.distinct && r.correctLanguage && r.meaning && !r.contradictions;
const matches = results.filter(passed).length;
const measured = results
  .filter((r) => !r.error)
  .map((r) => r.latencyMs)
  .sort((a, b) => a - b);
const percentile = (p: number) =>
  measured.length
    ? measured[
        Math.min(measured.length - 1, Math.ceil(measured.length * p) - 1)
      ].toFixed(1)
    : "unmeasured";
const safe = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll("\n", " ");
const report = `# Intent ${live ? "local-provider challenge evaluation" : "controlled fixture regression"}\n\nGenerated: ${new Date().toISOString()}\n\nMode: **${live ? "LIVE LOCAL PROVIDER — explicit heuristic oracles" : "MOCK / CONTROLLED CATALOG — no real-model quality evidence"}**. Model: \`${model}\`.\n\nThis set has **120 hand-authored input scenarios × 2 output languages = 240 executions**: 80 ordinary retrieval/communication scenarios, 18 polarity/meaning contrasts, two body-side scenarios, and 20 required abstentions. Output-language pairs are not independent participants or separate real-world observations. Expected gloss constraints are hand-authored and stored separately from the catalog; they are not generated from the tested output. This is a development regression set, not a blinded or held-out benchmark. Scoring examines output gloss and canonical semantic attributes, never an LLM-written intent label. The original Appendix G examples remain in cases.ts for reference.\n\n| Check | Result |\n|---|---:|\n| All case expectations | ${matches} / ${results.length} |\n| Schema and at most three cards | ${results.filter((r) => r.valid).length} / ${results.length} |\n| No repeated canonical meaning | ${results.filter((r) => r.distinct).length} / ${results.length} |\n| Requested output language/script | ${results.filter((r) => r.correctLanguage).length} / ${results.length} |\n| Contradictory tested polarity/side | ${results.filter((r) => r.contradictions).length} |\n| Request errors | ${results.filter((r) => r.error).length} |\n| ${live ? "HTTP" : "Fixture execution"} p50 / p95 | ${percentile(0.5)} / ${percentile(0.95)} ms |\n\nResult: **${matches === results.length ? "PASS" : "FAIL"}**.\n\n| Case | Input | Output | Expected | Cards | Result |\n|---|---|---|---|---:|---|\n${results.map((r) => `| ${r.id} | ${safe(r.raw)} | ${r.lang} | ${r.expected} | ${r.count} | ${passed(r) ? "pass" : r.error ? safe(r.error) : "FAIL"} |`).join("\n")}\n\n## Limits\n\nThis is a synthetic engineering challenge set, not a clinical, natural-speech or open-ended language benchmark. Canonical metadata and English gloss agreement do not validate Tamil meaning, register, pronunciation, user intent, independence or fatigue. Native-speaker/SLP review and person-endorsed communication tasks remain pending. Mock execution time is not AI, STT, TTS or phone latency. Empty required-abstention results count as correct only where explicitly specified; unexpected empty results fail. The live runner refuses mock servers, records request failures, respects rate limits, and never installs or downloads models. No paid request is made.\n\nRun \`pnpm eval\` for fixture regression. Only after separately configuring a downloaded Ollama model, run \`pnpm eval --live\`; its report remains separate.\n`;
await mkdir(outputDir, { recursive: true });
await writeFile(
  `${outputDir}${live ? "report-live.md" : "report.md"}`,
  report,
  "utf8",
);
await writeFile(
  `${outputDir}challenge-cases.jsonl`,
  challengeCases
    .map((c) =>
      JSON.stringify({
        ...c,
        expected: { ...c.expected, gloss: c.expected.gloss?.source },
      }),
    )
    .join("\n") + "\n",
  "utf8",
);
console.log(
  `${live ? "LOCAL PROVIDER" : "CONTROLLED FIXTURE"}: ${matches}/${results.length}; ${matches === results.length ? "PASS" : "FAIL"}. See evals/intent/${live ? "report-live.md" : "report.md"}`,
);
if (matches !== results.length) process.exitCode = 1;
