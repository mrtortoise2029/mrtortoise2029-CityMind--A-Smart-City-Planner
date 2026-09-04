export function httpError(status, message, code = 'REQUEST_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
