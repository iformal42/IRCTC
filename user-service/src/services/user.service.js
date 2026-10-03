import config from "../config/index.js";
import { redis } from "../config/redis.js";

const getProfile = async (userId) => {
  const redisKey = `user:${userId}:`;
  const cachedUser = await redis.get(redisKey);
  if (cachedUser) {
    return JSON.parse(cachedUser);
  }

  const userProfile = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  const { password, ...safeUser } = userProfile;
  await redis.set(
    redisKey,
    JSON.stringify(safeUser),
    "EX",
    config.REDIS_USER_TTL,
  );
  return safeUser;
};

export default { getProfile };
