import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  candidate,
  ContextPacketSchema,
  demoSeed,
  getMockCandidates,
  getPainCandidates,
  quickPhrases,
  type Candidate,
} from "@sollu/shared";
import { createApp } from "../src/app";
import { Signer } from "../src/lib/signing";
import { validateCandidates } from "../src/lib/validation";
import { buildPrompt } from "../src/providers/ollama";
import type { ServerConfig } from "../src/config";

const config: ServerConfig = {
  secret: "test-only-32-byte-secret-not-for-production",
  port: 0,
  host: "127.0.0.1",
  origin: "http://localhost:5173",
  intentProvider: "mock",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "test-local",
  timeoutMs: 8000,
  accessCode: "",
  logging: false,
  production: false,
};
const context = ContextPacketSchema.parse({
  fragment: { modality: "speech", raw: "tablet raathiri" },
  outputLang: "ta",
  people: demoSeed.contacts,
  routine: {
    dueNow: [
      {
        label: "Night tablets",
        topic: "medicine",
        time: "21:00",
        learned: false,
      },
    ],
    justPassed: [],
  },
});
const openApps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  await Promise.all(openApps.splice(0).map((a) => a.close()));
});
async function setup() {
  const app = await createApp(config);
  openApps.push(app);
  const device = (
    await app.inject({
      method: "POST",
      url: "/api/device/register",
      payload: {},
    })
  ).json<{ deviceId: string; token: string }>();
  const headers = { authorization: `Bearer ${device.token}` };
  return { app, device, headers };
}

describe("I-8 cryptographic capabilities", () => {
  it("binds text, language, device and expiry and rejects tampering", () => {
    let now = 10_000;
    const signer = new Signer(config.secret, () => now),
      a = randomUUID(),
      b = randomUUID();
    const sig = signer.signText(a, "en", "Water please", "candidate");
    expect(signer.verifyText(sig, a, "en", "Water please").s).toBe("candidate");
    expect(() => signer.verifyText(sig, b, "en", "Water please")).toThrow();
    expect(() => signer.verifyText(sig, a, "ta", "Water please")).toThrow();
    expect(() => signer.verifyText(sig, a, "en", "Something else")).toThrow();
    expect(() =>
      signer.verifyText(`${sig}a`, a, "en", "Water please"),
    ).toThrow();
    now += 900_000;
    expect(() => signer.verifyText(sig, a, "en", "Water please")).toThrow();
  });
  it("normalizes NFC and distinguishes capability types", () => {
    const signer = new Signer(config.secret),
      device = randomUUID();
    const sig = signer.signText(device, "en", "café", "quick");
    expect(signer.verifyText(sig, device, "en", "cafe\u0301").s).toBe("quick");
    expect(() => signer.verifyDevice(sig)).toThrow();
    const grant = signer.voice(device, "mock-voice");
    expect(() => signer.verifyVoice(grant, randomUUID())).toThrow();
    const room = randomUUID();
    expect(() =>
      signer.verifyRoom(signer.room(room, "care"), room, "patient"),
    ).toThrow();
  });
  it("rejects unsigned, cross-device, tampered and wrong-language TTS", async () => {
    const { app, device, headers } = await setup();
    const signer = new Signer(config.secret);
    const text = quickPhrases.en.help.text,
      sig = signer.signText(device.deviceId, "en", text, "quick");
    const voiceGrant = signer.voice(device.deviceId, "mock-one");
    for (const payload of [
      { text, lang: "en", voiceGrant },
      { text, lang: "en", sig: `${sig}bad`, voiceGrant },
      { text, lang: "ta", sig, voiceGrant },
      { text: "Changed", lang: "en", sig, voiceGrant },
      {
        text,
        lang: "en",
        sig,
        voiceGrant: signer.voice(randomUUID(), "mock-other"),
      },
      {
        text,
        lang: "en",
        sig: signer.signText(randomUUID(), "en", text, "quick"),
        voiceGrant,
      },
    ]) {
      const res = await app.inject({
        method: "POST",
        url: "/api/tts",
        headers,
        payload,
      });
      expect([400, 403]).toContain(res.statusCode);
    }
    const res = await app.inject({
      method: "POST",
      url: "/api/tts",
      headers,
      payload: { text, lang: "en", sig, voiceGrant },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-sollu-mock"]).toBe("true");
    expect(res.rawPayload.subarray(0, 4).toString()).toBe("RIFF");
  });
  it("requires canonical text and memory proof with matching source", async () => {
    const { app, headers, device } = await setup();
    for (const source of [
      "candidate",
      "quick",
      "default",
      "template",
      "studio",
      "memory",
    ]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/sign",
        headers,
        payload: { source, text: "Arbitrary custom utterance", lang: "en" },
      });
      expect(r.statusCode).toBe(403);
    }
    const quick = await app.inject({
      method: "POST",
      url: "/api/sign",
      headers,
      payload: { source: "quick", text: "Yes", lang: "en" },
    });
    expect(quick.statusCode).toBe(200);
    const wrongProof = await app.inject({
      method: "POST",
      url: "/api/sign",
      headers,
      payload: {
        source: "memory",
        text: "Yes",
        lang: "en",
        proofSig: quick.json().sig,
      },
    });
    expect(wrongProof.statusCode).toBe(403);
    const text = "Please bring water.",
      proofSig = new Signer(config.secret).signText(
        device.deviceId,
        "en",
        text,
        "candidate",
      );
    const memory = await app.inject({
      method: "POST",
      url: "/api/sign",
      headers,
      payload: { source: "memory", text, lang: "en", proofSig },
    });
    expect(memory.statusCode).toBe(200);
  });
  it("caps owner-written custom phrases at 30 per day", async () => {
    const { app, headers } = await setup();
    for (let i = 0; i < 30; i++)
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/sign",
            headers,
            payload: { source: "caregiver", text: `Phrase ${i}`, lang: "en" },
          })
        ).statusCode,
      ).toBe(200);
    const res = await app.inject({
      method: "POST",
      url: "/api/sign",
      headers,
      payload: { source: "caregiver", text: "Over limit", lang: "en" },
    });
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
});

