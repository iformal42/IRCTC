class AppErorr extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
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

class ConflictError extends AppErorr {
  constructor(message, code = "CONFLICT") {
    super(message, 409, code);
  }
}

class ServerError extends AppErorr {
  constructor(message, code = "SERVER_ERROR") {
    super(message, 500, code);
  }
}

class TooManyRequest extends AppErorr {
  constructor(message, code = "TOO_MANY_REQUEST") {
    super(message, 429, code);
  }
}

export {
  AppErorr,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ServerError,
  TooManyRequest,
};
