import * as admin from "firebase-admin";
import { getFirebaseAdmin } from "./_core/firebaseAdmin";
import { ENV } from "./_core/env";

export type DbUser = {
  uid: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  loginMethod: string | null;
  createdAt: string;
  lastSignedIn: string;
  subscriptionTier: "free" | "paid";
};

export type DbMemory = {
  id: string;
  uid: string;
  vaultId: string;
  title: string;
  theme: string;
  promptId?: string;
  promptText?: string;
  audioUrl?: string;
  photoUrl?: string;
  transcript?: string;
  notes?: string;
  durationSeconds: number;
  recordedBy: string;
  createdAt: string;
};

export type DbVault = {
  id: string;
  name: string;
  inviteCode: string;
  ownerUid: string;
  memberUids: string[];
  createdAt: string;
  plan: "monthly" | "annual";
  memberLimit: number;
};

function db() {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUserByUid(uid: string): Promise<DbUser | null> {
  const snap = await db().collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as DbUser) : null;
}

export async function upsertUser(uid: string, data: Partial<DbUser>): Promise<void> {
  const ref = db().collection("users").doc(uid);
  const now = new Date().toISOString();
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      uid,
      email: null,
      name: null,
      role: uid === ENV.ownerUid ? "admin" : "user",
      loginMethod: null,
      subscriptionTier: "free",
      createdAt: now,
      lastSignedIn: now,
      ...data,
    } satisfies DbUser);
  } else {
    await ref.update({ ...data, lastSignedIn: now });
  }
}

// ── Memories ───────────────────────────────────────────────────────────────

export async function getMemoriesByVault(vaultId: string): Promise<DbMemory[]> {
  const snap = await db()
    .collection("memories")
    .where("vaultId", "==", vaultId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as DbMemory);
}

export async function saveMemory(memory: DbMemory): Promise<void> {
  await db().collection("memories").doc(memory.id).set(memory);
}

export async function deleteMemory(id: string): Promise<void> {
  await db().collection("memories").doc(id).delete();
}

// ── Vaults ─────────────────────────────────────────────────────────────────

export async function getVaultByInviteCode(code: string): Promise<DbVault | null> {
  const snap = await db().collection("vaults").where("inviteCode", "==", code).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as DbVault;
}

export async function getVaultById(id: string): Promise<DbVault | null> {
  const snap = await db().collection("vaults").doc(id).get();
  return snap.exists ? (snap.data() as DbVault) : null;
}

export async function createVault(vault: DbVault): Promise<void> {
  await db().collection("vaults").doc(vault.id).set(vault);
}

export async function updateVaultPlan(vaultId: string, plan: "monthly" | "annual", memberLimit: number): Promise<void> {
  await db().collection("vaults").doc(vaultId).update({ plan, memberLimit });
}

export async function addMemberToVault(vaultId: string, uid: string): Promise<void> {
  const vaultRef = db().collection("vaults").doc(vaultId);
  await db().runTransaction(async (transaction) => {
    const vaultDoc = await transaction.get(vaultRef);
    if (!vaultDoc.exists) throw new Error("Vault not found");
    
    const vault = vaultDoc.data() as DbVault;
    if (vault.memberUids.length >= vault.memberLimit) {
      throw new Error("Member limit reached. Please upgrade your plan to add more members.");
    }
    
    transaction.update(vaultRef, {
      memberUids: admin.firestore.FieldValue.arrayUnion(uid)
    });
  });
}
