type ErrorWithCode = {
  code?: unknown;
  errorCode?: unknown;
  message?: unknown;
  cause?: unknown;
};

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as ErrorWithCode;
  if (candidate.code === "P1001" || candidate.errorCode === "P1001") {
    return true;
  }

  if (
    typeof candidate.message === "string" &&
    candidate.message.includes("Can't reach database server")
  ) {
    return true;
  }

  return isDatabaseUnavailableError(candidate.cause);
}
