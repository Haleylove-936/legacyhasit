import { mysqlTable, serial, varchar, text, timestamp, int, json, boolean } from 'drizzle-orm/mysql-core';

export const familyVaults = mysqlTable('family_vaults', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  inviteCode: varchar('invite_code', { length: 10 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const familyMembers = mysqlTable('family_members', {
  id: varchar('id', { length: 36 }).primaryKey(),
  vaultId: varchar('vault_id', { length: 36 }).notNull().references(() => familyVaults.id),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'elder', 'organizer', 'relative'
  profilePictureUri: text('profile_picture_uri'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const memories = mysqlTable('memories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  vaultId: varchar('vault_id', { length: 36 }).notNull().references(() => familyVaults.id),
  promptId: varchar('prompt_id', { length: 36 }),
  promptText: text('prompt_text'),
  theme: varchar('theme', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  recordingType: varchar('recording_type', { length: 20 }).notNull(), // 'audio', 'video', 'photo'
  fileUri: text('file_uri').notNull(),
  photoUri: text('photo_uri'),
  transcript: text('transcript'),
  notes: text('notes'),
  recordedBy: varchar('recorded_by', { length: 100 }).notNull(),
  recordedByMemberId: varchar('recorded_by_member_id', { length: 36 }).notNull().references(() => familyMembers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  durationSeconds: int('duration_seconds'),
});

export const comments = mysqlTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  memoryId: varchar('memory_id', { length: 36 }).notNull().references(() => memories.id),
  memberId: varchar('member_id', { length: 36 }).notNull().references(() => familyMembers.id),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  reactions: json('reactions').notNull(), // Store emoji -> [memberIds] as JSON
});

export const appSettings = mysqlTable('app_settings', {
  memberId: varchar('member_id', { length: 36 }).primaryKey().references(() => familyMembers.id),
  reminderTime: varchar('reminder_time', { length: 5 }), // HH:MM
  lastPromptDeliveredDate: varchar('last_prompt_delivered_date', { length: 10 }), // YYYY-MM-DD
});
