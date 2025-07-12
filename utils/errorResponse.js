class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.path = '';
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  setPath(path) {
    this.path = path;
    return this;
  }

  toJSON() {
    return {
      status: this.statusCode,
      message: this.message,
      timestamp: this.timestamp,
      path: this.path
    };
  }
}

module.exports = ErrorResponse;