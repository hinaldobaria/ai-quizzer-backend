function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Please log in again'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  // Handle database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || 'Internal Server Error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;