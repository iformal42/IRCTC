class AppErorr extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    ERROR.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppErorr {
  constructor(message, code = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

class NotFoundError extends AppErorr {
  constructor(message, code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

class UnauthorizedError extends AppErorr {
  constructor(message, code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppErorr {
  constructor(message, code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export default {
  AppErorr,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};