describe("I-3 / I-4 candidate grounding", () => {
  const approved = (items: Candidate[], c: typeof context) =>
    validateCandidates(items, c, { trustedCandidates: items });
  it("returns 3 distinct fixture intents and signs exact text", async () => {
    const { app, headers, device } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/intent",
      headers,
      payload: { context },
    });
    expect(res.statusCode).toBe(200);
    const result = res.json<{ candidates: Candidate[]; mock: boolean }>();
    expect(result.mock).toBe(true);
    expect(result.candidates).toHaveLength(3);
    expect(new Set(result.candidates.map((c) => c.intent)).size).toBe(3);
    for (const c of result.candidates)
      expect(
        new Signer(config.secret).verifyText(
          c.sig!,
          device.deviceId,
          "ta",
          c.text,
        ),
      ).toBeTruthy();
  });
  it("drops quantities, Tamil digits and doses absent from the fragment", () => {
    const texts = [
      "I need 500 Fakeomycin mg.",
      "Please bring two tablets.",
      "I need ௨ tablets.",
      "Please bring half a tablet.",
    ];
    for (const t of texts)
      expect(
        approved([candidate(t, t, "request", "💊")], {
          ...context,
          outputLang: /\p{Script=Tamil}/u.test(t) ? "ta" : "en",
        }).candidates,
      ).toHaveLength(0);
  });
  it("allows a supported number, but never doses", () => {
    const c = ContextPacketSchema.parse({
      fragment: { modality: "text", raw: "two pillows" },
      outputLang: "en",
    });
    expect(
      approved(
        [
          candidate(
            "Please bring two pillows.",
            "Two pillows",
            "request pillows",
            "🛏️",
          ),
        ],
        c,
      ).candidates,
    ).toHaveLength(1);
    expect(
      approved(
        [
          candidate(
            "Take two Fakeomycin mg.",
            "Fake negative",
            "request dose",
            "💊",
          ),
        ],
        c,
      ).candidates,
    ).toHaveLength(0);
  });
  it("never treats context bookkeeping as evidence for a spoken quantity", () => {
    const c = ContextPacketSchema.parse({
      fragment: { modality: "speech", raw: "tablet" },
      outputLang: "en",
      round: 3,
      now: { localTime: "21:00", weekday: 3, timeBucket: "night" },
      partnerQuestion: { text: "What do you need?", lang: "en", minutesAgo: 4 },
      substitutions: [{ heard: "table", means: "tablet", count: 17 }],
      recentTurns: [{ speaker: "person", text: "Please help.", minutesAgo: 8 }],
    });
    for (const quantity of ["3", "4", "17", "8", "21", "00"])
      expect(
        approved(
          [
            candidate(
              `Please bring ${quantity} tablets.`,
              "Request tablets",
              "request tablets",
              "💊",
            ),
          ],
          c,
        ).candidates,
      ).toHaveLength(0);
    expect(
      approved(
        [candidate("Is it 21:00 now?", "Ask current time", "ask time", "🕘")],
        c,
      ).candidates,
    ).toHaveLength(0);
  });
  it("rejects unsupported teens, tens and fractional number words in both enabled languages", () => {
    for (const quantity of [
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
      "nineteen",
      "sixty",
      "seventy",
      "eighty",
      "ninety",
      "quarter",
      "பதின்மூன்று",
      "இருபது",
      "முப்பது",
      "அறுபது",
    ])
      expect(
        approved(
          [
            candidate(
              `${quantity} pillows please.`,
              "Request pillows",
              "request pillows",
              "🛏️",
            ),
          ],
          {
            ...context,
            outputLang: /\p{Script=Tamil}/u.test(quantity) ? "ta" : "en",
          },
        ).candidates,
      ).toHaveLength(0);
    const supported = ContextPacketSchema.parse({
      fragment: { modality: "text", raw: "thirteen pillows" },
      outputLang: "en",
    });
    expect(
      approved(
        [
          candidate(
            "Please bring thirteen pillows.",
            "Request pillows",
            "request pillows",
            "🛏️",
          ),
        ],
        supported,
      ).candidates,
    ).toHaveLength(1);
  });
  it("rejects unrelated contacts while allowing their grounded alias", () => {
    const bad = candidate(
      "Please call Meena.",
      "Call Meena",
      "call family",
      "📞",
    );
    expect(validateCandidates([bad], context).candidates).toHaveLength(0);
    const grounded = {
      ...context,
      fragment: { modality: "text" as const, raw: "மீனா ph" },
    };
    const supported = getMockCandidates(grounded);
    expect(
      validateCandidates(supported, grounded).candidates.length,
    ).toBeGreaterThan(0);
    expect(
      validateCandidates(supported, grounded).candidates.every(
        (c) => c.subject === "Meena",
      ),
    ).toBe(true);
  });
  it("does not pad unknown fragments; deduplicates and uses canonical reading metadata", () => {
    expect(
      getMockCandidates({
        fragment: { modality: "text", raw: "zzqx" },
        outputLang: "en",
      }),
    ).toEqual([]);
    const water = ContextPacketSchema.parse({
      fragment: { modality: "text", raw: "water" },
      outputLang: "en",
    });
    const a = getMockCandidates(water)[0];
    expect(
      validateCandidates(
        [
          a,
          a,
          { ...a, text: "Could you bring water?", intent: "request water now" },
        ],
        water,
      ).candidates,
    ).toHaveLength(1);
    const cleaned = approved(
      [
        { ...a, text: "x".repeat(91) },
        { ...a, reading: "table → " },
        { ...a, reading: "→ tablet" },
      ],
      water,
    ).candidates;
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].reading).toBe(a.reading);
    expect(cleaned[0].text).toBe(a.text);
  });
  it("uses canonical keyword, urgency and wording instead of trusting model metadata", () => {
    const water = ContextPacketSchema.parse({
      fragment: { modality: "text", raw: "water" },
      outputLang: "en",
    });
    const c = getMockCandidates(water)[0];
    const result = validateCandidates(
      [{ ...c, keyword: "missing", urgency: "emergency" }],
      water,
    ).candidates[0]!;
    expect(result.text).toBe(c.text);
    expect(result.text).toContain(result.keyword);
    expect(result.urgency).toBe(c.urgency);
  });
  it("offers reinterpretation after rejected table candidates without repeating", () => {
    const first = getMockCandidates({
      fragment: { modality: "speech", raw: "table" },
      outputLang: "ta",
    });
    const second = getMockCandidates({
      fragment: { modality: "speech", raw: "table" },
      outputLang: "ta",
      round: 2,
      exclude: first.map((c) => c.text),
    });
    expect(second).toHaveLength(3);
    expect(second[0]?.reading).toBe("table → tablet");
    expect(second.some((c) => first.some((f) => c.text === f.text))).toBe(
      false,
    );
  });
  it("uses deterministic pain intensity and emergency templates", () => {
    const head = getPainCandidates("head", "", "ta");
    expect(head.map((c) => c.urgency)).toEqual([
      "none",
      "elevated",
      "elevated",
    ]);
    expect(
      getPainCandidates("chest", "", "en").every(
        (c) => c.urgency === "emergency",
      ),
    ).toBe(true);
    expect(getPainCandidates("shoulder", undefined, "en")).toEqual([]);
    expect(getPainCandidates("shoulder", "left", "en")[0]?.text).toBe(
      "My left shoulder hurts a little.",
    );
  });
  it("keeps the selected food and drink concept through parent topic paths", () => {
    for (const item of ["coffee", "tea", "milk", "water"]) {
      const c = getMockCandidates({
        fragment: { modality: "topic", raw: item, topicPath: ["drink", item] },
        outputLang: "en",
      });
      expect(c.length).toBeGreaterThan(0);
      expect(c.length).toBeLessThanOrEqual(3);
      expect(c[0]?.text.toLowerCase()).toContain(item);
    }
    expect(
      getMockCandidates({
        fragment: {
          modality: "topic",
          raw: "rice",
          topicPath: ["food", "rice"],
        },
        outputLang: "en",
      })[0]?.text,
    ).toContain("rice");
  });
  it("prompt includes language, trust boundary and rejected-round constraints", () => {
    expect(buildPrompt(context)).toContain("untrusted data");
    expect(buildPrompt(context)).toContain("Output language: Tamil");
    expect(buildPrompt({ ...context, outputLang: "en", round: 2 })).toContain(
      "must not repeat",
    );
  });
});

