import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "./index.js";
const globalForPrisma = global;
const connctionString = config.DATABASE_URL;
if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg({ datasourceUrl: connctionString });
  const prisma = new PrismaClient({
    adapter,
    log: ["error", "warn", "info"],
  });
  globalForPrisma.prisma = prisma;
}
