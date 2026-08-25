import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT_ERROR");
  }
}

// Raw driver errors reach this handler uncaught; translate known pg error
// codes into client-facing errors so they don't surface as 500s
function normalizeDbError(err: Error): Error {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first && first.path.length > 0 ? first.path.join(".") + ": " : "";
    return new ValidationError(where + (first?.message ?? "Invalid request"));
  }
  const pgCode = (err as { code?: string }).code;
  if (pgCode === "22P02") {
    // invalid_text_representation — e.g. malformed uuid in a path param or body
    return new ValidationError("Invalid ID format");
  }
  if (pgCode === "22001") {
    // string_data_right_truncation — value longer than its column allows
    return new ValidationError("A value exceeds the maximum allowed length");
  }
  if (pgCode === "22008") {
    // datetime_field_overflow — unparseable/out-of-range timestamp input
    return new ValidationError("Invalid date or time value");
  }
  if (pgCode === "23503" || pgCode === "23001") {
    // foreign_key_violation / restrict_violation — e.g. deleting a row other rows reference
    return new ConflictError("Cannot delete or modify: referenced by existing records");
  }
  if (pgCode === "23505") {
    // unique_violation — e.g. two concurrent inserts racing past the service-level check
    return new ConflictError("This record already exists");
  }
  if (pgCode === "23514") {
    // check_violation — a status/enum field carried a value outside its CHECK constraint
    return new ValidationError("Invalid value for one of the fields");
  }
  if (pgCode === "23P01") {
    // exclusion_violation — e.g. the venue_assignments no-double-booking constraint
    return new ConflictError("That time slot conflicts with an existing booking");
  }
  return err;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const normalized = err instanceof AppError ? err : normalizeDbError(err);

  if (normalized instanceof AppError) {
    res.status(normalized.statusCode).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
