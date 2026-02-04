import { verifyToken } from '../config/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

export const isOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!['owner', 'both'].includes(req.user.role)) {
      throw new ForbiddenError('Only charger owners can perform this action');
    }

    next();
  } catch (error) {
    next(error);
  }
};