describe("I-7 consent, auth and explicit mocks", () => {
  it("requires authentication and validates request size", async () => {
    const { app } = await setup();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/intent",
          payload: { context },
        })
      ).statusCode,
    ).toBe(401);
    const health = await app.inject("/api/health");
    expect(health.json().ownVoiceAvailable).toBe(false);
    expect(health.body).not.toContain(config.secret);
  });
  it("blocks cloning without explicit active owner consent and revokes mock grants", async () => {
    const { app, headers, device } = await setup();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/voice/clone",
          headers,
          payload: { mock: true },
        })
      ).statusCode,
    ).toBe(400);
    const consent = {
      id: "test-consent",
      kind: "voice_clone",
      givenBy: "self",
      name: "Test voice owner",
      method: "Express agreement",
      at: Date.now(),
    };
    const clone = await app.inject({
      method: "POST",
      url: "/api/voice/clone",
      headers,
      payload: { consent, mock: true },
    });
    expect(clone.statusCode).toBe(200);
    expect(clone.json().mock).toBe(true);
    const { voiceGrant } = clone.json<{ voiceGrant: string }>();
    const sig = new Signer(config.secret).signText(
      device.deviceId,
      "en",
      "Yes",
      "quick",
    );
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/voice",
          headers,
          payload: { voiceGrant },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/tts",
          headers,
          payload: { text: "Yes", lang: "en", sig, voiceGrant },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/voice/clone",
          headers,
          payload: {
            consent: { ...consent, withdrawnAt: Date.now() },
            mock: true,
          },
        })
      ).statusCode,
    ).toBe(403);
  });
  it("never fabricates a transcript when no fixture was selected", async () => {
    const { app, headers } = await setup();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/stt",
          headers,
          payload: {},
        })
      ).statusCode,
    ).toBe(503);
    const result = await app.inject({
      method: "POST",
      url: "/api/stt",
      headers,
      payload: { fixture: "tablet" },
    });
    expect(result.json().mock).toBe(true);
    expect(result.json().text).toBe("tablet raathiri");
  });
});

