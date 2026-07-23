const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    },
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.code = 'NOT_FOUND';
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
