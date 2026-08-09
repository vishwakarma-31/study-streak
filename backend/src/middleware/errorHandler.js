function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'resource already exists' });
  }
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'internal server error'
      : err.message;
  if (status === 500) console.error(err);
  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
