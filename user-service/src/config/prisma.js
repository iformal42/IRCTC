import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "./index.js";
const globalForPrisma = global;
const connectionString = config.DATABASE_URL;

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg({ connectionString });
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: ["error", "warn", "info"],
  });
}
const prisma = globalForPrisma.prisma;
export default prisma;
