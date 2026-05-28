const DEV_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

function readList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export const ENV = {
  isProduction: process.env.NODE_ENV === "production",

  // Firebase Admin
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),

  // Firebase Storage (images/photos)
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",

  // Cloudflare R2 (audio files — no egress fees)
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "", // your r2.dev or custom domain

  // AWS S3
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "",
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME ?? "",

  // Groq (Whisper transcription)
  groqApiKey: process.env.GROQ_API_KEY ?? "",

  // OpenAI / LLM (Gemini via OpenAI-compatible endpoint if needed)
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",

  // FORGE (texturing/image generation proxy)
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",

  // OAuth server integration
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  appId: process.env.APP_ID ?? "",

  // RevenueCat webhook secret
  revenueCatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? "",

  // Session
  cookieSecret: process.env.JWT_SECRET ?? "",

  // Owner
  ownerUid: process.env.OWNER_UID ?? "",

  // API access
  allowedOrigins: readList("CORS_ORIGINS"),
};

export function getAllowedOrigins(): string[] {
  return ENV.isProduction ? ENV.allowedOrigins : [...DEV_ALLOWED_ORIGINS, ...ENV.allowedOrigins];
}

export function validateServerEnv(): void {
  const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
  const missing = required.filter((name) => !(process.env[name] ?? "").trim());

  if (!missing.length) return;

  const message = `Missing required server environment variables: ${missing.join(", ")}`;
  if (ENV.isProduction) throw new Error(message);

  console.warn(`[env] ${message}`);
}
