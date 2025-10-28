import helmet from "helmet";

/**
 * Security middleware với các headers bảo mật
 */
export function securityMiddleware() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    
    // X-Frame-Options
    frameguard: { action: 'deny' },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection
    xssFilter: true,
    
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // HSTS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    
    // Hide X-Powered-By
    hidePoweredBy: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: true,
    
    // IE No Open
    ieNoOpen: true,
    
    // Permissions Policy
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: []
    }
  });
}

/**
 * CORS middleware với cấu hình bảo mật
 */
export function secureCorsMiddleware() {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://yourdomain.com'
    ];

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Preflight request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
}

/**
 * Request size limiter
 */
export function requestSizeLimiter(maxSize = '10mb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseSize(maxSize);

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({ 
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }

    next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) {
    return 1024 * 1024; // Default 1MB
  }

  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return Math.floor(value * units[unit]);
}

/**
 * IP whitelist middleware
 */
export function ipWhitelistMiddleware(allowedIPs = []) {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No restrictions
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const isAllowed = allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation
        return isIPInCIDR(clientIP, ip);
      } else {
        // Exact match
        return clientIP === ip;
      }
    });

    if (!isAllowed) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Your IP address is not allowed'
      });
    }

    next();
  };
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip, cidr) {
  try {
    const [network, prefixLength] = cidr.split('/');
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
    
    return (ipNum & mask) === (networkNum & mask);
  } catch (error) {
    return false;
  }
}

/**
 * Convert IP to number
 */
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };

      // Log to console (in production, use proper logging service)
      console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} (${logData.duration})`);

      originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware() {
  return (err, req, res, next) => {
    // Log error
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
        details: isDevelopment ? err.details : undefined
      });
    }

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication'
      });
    }

    if (err.name === 'ForbiddenError') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Default error
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? err.message : 'Something went wrong',
      ...(isDevelopment && { stack: err.stack })
    });
  };
}

/**
 * Session security middleware
 */
export function sessionSecurityMiddleware() {
  return (req, res, next) => {
    // Regenerate session ID on login
    if (req.session && req.session.regenerate) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
        }
        next();
      });
    } else {
      next();
    }
  };
}

/**
 * API versioning middleware
 */
export function apiVersioningMiddleware() {
  return (req, res, next) => {
    const apiVersion = req.headers['api-version'] || 'v1';
    
    // Validate API version
    const supportedVersions = ['v1', 'v2'];
    if (!supportedVersions.includes(apiVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        supportedVersions,
        requestedVersion: apiVersion
      });
    }

    req.apiVersion = apiVersion;
    next();
  };
}
