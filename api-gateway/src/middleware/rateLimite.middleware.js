import { Queue } from "@datastructures-js/queue";
import { TooManyRequest } from "../utils/error.js";
/**
 * @window in secs
 */
export function windowRateLimit(requestsCount, window) {
  const ipMap = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `rate-${ip}`;
    let queue = new Queue();
    if (ipMap.has(key)) queue = ipMap[key];

    const size = queue.size();
    const currentTime = Date.now();
    const windowMs = window * 1000;
    if (queue.isEmpty() || size < requestsCount) {
      queue.push(currentTime);
    } else {
      const diff = currentTime - queue.front();
      if (diff < windowMs) {
        next(
          new TooManyRequest(
            "Too Many requests. Please try again in some time",
          ),
        );
        return;
      }
      while (!queue.isEmpty() && currentTime - queue.front() >= windowMs) {
        queue.pop();
      }
      queue.push(currentTime);
    }

    ipMap.set(queue);
    next();
  };
}
