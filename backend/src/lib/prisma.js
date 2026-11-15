import { PrismaClient } from '@prisma/client';

let client;

// Dibuat malas agar test yang menyuntikkan prisma palsu tidak menyentuh DATABASE_URL.
export function getPrisma() {
  if (!client) client = new PrismaClient();
  return client;
}