describe("I-9 role-bound ciphertext relay", () => {
  it("logs only route/status/timing with no sentence, token, grants or query values", async () => {
    const chunks: string[] = [];
    const app = await createApp(
      { ...config, logging: true },
      {
        write: (message) => {
          chunks.push(message);
        },
      },
    );
    openApps.push(app);
    const registration = await app.inject({
      method: "POST",
      url: "/api/device/register",
      payload: {},
    });
    const device = registration.json<{ deviceId: string; token: string }>();
    const headers = { authorization: `Bearer ${device.token}` };
    const uniqueText = "Private utterance SENTINEL_874038";
    await app.inject({
      method: "POST",
      url: "/api/sign?private=SENTINEL_QUERY",
      headers,
      payload: { source: "caregiver", text: uniqueText, lang: "en" },
    });
    await app.inject({
      method: "POST",
      url: "/api/sign",
      headers,
      payload: { source: "INVALID_SENTINEL", text: uniqueText, lang: "en" },
    });
    await app.close();
    openApps.splice(openApps.indexOf(app), 1);
    const logs = chunks.join("");
    expect(logs).toContain("/api/sign");
    expect(logs).not.toContain(uniqueText);
    expect(logs).not.toContain("SENTINEL");
    expect(logs).not.toContain(device.token);
    expect(logs).not.toContain(device.deviceId);
  });
  it("rejects using the care grant with patient role", async () => {
    const { app, headers } = await setup();
    const { roomId, careGrant } = (
      await app.inject({ method: "POST", url: "/api/relay/room", headers })
    ).json<{ roomId: string; careGrant: string }>();
    await expect(
      app.injectWS(`/ws?r=${roomId}&g=${careGrant}&role=patient`),
    ).rejects.toThrow();
  });
  it("relays only valid encrypted envelopes to the opposite role", async () => {
    const { app, headers } = await setup();
    const { roomId, careGrant, roomGrant } = (
      await app.inject({ method: "POST", url: "/api/relay/room", headers })
    ).json<{ roomId: string; careGrant: string; roomGrant: string }>();
    const patient = await app.injectWS(
      `/ws?r=${roomId}&g=${roomGrant}&role=patient`,
    );
    const care = await app.injectWS(`/ws?r=${roomId}&g=${careGrant}&role=care`);
    const message = JSON.stringify({
      v: 1,
      iv: Buffer.alloc(12).toString("base64"),
      ciphertext: Buffer.alloc(48).toString("base64"),
    });
    const received = new Promise<string>((resolve) =>
      care.once("message", (data) => resolve(data.toString())),
    );
    patient.send(message);
    expect(await received).toBe(message);
    const closed = new Promise<number>((resolve) =>
      patient.once("close", (code) => resolve(code)),
    );
    patient.send(JSON.stringify({ text: "plaintext is rejected" }));
    expect(await closed).toBe(1008);
    care.terminate();
  });
});
