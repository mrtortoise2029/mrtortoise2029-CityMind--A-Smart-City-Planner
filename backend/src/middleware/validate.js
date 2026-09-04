export const validate = (schema, source = 'params') => (req, res, next) => {
  req.validated = {
    ...req.validated,
    [source]: schema.parse(req[source]),
  };
  next();
};