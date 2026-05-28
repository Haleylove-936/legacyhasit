// Firebase Storage — profile pictures, photos (small, infrequent access)
// Cloudflare R2    — audio recordings (large, frequent access, zero egress fees)

import * as admin from "firebase-admin";
import { getFirebaseAdmin } from "./_core/firebaseAdmin";
import { ENV } from "./_core/env";

// ── Firebase Storage (images/photos) ──────────────────────────────────────

export async function uploadImage(
  path: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const app = getFirebaseAdmin();
  const bucket = admin.storage(app).bucket();
  const file = bucket.file(path);

  await file.save(data, { contentType, resumable: false });
  await file.makePublic();

  return `https://storage.googleapis.com/${ENV.firebaseStorageBucket}/${path}`;
}

export async function getImageSignedUrl(path: string): Promise<string> {
  const app = getFirebaseAdmin();
  const bucket = admin.storage(app).bucket();
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60, // 1 hour
  });
  return url;
}

// ── Cloudflare R2 (audio recordings) ──────────────────────────────────────

function r2Endpoint() {
  if (!ENV.r2AccountId) throw new Error("R2_ACCOUNT_ID not set");
  return `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`;
}

function r2AuthHeaders(method: string, path: string, contentType?: string) {
  // R2 uses AWS Signature V4 — use the aws4 or @aws-sdk/signature-v4 package in production.
  // For now we use the S3-compatible presigned URL approach via fetch with access key headers.
  // See SETUP_GUIDE.md — you'll install @aws-sdk/client-s3 to handle this properly.
  return {
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export async function uploadAudio(
  key: string,
  data: Buffer | Uint8Array,
  contentType = "audio/mpeg",
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  // Prioritize AWS S3 if configured
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3BucketName) {
    const client = new S3Client({
      region: ENV.awsRegion || "us-east-1",
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: ENV.awsS3BucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

    return `https://${ENV.awsS3BucketName}.s3.${ENV.awsRegion || "us-east-1"}.amazonaws.com/${key}`;
  }

  // Fallback to Cloudflare R2
  if (ENV.r2AccessKeyId && ENV.r2SecretAccessKey && ENV.r2BucketName) {
    const client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint(),
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: ENV.r2BucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

    const base = ENV.r2PublicUrl || `${r2Endpoint()}/${ENV.r2BucketName}`;
    return `${base.replace(/\/$/, "")}/${key}`;
  }

  throw new Error("No audio storage (AWS or R2) configured.");
}

export async function getAudioUrl(key: string): Promise<string> {
  if (ENV.awsAccessKeyId && ENV.awsS3BucketName) {
    return `https://${ENV.awsS3BucketName}.s3.${ENV.awsRegion || "us-east-1"}.amazonaws.com/${key}`;
  }
  const base = ENV.r2PublicUrl || `${r2Endpoint()}/${ENV.r2BucketName}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}
