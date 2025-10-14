import { validationResult } from "express-validator";

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ ok: false, errors: errors.array() });
}


