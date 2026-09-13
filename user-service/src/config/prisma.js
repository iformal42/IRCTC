import { PrismaClient } from "@prisma/client";
import config from "./index.js";
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient({});

if (config.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
