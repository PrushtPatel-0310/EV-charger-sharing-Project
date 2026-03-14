import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../config/jwt.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../utils/errors.js';

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatar: user.avatar,
  walletBalance: user.walletBalance ?? 0,
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || undefined,
      role: role || 'renter',
      isVerified: true,
    });

    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not provided');
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken,
    }).select('+refreshToken');

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken({ userId: user._id });
    const newRefreshToken = generateRefreshToken({ userId: user._id });

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.clearCookie('refreshToken');
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: { user: { ...user.toObject(), walletBalance: user.walletBalance ?? 0 } },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, avatar, role, email } = req.body;
    const user = await User.findById(req.user._id);

    if (typeof email === 'string' && email.trim().toLowerCase() !== user.email) {
      const nextEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) {
        throw new ConflictError('Email is already in use');
      }
      user.email = nextEmail;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    if (avatar !== undefined) user.avatar = avatar;

    if (role) {
      const allowedRoles = ['owner', 'renter', 'both'];
      if (!allowedRoles.includes(role)) {
        throw new ValidationError('Invalid role');
      }
      user.role = role;
    }

    await user.save();

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    const user = await User.findById(req.user._id).select('+password');

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
