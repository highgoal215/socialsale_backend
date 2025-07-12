const rawBodyMiddleware = (req, res, next) => {
    if (req.originalUrl.startsWith('/api/transactions/webhook')) {
      let data = '';
      req.setEncoding('utf8');
  
      req.on('data', (chunk) => {
        data += chunk;
      });
  
      req.on('end', () => {
        req.rawBody = data;
        next();
      });
    } else {
      next();
    }
  };
  
  module.exports = rawBodyMiddleware;