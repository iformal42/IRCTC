import config from "../config/index.js";
import logger from "../config/logger.js";
import axios from "axios";
import {
  GatewayTimeoutError,
  ServiceUnavailableError,
} from "../utils/error.js";
// TODO: Make other services private
const STATUS = {
  CLOSED: "CLOSED",
  HALF_OPEN: "HALF_OPEN",
  OPEN: "OPEN",
};
class CircuitBreaker {
  constructor(
    serviceName,
    timeOut = config.CIRCUITE_BREAKER_TIMOUT,
    threshold = config.CIRCUITE_BREAKER_THRESHOLD,
  ) {
    this.state = STATUS.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.service = serviceName;
    this.timeOut = timeOut;
    this.threshold = threshold;
  }

  async execute(request) {
    if (this.state === STATUS.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new ServiceUnavailableError(
          `Service ${this.service} is temporarily unavailable. Circuit Breaker is Open.`,
        );
      }
      this.state = STATUS.HALF_OPEN;
      logger.info(`Circuit breaker ${this.state} for ${this.service}`);
    }
    try {
      // Only throws an error if the request fails due to network issues or timeouts, not for HTTP error responses.;

      const response = await request();
      this.onSuccess();
      return response;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  async onSuccess() {
    this.failureCount = 0;
    this.state = STATUS.CLOSED;
  }

  async onFailure() {
    if (this.state == STATUS.HALF_OPEN) {
      this.state = STATUS.OPEN;
      this.nextAttempt = Date.now() + this.timeOut * 1000; // 60 sec
      return;
    }
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = STATUS.OPEN;
      this.nextAttempt = Date.now() + this.timeOut * 1000; // 60 sec

      logger.info(`Circuit breaker ${this.state} for ${this.service}`);
    }
  }

  getState() {
    return {
      service: this.service,
      failureCount: this.failureCount,
      state: this.state,
      nextAttemp: this.nextAttempt,
    };
  }
}

const circuiteBreaker = {
  [config.SERVCIES.USER_SERVICE_NAME]: new CircuitBreaker(
    config.SERVCIES.USER_SERVICE_NAME,
  ),
  [config.SERVCIES.ADMIN_SERVICE_NAME]: new CircuitBreaker(
    config.SERVCIES.ADMIN_SERVICE_NAME,
  ),
};

export const forwardProxy = async ({
  serviceUrl,
  path,
  method,
  data,
  headers,
  circuitBreaker,
}) => {
  const url = `${serviceUrl}${path}`;
  console.log({ url });

  const reqConfig = {
    method,
    url,
    timeout: config.SERVICE_TIMEOUT_MS,
    headers: {
      ...headers,
      host: undefined,
      "content-length": undefined,
    },
    validateStatus: (status) => true, // Accept all status codes, we will handle them manually ,so circuite breaker only triggers on network errors or timeouts, not on HTTP error responses.
    maxRedirects: 5,
  };

  if (method.toLowerCase() !== "get" && method.toLowerCase() !== "delete") {
    reqConfig.data = data;
  }
  if (method.toLowerCase() === "get" || method.toLowerCase() === "delete") {
    reqConfig.params = data;
  }
  try {
    const response = await circuitBreaker.execute(() => axios(reqConfig));

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    logger.error(`Error  forwarding to ${serviceUrl}:`, {
      message: error.message,
      code: error.code,
      url,
      method,
    });
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new GatewayTimeoutError(`Request to ${serviceUrl} timed out.`);
    }
    if (error.code === "ECONNREFUSED") {
      throw new ServiceUnavailableError(
        `Cannot connect to ${serviceUrl}. Service may be down.`,
      );
    }
    if (error.response) {
      logger.error(`Service error from ${serviceUrl}:`, {
        status: error.response.status,
        data: error.response.data,
      });

      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      };
    }

    // Network error or service down--You would have seen this in video
    logger.error(`Network error while calling ${serviceUrl}:`, error.message);
    throw new ServiceUnavailableError(
      `Service temporarily unavailable. Please try again later.`,
    );
  }
};

const createproxy = (serviceName, serviceUrl) => {
  const circuitBreaker = circuiteBreaker[serviceName];
  if (!circuitBreaker) {
    throw new Error(
      `Service ${serviceName} is not registered in the circuit breaker.`,
    );
  }
  return async (req, res, next) => {
    try {
      const pathPars = req.path.split("/").filter((part) => part !== "");

      console.log({ pathPars });

      const servicePath = "/" + pathPars.slice(1).join("/");
      const queryParams = req.url.split("?")[1] || "";
      const proxyBody = {
        serviceUrl,
        method: req.method,
        headers: req.headers,
        path: servicePath + (queryParams ? `?${queryParams}` : ""),
        data: req.body,
        circuitBreaker,
      };
      const result = await forwardProxy(proxyBody);

      const excludeHeader = [
        "connection",
        "host",
        "transfer-encoding",
        "keep-alive",
      ];

      Object.keys(result.headers).forEach((header) => {
        if (!excludeHeader.includes(header.toLowerCase())) {
          res.setHeader(header, result.headers[header]);
        }
      });

      res.status(result.status).json(result.data);
    } catch (error) {
      next(error);
    }
  };
};

export default createproxy;
