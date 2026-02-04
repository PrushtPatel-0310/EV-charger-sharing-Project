import morgan from 'morgan';

export const logger = morgan('dev');

export const logError = (error, req) => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req?.originalUrl,
    method: req?.method,
    timestamp: new Date().toISOString(),
  });
};

