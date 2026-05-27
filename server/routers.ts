import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { transcribeAudio } from "./_core/voiceTranscription";
import { uploadAudio } from "./storage";
import * as db from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const MAX_AUDIO_UPLOAD_BYTES = 18 * 1024 * 1024;
const TRANSCRIPTION_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const memoryInputSchema = z.object({
  id: z.string().min(1),
  vaultId: z.string().min(1),
  title: z.string().min(1),
  theme: z.string().min(1),
  promptId: z.string().optional(),
  promptText: z.string().optional(),
  recordingType: z.enum(["audio", "video", "photo"]).optional(),
  fileUri: z.string().optional(),
  audioUrl: z.string().url().optional(),
  photoUri: z.string().nullable().optional(),
  photoUrl: z.string().url().optional(),
  transcript: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  recordedBy: z.string().min(1),
  recordedByMemberId: z.string().optional(),
  createdAt: z.string().min(1),
  comments: z.array(z.unknown()).optional(),
}).passthrough();

const audioContentTypeSchema = z.enum([
  "audio/aac",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

function assertVaultMember(vault: db.DbVault | null, uid: string): db.DbVault {
  if (!vault) throw new TRPCError({ code: "NOT_FOUND", message: "Vault not found" });
  if (!vault.memberUids.includes(uid)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this vault" });
  }
  return vault;
}

function checkRateLimit(uid: string, action: string): void {
  const now = Date.now();
  const key = `${uid}:${action}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + TRANSCRIPTION_RATE_LIMIT.windowMs });
    return;
  }

  if (current.count >= TRANSCRIPTION_RATE_LIMIT.maxRequests) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Transcription limit reached. Please try again later.",
    });
  }

  current.count += 1;
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  transcription: router({
    upload: protectedProcedure
      .input(z.object({
        key: z.string()
          .regex(/^recordings\/[a-zA-Z0-9._/-]+$/)
          .refine((key) => !key.includes("..") && !key.includes("//"), "Invalid recording key"),
        data: z.string().min(1),
        contentType: audioContentTypeSchema.optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        checkRateLimit(ctx.user.uid, "transcription-upload");
        const buffer = Buffer.from(input.data, "base64");
        if (buffer.byteLength > MAX_AUDIO_UPLOAD_BYTES) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Audio upload is too large" });
        }
        const url = await uploadAudio(input.key, buffer, input.contentType);
        return { url };
      }),
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        checkRateLimit(ctx.user.uid, "transcription-transcribe");
        const result = await transcribeAudio(input);
        if ("error" in result) {
          throw new Error(`${result.error}: ${result.details || ""}`);
        }
        return result;
      }),
  }),

  // ── Cloud Sync ──────────────────────────────────────────────────
  sync: router({
    upgradePlan: protectedProcedure
      .input(z.object({
        vaultId: z.string(),
        additionalMembers: z.number().int().min(10).multipleOf(10),
      }))
      .mutation(async ({ input, ctx }) => {
        const vault = await db.getVaultById(input.vaultId);
        if (!vault) throw new Error("Vault not found");
        if (vault.ownerUid !== ctx.user.uid) throw new Error("Only the owner can upgrade the plan");
        
        const newLimit = vault.memberLimit + input.additionalMembers;
        await db.updateVaultPlan(input.vaultId, vault.plan, newLimit);
        return { success: true, newLimit };
      }),
    getVault: protectedProcedure
      .input(z.object({ inviteCode: z.string().optional(), vaultId: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        if (input.inviteCode) return db.getVaultByInviteCode(input.inviteCode);
        if (input.vaultId) return assertVaultMember(await db.getVaultById(input.vaultId), ctx.user.uid);
        return null;
      }),

    createVault: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string(),
        inviteCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const vault: db.DbVault = {
          ...input,
          ownerUid: ctx.user.uid,
          memberUids: [ctx.user.uid],
          createdAt: new Date().toISOString(),
          plan: "monthly",
          memberLimit: 10,
        };
        await db.createVault(vault);
        return vault;
      }),

    getMemories: protectedProcedure
      .input(z.object({ vaultId: z.string() }))
      .query(async ({ input, ctx }) => {
        assertVaultMember(await db.getVaultById(input.vaultId), ctx.user.uid);
        return db.getMemoriesByVault(input.vaultId);
      }),

    saveMemory: protectedProcedure
      .input(memoryInputSchema)
      .mutation(async ({ input, ctx }) => {
        assertVaultMember(await db.getVaultById(input.vaultId), ctx.user.uid);
        const existing = await db.getMemoryById(input.id);
        if (existing && existing.vaultId !== input.vaultId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Memory belongs to a different vault" });
        }

        const memory: db.DbMemory = {
          ...input,
          uid: ctx.user.uid,
          durationSeconds: input.durationSeconds ?? 0,
        };
        await db.saveMemory(memory);
        return { success: true };
      }),

    deleteMemory: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const memory = await db.getMemoryById(input.id);
        if (!memory) throw new TRPCError({ code: "NOT_FOUND", message: "Memory not found" });
        const vault = assertVaultMember(await db.getVaultById(memory.vaultId), ctx.user.uid);
        const canDelete = memory.uid === ctx.user.uid || vault.ownerUid === ctx.user.uid;
        if (!canDelete) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner or recorder can delete this memory" });
        }

        await db.deleteMemory(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
