export function sendSuccess(res, data, options = {}) {
  const { status = 200, meta } = options;
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, options) {
  const { status, code, message, details } = options;
  const body = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

