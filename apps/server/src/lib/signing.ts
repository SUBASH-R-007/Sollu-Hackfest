import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  LangSchema,
  SignSourceSchema,
  type Lang,
  type SignSource,
} from "@sollu/shared";

export const textHash = (text: string) =>
  createHash("sha256").update(text.normalize("NFC")).digest("hex");
const UtteranceSchema = z
  .object({
    d: z.string(),
    l: LangSchema,
    h: z.string(),
    s: SignSourceSchema,
    e: z.number().int(),
  })
  .strict();
const DeviceSchema = z
  .object({
    kind: z.literal("device"),
    deviceId: z.string().uuid(),
    expires: z.number().int(),
  })
  .strict();
const VoiceSchema = z
  .object({
    kind: z.literal("voice"),
    deviceId: z.string().uuid(),
    provider: z.literal("mock"),
    voiceId: z.string(),
    expires: z.number().int(),
  })
  .strict();
const RoomSchema = z
  .object({
    kind: z.literal("room"),
    roomId: z.string().uuid(),
    role: z.enum(["patient", "care"]),
    expires: z.number().int(),
  })
  .strict();
export type VoiceGrant = z.infer<typeof VoiceSchema>;
export type RoomGrant = z.infer<typeof RoomSchema>;
export class Signer {
  constructor(
    private readonly secret: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (Buffer.byteLength(secret) < 32)
      throw new Error("SERVER_SECRET requires at least 32 bytes");
  }
  private seal(value: unknown): string {
    const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${payload}.${createHmac("sha256", this.secret).update(payload).digest("base64url")}`;
  }
  private open(token: string): unknown {
    if (token.length > 4096) throw new Error("Invalid capability");
    const [payload, mac, extra] = token.split(".");
    if (
      !payload ||
      !mac ||
      extra ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !/^[A-Za-z0-9_-]+$/.test(mac)
    )
      throw new Error("Invalid capability");
    const expected = createHmac("sha256", this.secret).update(payload).digest();
    const received = Buffer.from(mac, "base64url");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw new Error("Invalid capability");
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;
  }
  signText(
    deviceId: string,
    lang: Lang,
    text: string,
    source: SignSource,
  ): string {
    return this.seal({
      d: deviceId,
      l: lang,
      h: textHash(text),
      s: source,
      e:
        Math.floor(this.now() / 1000) +
        (source === "candidate" ? 900 : 365 * 86400),
    });
  }
  verifyText(token: string, deviceId: string, lang: Lang, text: string) {
    const data = UtteranceSchema.parse(this.open(token));
    if (
      data.d !== deviceId ||
      data.l !== lang ||
      data.h !== textHash(text) ||
      data.e <= this.now() / 1000
    )
      throw new Error("Invalid utterance signature");
    return data;
  }
  device(deviceId: string): string {
    return this.seal({
      kind: "device",
      deviceId,
      expires: Math.floor(this.now() / 1000) + 365 * 86400,
    });
  }
  verifyDevice(token: string): string {
    const data = DeviceSchema.parse(this.open(token));
    if (data.expires <= this.now() / 1000)
      throw new Error("Expired device token");
    return data.deviceId;
  }
  voice(deviceId: string, voiceId: string): string {
    return this.seal({
      kind: "voice",
      deviceId,
      provider: "mock",
      voiceId,
      expires: Math.floor(this.now() / 1000) + 365 * 86400,
    });
  }
  verifyVoice(token: string, deviceId: string): VoiceGrant {
    const data = VoiceSchema.parse(this.open(token));
    if (data.deviceId !== deviceId || data.expires <= this.now() / 1000)
      throw new Error("Invalid voice grant");
    return data;
  }
  room(roomId: string, role: "patient" | "care"): string {
    return this.seal({
      kind: "room",
      roomId,
      role,
      expires: Math.floor(this.now() / 1000) + 30 * 86400,
    });
  }
  verifyRoom(
    token: string,
    roomId: string,
    role: "patient" | "care",
  ): RoomGrant {
    const data = RoomSchema.parse(this.open(token));
    if (
      data.roomId !== roomId ||
      data.role !== role ||
      data.expires <= this.now() / 1000
    )
      throw new Error("Invalid room grant");
    return data;
  }
}
