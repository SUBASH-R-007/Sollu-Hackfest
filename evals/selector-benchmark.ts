import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { createApp } from "../apps/server/src/app";
import type { ServerConfig } from "../apps/server/src/config";
import {
  candidateMeaningKey,
  ContextPacketSchema,
  getMockCandidates,
  applyCandidatePolicy,
  type Candidate,
} from "../packages/shared/src/index";

/** Opt-in, synthetic selection benchmark. Never downloads a model or changes .env. */
const model = "llama3:latest",
  origin = "http://127.0.0.1:8791";
const tagsResponse = await fetch("http://127.0.0.1:11434/api/tags", {
  signal: AbortSignal.timeout(3000),
});
if (!tagsResponse.ok)
  throw new Error("Local Ollama is unavailable; no model was installed.");
const tags = (await tagsResponse.json()) as {
  models: {
    name: string;
    size: number;
    details?: { parameter_size?: string; quantization_level?: string };
  }[];
};
const installed = tags.models.find((item) => item.name === model);
if (!installed)
  throw new Error(
    "The already-installed llama3:latest model was not found; no download attempted.",
  );
const config: ServerConfig = {
  secret: randomBytes(48).toString("base64url"),
  port: 8791,
  host: "127.0.0.1",
  origin,
  intentProvider: "ollama",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: model,
  timeoutMs: 8000,
  accessCode: "",
  logging: false,
  production: false,
};
const cases: [string, "ta" | "en", number?][] = [
  ["thanni", "ta"],
  ["water", "en"],
  ["தண்ணி வேண்டாம்", "ta"],
  ["no water", "en"],
  ["puriyala", "ta"],
  ["I don't understand", "en"],
  ["manasa maathiten", "ta"],
  ["changed my mind", "en"],
  ["left shoulder pain", "ta"],
  ["right knee pain", "en"],
  ["left shoulder pain", "ta", 2],
  ["right knee pain", "en", 2],
  ["table", "ta"],
  ["table", "en"],
  ["table", "ta", 2],
  ["table", "en", 2],
  ["tablet raathiri", "ta"],
  ["night tablets", "en"],
  ["Priya phone", "ta"],
  ["Priya phone", "en"],
  ["no water but tea", "ta"],
  ["no water but tea", "en"],
  ["zzzxq", "ta"],
  ["zzzxq", "en"],
];
const app = await createApp(config);
const results: {
  id: number;
  raw: string;
  lang: string;
  choices: number;
  returned: number;
  model: string;
  latencyMs: number;
  valid: boolean;
  subset: boolean;
  unchanged: boolean;
  drops: number;
  error?: string;
}[] = [];
const started = new Date().toISOString();
await app.listen({ port: 8791, host: "127.0.0.1" });
try {
  const registration = await fetch(`${origin}/api/device/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!registration.ok)
    throw new Error(`Registration HTTP ${registration.status}`);
  const token = ((await registration.json()) as { token: string }).token;
  for (const [index, [raw, outputLang, round]] of cases.entries()) {
    const context = ContextPacketSchema.parse({
      outputLang,
      round: round ?? 1,
      fragment: { modality: "text", raw },
      people: [{ name: "Priya", relation: "spouse", aliases: ["பிரியா"] }],
      exclude: [],
    });
    const allowed = applyCandidatePolicy(
      getMockCandidates(context),
      context,
    ).candidates;
    const allowedKeys = allowed.map(candidateMeaningKey);
    const begin = performance.now();
    let returned: Candidate[] = [],
      responseModel = "request failed",
      drops = 0,
      error: string | undefined;
    try {
      const response = await fetch(`${origin}/api/intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ context }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as {
        candidates: Candidate[];
        model: string;
        validationDrops: number;
      };
      returned = body.candidates;
      responseModel = body.model;
      drops = body.validationDrops;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Request failed";
    }
    const returnedKeys = returned.map(candidateMeaningKey);
    const validated = applyCandidatePolicy(returned, context).candidates;
    results.push({
      id: index + 1,
      raw,
      lang: outputLang,
      choices: allowed.length,
      returned: returned.length,
      model: responseModel,
      latencyMs: performance.now() - begin,
      valid: !error && returned.length === validated.length,
      subset: returnedKeys.every((key) => allowedKeys.includes(key)),
      unchanged: JSON.stringify(allowedKeys) === JSON.stringify(returnedKeys),
      drops,
      error,
    });
    console.log(
      `Selector case ${index + 1}/${cases.length}: ${responseModel}; ${results.at(-1)!.latencyMs.toFixed(0)} ms`,
    );
  }
} finally {
  await app.close();
}
const selected = results.filter((r) => r.model.startsWith("ollama:"));
const fallback = results.filter((r) => r.model.includes("unavailable"));
const bypass = results.filter((r) => r.model.includes("clarification"));
const times = results
  .filter((r) => !r.error)
  .map((r) => r.latencyMs)
  .sort((a, b) => a - b);
