const isDatabaseUnavailableError = (err) => {
  const message = `${err.message || ""} ${err.cause?.message || ""}`;

  return (
    err.name === "MongoNetworkError" ||
    err.name === "MongoServerSelectionError" ||
    /buffering timed out/i.test(message) ||
    /tlsv1 alert internal error/i.test(message) ||
    /ssl3_read_bytes/i.test(message)
  );
};

export const errorHandler = (err, _req, res, _next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  const statusCode =
    err.code === "LIMIT_FILE_SIZE" ? 413 : isDatabaseUnavailableError(err) ? 503 : err.statusCode || 500;
  const message =
    err.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large"
      : statusCode === 503
        ? "Database temporarily unavailable. Please try again shortly."
      : statusCode === 500
        ? "Internal server error"
        : err.message;

  res.status(statusCode).json({
    message,
  });
};
