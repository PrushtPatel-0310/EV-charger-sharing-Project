import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../config/jwt.js';
import { AppError, ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';
import { sendOtpEmail } from '../utils/email.js';

const generateNumericOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user (unverified until OTP)
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || undefined,
      role: role || 'renter',
      isVerified: false,
    });

    const otp = generateNumericOtp();
    user.signupOtp = otp;
    user.signupOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: email, otp, purpose: 'Signup' });

    res.status(201).json({
      success: true,
      message: 'Signup OTP sent to email. Please verify to complete registration.',
      data: { userId: user._id },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedError('Please verify your email to continue');
    }

    const otp = generateNumericOtp();
    user.loginOtp = otp;
    user.loginOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: email, otp, purpose: 'Login' });

    res.json({
      success: true,
      message: 'OTP sent to email. Please verify to complete login.',
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

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: refreshToken,
    }).select('+refreshToken');

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({ userId: user._id });
    const newRefreshToken = generateRefreshToken({ userId: user._id });

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new refresh token in cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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

export const verifyLoginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+loginOtp +loginOtpExpires +refreshToken');

    if (!user) {
      throw new UnauthorizedError('Invalid email or OTP');
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.loginOtpExpires || user.loginOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    if (!user.isVerified) {
      throw new UnauthorizedError('Please verify your email to continue');
    }

    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });

    user.refreshToken = refreshToken;
    user.loginOtp = undefined;
    user.loginOtpExpires = undefined;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          walletBalance: user.walletBalance ?? 0,
        },
        accessToken,
      },
      message: 'Login successful',
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

export const verifySignup = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+signupOtp +signupOtpExpires');

    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.signupOtp || user.signupOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.signupOtpExpires || user.signupOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    user.isVerified = true;
    user.signupOtp = undefined;
    user.signupOtpExpires = undefined;

    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          walletBalance: user.walletBalance ?? 0,
        },
        accessToken,
      },
      message: 'Signup verified successfully',
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
    const { name, phone, address, avatar, role } = req.body;
    const user = await User.findById(req.user._id);

    // Email changes must use request-email-change/verify-email-change flow

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    if (avatar) user.avatar = avatar;

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
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      throw new ValidationError('OTP and new password are required');
    }

    const user = await User.findById(req.user._id).select('+passwordChangeOtp +passwordChangeOtpExpires +password');

    if (!user.passwordChangeOtp || user.passwordChangeOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.passwordChangeOtpExpires || user.passwordChangeOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    user.password = newPassword;
    user.passwordChangeOtp = undefined;
    user.passwordChangeOtpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordChangeOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const otp = generateNumericOtp();
    user.passwordChangeOtp = otp;
    user.passwordChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: user.email, otp, purpose: 'Password Change' });

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User');
    }

    const otp = generateNumericOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: email, otp, purpose: 'Password Reset' });

    res.json({
      success: true,
      message: 'OTP sent to email',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpires +password');

    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.resetOtpExpires || user.resetOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

export const requestEmailChange = async (req, res, next) => {
  try {
    const { userId, newEmail } = req.body;

    const user = await User.findById(userId).select('+emailChangeOtp +emailChangeOtpExpires +pendingEmail');
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.email === newEmail) {
      throw new ConflictError('New email must be different from current email');
    }

    const existing = await User.findOne({ email: newEmail, _id: { $ne: userId } });
    if (existing) {
      throw new ConflictError('Email is already in use');
    }

    const otp = generateNumericOtp();
    user.pendingEmail = newEmail;
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: newEmail, otp, purpose: 'Email Change' });

    res.json({
      success: true,
      message: 'Verification code sent to new email',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+emailChangeOtp +emailChangeOtpExpires +pendingEmail');
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.pendingEmail) {
      throw new ValidationError('No pending email change request');
    }

    if (!user.emailChangeOtp || user.emailChangeOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.emailChangeOtpExpires || user.emailChangeOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    const existing = await User.findOne({ email: user.pendingEmail, _id: { $ne: userId } });
    if (existing) {
      throw new ConflictError('Email is already in use');
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeOtp = undefined;
    user.emailChangeOtpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const requestProfileUpdateOtp = async (req, res, next) => {
  try {
    const { name, phone, role, avatar, email } = req.body;

    const user = await User.findById(req.user._id).select(
      '+profileUpdateOtp +profileUpdateOtpExpires +pendingProfileUpdate'
    );
    if (!user) {
      throw new NotFoundError('User');
    }

    const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : user.email;
    if (nextEmail && nextEmail !== user.email) {
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existing) {
        throw new ConflictError('Email is already in use');
      }
    }

    if (role) {
      const allowedRoles = ['owner', 'renter', 'both'];
      if (!allowedRoles.includes(role)) {
        throw new ValidationError('Invalid role');
      }
    }

    const pendingProfileUpdate = {
      name: typeof name === 'string' ? name.trim() : user.name,
      phone: typeof phone === 'string' ? phone.trim() : user.phone,
      role: role || user.role,
      avatar: typeof avatar === 'string' ? avatar : user.avatar,
      email: nextEmail,
    };

    const otp = generateNumericOtp();
    user.pendingProfileUpdate = pendingProfileUpdate;
    user.profileUpdateOtp = otp;
    user.profileUpdateOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: nextEmail || user.email, otp, purpose: 'Profile Update' });

    res.json({
      success: true,
      message: 'OTP sent for profile update verification',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyProfileUpdateOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.user._id).select(
      '+profileUpdateOtp +profileUpdateOtpExpires +pendingProfileUpdate'
    );
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.profileUpdateOtp || user.profileUpdateOtp !== otp) {
      throw new ValidationError('Invalid OTP');
    }

    if (!user.profileUpdateOtpExpires || user.profileUpdateOtpExpires.getTime() < Date.now()) {
      throw new ValidationError('OTP has expired');
    }

    const pending = user.pendingProfileUpdate;
    if (!pending) {
      throw new ValidationError('No pending profile update request');
    }

    if (pending.email && pending.email !== user.email) {
      const existing = await User.findOne({ email: pending.email, _id: { $ne: user._id } });
      if (existing) {
        throw new ConflictError('Email is already in use');
      }
      user.email = pending.email;
    }

    user.name = pending.name || user.name;
    user.phone = pending.phone ?? user.phone;
    user.role = pending.role || user.role;
    user.avatar = pending.avatar ?? user.avatar;

    user.pendingProfileUpdate = undefined;
    user.profileUpdateOtp = undefined;
    user.profileUpdateOtpExpires = undefined;

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

