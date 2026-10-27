import prisma from "../packages/db/client";

/**
 * Additive migration: adds onboarding preference columns to public.users.
 * Safe to re-run (IF NOT EXISTS). Does not touch any other table.
 */
async function main() {
  const statements = [
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "native_language" TEXT`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "target_language" TEXT`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cefr_level" TEXT`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_algorithm" "Algorithm" NOT NULL DEFAULT 'SM2'`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarded_at" TIMESTAMPTZ(6)`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
