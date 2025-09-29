class ErrorResponse extends Error {
  constructor(message, statusCode, code = null, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const createError = (message, statusCode, code, data) => {
  return new ErrorResponse(message, statusCode, code, data);
};

module.exports = { ErrorResponse, createError };
