export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
    this.details = details;

    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
