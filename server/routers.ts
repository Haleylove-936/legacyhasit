import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { transcribeAudio } from "./_core/voiceTranscription";
import { uploadAudio } from "./storage";
import * as db from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

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
    upload: publicProcedure
      .input(z.object({
        key: z.string(),
        data: z.string(), // base64
        contentType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.data, "base64");
        const url = await uploadAudio(input.key, buffer, input.contentType);
        return { url };
      }),
    transcribe: publicProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
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
      .query(async ({ input }) => {
        if (input.inviteCode) return db.getVaultByInviteCode(input.inviteCode);
        if (input.vaultId) return db.getVaultById(input.vaultId);
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
      .query(async ({ input }) => {
        return db.getMemoriesByVault(input.vaultId);
      }),

    saveMemory: protectedProcedure
      .input(z.any()) // Using any for now to match DbMemory type
      .mutation(async ({ input, ctx }) => {
        const memory = {
          ...input,
          uid: ctx.user.uid,
        };
        await db.saveMemory(memory);
        return { success: true };
      }),

    deleteMemory: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteMemory(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