const percentile = (p: number) =>
  times.length
    ? times[
        Math.min(times.length - 1, Math.ceil(times.length * p) - 1)
      ].toFixed(0)
    : "unmeasured";
const report = `# Installed local selector benchmark\n\nStarted ${started}; finished ${new Date().toISOString()}. Synthetic fictional data only. Isolated API: loopback port 8791, closed after run. No .env change, model installation, hosting or paid request.\n\nModel: ${model}; ${installed.details?.parameter_size ?? "unknown size"}; ${installed.details?.quantization_level ?? "unknown quantization"}; installed artifact ${(installed.size / 1e9).toFixed(2)} GB. CPU: ${cpus()[0]?.model ?? "unknown"}; RAM ${(totalmem() / 1024 ** 3).toFixed(1)} GiB. Per-request model budget 8000 ms, including any bounded repair.\n\n| Measure | Observed |\n|---|---:|\n| Cases | ${results.length} |\n| Actual model-selection responses | ${selected.length} |\n| Local-model unavailable → controlled-catalog fallback | ${fallback.length} |\n| No allowed meaning → clarification without model call | ${bypass.length} |\n| HTTP errors | ${results.filter((r) => r.error).length} |\n| Displayed results pass deterministic policy | ${results.filter((r) => r.valid).length} / ${results.length} |\n| Returned meanings remain inside allowed set | ${results.filter((r) => r.subset).length} / ${results.length} |\n| Model responses with same order/set as baseline | ${selected.filter((r) => r.unchanged).length} / ${selected.length} |\n| Successful model calls returning no choices | ${selected.filter((r) => r.returned === 0).length} |\n| Overall HTTP p50 / p95 | ${percentile(0.5)} / ${percentile(0.95)} ms |\n\n| Case | Input | Language | Allowed / returned | Route | HTTP ms |\n|---|---|---|---|---|---:|\n${results.map((r) => `| ${r.id} | ${r.raw} | ${r.lang} | ${r.choices} / ${r.returned} | ${r.error ?? r.model} | ${r.latencyMs.toFixed(0)} |`).join("\n")}\n\n## Interpretation limits\n\nThe model selects prevalidated meaning IDs; it does not author Tamil or English sentences. Many cases offer a single allowed choice. A safe subset is an engineering containment result, not proof of intent understanding, useful ranking, translation quality, clinical benefit or a speed improvement. Fallback rows are catalog success, not model success; bypass rows make no inference call. Ambiguous multi-option prompts have no independently endorsed target meaning in this benchmark, so ranking accuracy is not claimed. The 240-case controlled regression has separate explicit semantic oracles. No human utterance, audio, speech recognition or voice playback was evaluated. Native-language and real-device review remain pending.\n`;
await writeFile(
  new URL("./intent/report-local-selector.md", import.meta.url),
  report,
  "utf8",
);
console.log(
  `Saved selector report: ${selected.length} model responses, ${fallback.length} fallbacks, ${bypass.length} clarification bypasses.`,
);
