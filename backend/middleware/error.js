export function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: "Not found" });
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || "Internal Server Error" });
}


