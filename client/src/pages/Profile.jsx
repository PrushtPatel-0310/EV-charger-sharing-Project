import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { uploadService } from '../services/uploadService.js';
import { paymentService } from '../services/paymentService.js';
import { walletService } from '../services/walletService.js';

let stripePromise;

const getStripeClient = (fallbackPublishableKey = '') => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || fallbackPublishableKey;
    if (!key) {
      throw new Error('Stripe publishable key is missing');
    }
    stripePromise = loadStripe(key);
  }

  return stripePromise;
};

const glassCard =
  'rounded-2xl border border-gray-200/70 bg-white/80 p-5 backdrop-blur-md shadow-sm transition-transform duration-200 hover:shadow-md';

const AVATAR_PREVIEW_SIZE = 224;
const AVATAR_OUTPUT_SIZE = 600;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getCoverDimensions = (width, height, targetSize) => {
  if (!width || !height) {
    return { width: targetSize, height: targetSize };
  }

  const scale = Math.max(targetSize / width, targetSize / height);
  return {
    width: width * scale,
    height: height * scale,
  };
};

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const avatarDragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    role: 'renter',
    email: '',
    avatar: '',
  });

  const [uploading, setUploading] = useState(false);

  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [showAvatarActions, setShowAvatarActions] = useState(false);
  const [showAvatarAdjustModal, setShowAvatarAdjustModal] = useState(false);
  const [avatarAdjustSrc, setAvatarAdjustSrc] = useState('');
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarNaturalSize, setAvatarNaturalSize] = useState({ width: 0, height: 0 });

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [profileOtp, setProfileOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [pendingProfilePayload, setPendingProfilePayload] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordOtpStatus, setPasswordOtpStatus] = useState('');
  const [showSecurityBox, setShowSecurityBox] = useState(false);

  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [addingMoney, setAddingMoney] = useState(false);
  const [walletMessage, setWalletMessage] = useState('');
  const [walletError, setWalletError] = useState('');

  const [paymentMode, setPaymentMode] = useState('dummy');
  const [dummyPaymentMethod, setDummyPaymentMethod] = useState('card');
  const [dummyCardNumber, setDummyCardNumber] = useState('4111111111111111');
  const [dummyCardExpiry, setDummyCardExpiry] = useState('12/30');
  const [dummyCardCvv, setDummyCardCvv] = useState('123');
  const [dummyUpiId, setDummyUpiId] = useState('test@upi');

  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  const avatarInitial = (profileForm.name || user?.name || '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'renter',
      email: user.email || '',
      avatar: user.avatar || '',
    });
  }, [user]);

  useEffect(() => {
    let active = true;

    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        setTransactionsError('');
        const res = await walletService.getTransactions();
        if (!active) return;
        const list = res?.data?.data?.transactions || [];
        setTransactions(list);
      } catch (error) {
        if (!active) return;
        setTransactionsError(error?.response?.data?.message || 'Unable to load transactions');
      } finally {
        if (active) setTransactionsLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const walletTopup = params.get('walletTopup');

    if (walletTopup === 'cancelled') {
      setWalletError('Payment was cancelled.');
      params.delete('walletTopup');
      params.delete('session_id');
      const updatedUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', updatedUrl);
      return;
    }

    if (walletTopup !== 'success' || !sessionId || !user?._id) {
      return;
    }

    let isMounted = true;

    const verifyStripeTopup = async () => {
      setAddingMoney(true);
      setWalletError('');
      try {
        const verifyRes = await paymentService.verifyStripeSession({
          sessionId,
          userId: user._id,
        });
        const updatedUser = verifyRes?.data?.data?.user;
        if (updatedUser && isMounted) {
          updateUser(updatedUser);
        }
        if (isMounted) {
          setWalletMessage('Payment successful! Wallet updated.');
          setShowAddMoneyModal(false);
        }
      } catch (error) {
        if (isMounted) {
          setWalletError(error?.response?.data?.message || 'Could not verify payment');
        }
      } finally {
        params.delete('walletTopup');
        params.delete('session_id');
        const updatedUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', updatedUrl);
        if (isMounted) {
          setAddingMoney(false);
        }
      }
    };

    verifyStripeTopup();

    return () => {
      isMounted = false;
    };
  }, [user?._id, updateUser]);

  const recentTransactions = useMemo(() => transactions.slice(0, 3), [transactions]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleProfileChange = (event) => {
    setProfileForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const previewCover = useMemo(
    () => getCoverDimensions(avatarNaturalSize.width, avatarNaturalSize.height, AVATAR_PREVIEW_SIZE),
    [avatarNaturalSize]
  );
  const maxPanX = Math.max(0, (previewCover.width - AVATAR_PREVIEW_SIZE) / 2);
  const maxPanY = Math.max(0, (previewCover.height - AVATAR_PREVIEW_SIZE) / 2);

  const buildAdjustedAvatarBlob = (source, offsetX = 0, offsetY = 0) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const size = AVATAR_OUTPUT_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not prepare image editor'));
          return;
        }

        const cover = getCoverDimensions(image.width, image.height, size);
        const drawWidth = cover.width;
        const drawHeight = cover.height;
        const offsetScale = size / AVATAR_PREVIEW_SIZE;
        const x = clamp((size - drawWidth) / 2 + offsetX * offsetScale, size - drawWidth, 0);
        const y = clamp((size - drawHeight) / 2 + offsetY * offsetScale, size - drawHeight, 0);

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate adjusted image'));
              return;
            }
            resolve(blob);
          },
          'image/png',
          0.95
        );
      };
      image.onerror = () => reject(new Error('Unable to load selected image'));
      image.src = source;
    });

  const closeAvatarAdjustModal = () => {
    setShowAvatarAdjustModal(false);
    setAvatarAdjustSrc('');
    setAvatarOffset({ x: 0, y: 0 });
    setAvatarNaturalSize({ width: 0, height: 0 });
  };

  const handleAvatarFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      if (!source) {
        setProfileError('Could not read selected image');
        return;
      }

      const probe = new Image();
      probe.onload = () => {
        setAvatarNaturalSize({ width: probe.width, height: probe.height });
      };
      probe.src = source;

      setAvatarAdjustSrc(source);
      setAvatarOffset({ x: 0, y: 0 });
      setShowAvatarAdjustModal(true);
      setProfileError('');
      setProfileMessage('');
    };
    reader.onerror = () => setProfileError('Could not read selected image');
    reader.readAsDataURL(file);
  };

  const confirmAdjustedAvatar = async () => {
    if (!avatarAdjustSrc) return;

    setUploading(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const adjustedBlob = await buildAdjustedAvatarBlob(avatarAdjustSrc, avatarOffset.x, avatarOffset.y);
      const adjustedFile = new File([adjustedBlob], `avatar-${Date.now()}.png`, {
        type: 'image/png',
      });

      const res = await uploadService.uploadImages([adjustedFile]);
      const url = res.data?.images?.[0];
      if (!url) {
        setProfileError('Upload failed: no URL returned');
        return;
      }
      setProfileForm((prev) => ({ ...prev, avatar: url }));
      setProfileMessage('Photo updated. Save changes to confirm profile update.');
      closeAvatarAdjustModal();
    } catch (error) {
      setProfileError(error.response?.data?.error?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDragStart = (event) => {
    if (!avatarAdjustSrc) return;
    avatarDragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: avatarOffset.x,
      originY: avatarOffset.y,
    };
  };

  const handleAvatarDragMove = (event) => {
    if (!avatarDragRef.current.active) return;

    const nextX = avatarDragRef.current.originX + (event.clientX - avatarDragRef.current.startX);
    const nextY = avatarDragRef.current.originY + (event.clientY - avatarDragRef.current.startY);

    setAvatarOffset({
      x: clamp(nextX, -maxPanX, maxPanX),
      y: clamp(nextY, -maxPanY, maxPanY),
    });
  };

  const handleAvatarDragEnd = () => {
    avatarDragRef.current.active = false;
  };

  const removeAvatar = () => {
    setProfileForm((prev) => ({ ...prev, avatar: '' }));
    setProfileMessage('Photo removed. Save changes to confirm profile update.');
    setProfileError('');
  };

  const requestProfileSaveOtp = async (event) => {
    event.preventDefault();
    setSaveLoading(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone,
        role: profileForm.role,
        avatar: profileForm.avatar,
        email: profileForm.email,
      };

      await authService.requestProfileUpdateOtp(payload);
      setPendingProfilePayload(payload);
      setShowOtpModal(true);
      setOtpMessage('OTP sent. Enter the code to confirm profile changes.');
      setProfileOtp('');
    } catch (error) {
      setProfileError(error?.response?.data?.error?.message || 'Could not start OTP verification');
    } finally {
      setSaveLoading(false);
    }
  };

  const verifyProfileSaveOtp = async (event) => {
    event.preventDefault();
    if (!profileOtp) {
      setOtpMessage('Enter OTP to continue');
      return;
    }

    setOtpLoading(true);
    setOtpMessage('');
    try {
      const res = await authService.verifyProfileUpdateOtp({ otp: profileOtp });
      const updatedUser = res?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      setPendingProfilePayload(null);
      setShowOtpModal(false);
      setProfileMessage('Profile updated successfully');
    } catch (error) {
      setOtpMessage(error?.response?.data?.error?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const requestPasswordOtp = async () => {
    setPasswordOtpStatus('');
    try {
      await authService.requestPasswordChangeOtp();
      setPasswordOtpStatus('OTP sent to your email');
    } catch (error) {
      setPasswordOtpStatus(error.response?.data?.error?.message || 'Could not send OTP');
    }
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordMessage('');

    if (!passwordForm.currentPassword) {
      setPasswordMessage('Current password is required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password and confirm password must match');
      return;
    }

    if (!passwordForm.otp) {
      setPasswordMessage('Enter OTP sent to your email');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePasswordWithOtp({
        otp: passwordForm.otp,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage('Password updated successfully');
      setPasswordForm({ currentPassword: '', otp: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage(error.response?.data?.error?.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const startTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) {
      setWalletError('Enter an amount greater than 0');
      return;
    }

    setWalletError('');
    setWalletMessage('');

    try {
      setAddingMoney(true);

      if (paymentMode === 'dummy') {
        if (dummyPaymentMethod === 'card' && (!dummyCardNumber || dummyCardNumber.length < 12)) {
          setWalletError('Enter a dummy card number (e.g., 4111111111111111)');
          setAddingMoney(false);
          return;
        }
        if (dummyPaymentMethod === 'upi' && !dummyUpiId) {
          setWalletError('Enter a dummy UPI ID (e.g., test@upi)');
          setAddingMoney(false);
          return;
        }

        const reference =
          dummyPaymentMethod === 'card' ? `CARD-${dummyCardNumber.slice(-4)}` : `UPI-${dummyUpiId}`;

        const res = await paymentService.dummyCharge({
          amount: Number(topUpAmount),
          paymentMethod: dummyPaymentMethod,
          reference,
        });

        const updatedUser = res?.data?.data?.user;
        if (updatedUser) updateUser(updatedUser);

        setWalletMessage('Dummy payment successful! Wallet updated.');
        setShowAddMoneyModal(false);
        setAddingMoney(false);
        return;
      }

      const { data } = await paymentService.createCheckoutSession(topUpAmount);
      const { sessionId, checkoutUrl, publishableKey } = data?.data || {};

      if (!sessionId && !checkoutUrl) {
        throw new Error('Unable to create Stripe checkout session');
      }

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      const stripe = await getStripeClient(publishableKey);
      if (!stripe) {
        throw new Error('Stripe initialization failed');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error) {
      setWalletError(error?.response?.data?.message || error.message || 'Unable to start payment');
      setAddingMoney(false);
    }
  };

  const renderTxRow = (tx) => {
    const key = tx._id || tx.id;
    const isCredit = tx.type === 'CREDIT';
    const amountPrefix = isCredit ? '+' : '-';
    const amountClass = isCredit ? 'text-green-600' : 'text-red-600';

    return (
      <div key={key} className="flex items-center justify-between py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{tx.description || 'Wallet transaction'}</p>
          <p className="text-xs text-gray-500">
            {new Date(tx.createdAt || tx.date).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <p className={`text-sm font-semibold ${amountClass}`}>
          {amountPrefix}₹{Number(tx.amount || 0).toFixed(2)}
        </p>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white shadow-lg">
        <button
          type="button"
          onClick={handleLogout}
          className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
        >
          ⎋ Logout
        </button>

        <div className="flex items-center justify-between gap-4 pr-20">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100">Account Command Center</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Welcome back, {user?.name || 'Driver'}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              {profileForm.avatar ? (
                <img
                  src={profileForm.avatar}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-200 text-2xl font-bold text-blue-800">
                  {avatarInitial}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAvatarActions(true)}
                className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 text-xs text-blue-700 shadow"
                aria-label="Edit avatar"
              >
                ✎
              </button>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-white">{profileForm.name || user?.name || 'User'}</p>
              <p className="text-xs capitalize text-blue-100">{profileForm.role}</p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            handleAvatarFile(event.target.files?.[0]);
            event.target.value = '';
          }}
          className="hidden"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <article className={glassCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
                <p className="mt-1 text-sm text-gray-500">Edit profile details and verify with OTP before save.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingAccount((prev) => !prev);
                  setProfileMessage('');
                  setProfileError('');
                }}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600"
              >
                {isEditingAccount ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>

            {(profileMessage || profileError) && (
              <div
                className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                  profileError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}
              >
                {profileError || profileMessage}
              </div>
            )}

            {!isEditingAccount ? (
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">👤 Name:</span> {profileForm.name || '-'}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">✉️ Email:</span> {profileForm.email || '-'}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">📱 Phone:</span> {profileForm.phone || '-'}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">🧩 Role:</span> {profileForm.role || '-'}</p>
              </div>
            ) : (
              <form onSubmit={requestProfileSaveOtp} className="mt-4 grid grid-cols-1 gap-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">👤 Full Name</label>
                <input
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Full name"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">✉️ Email</label>
                <input
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Email"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">📱 Phone</label>
                <input
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Phone"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">🧩 Role</label>
                <select
                  name="role"
                  value={profileForm.role}
                  onChange={handleProfileChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="renter">Renter</option>
                  <option value="owner">Host</option>
                  <option value="both">Both</option>
                </select>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {saveLoading ? 'Sending OTP...' : 'Save Changes'}
                </button>
              </form>
            )}

            {!showSecurityBox && (
              <button
                type="button"
                onClick={() => setShowSecurityBox(true)}
                className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600"
              >
                Change Password
              </button>
            )}
          </article>

          {showSecurityBox && (
            <article className={glassCard}>
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="mt-1 text-sm text-gray-500">Update password with OTP confirmation.</p>

            {passwordMessage && (
              <div
                className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                  passwordMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {passwordMessage}
              </div>
            )}

            <form onSubmit={submitPasswordChange} className="mt-4 grid grid-cols-1 gap-4">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Current password"
              />

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">OTP</label>
                  <button
                    type="button"
                    onClick={requestPasswordOtp}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Send OTP
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={passwordForm.otp}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, otp: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="6-digit OTP"
                />
                {passwordOtpStatus && <p className="mt-1 text-xs text-gray-500">{passwordOtpStatus}</p>}
              </div>

              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="New password"
              />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Confirm new password"
              />

              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={() => setShowSecurityBox(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600"
              >
                Cancel Password Change
              </button>
            </form>
            </article>
          )}
        </div>

        <div className="space-y-6">
          <article className={glassCard}>
            <p className="text-sm text-gray-500">Wallet Balance</p>
            {addingMoney || !user ? (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-10 w-44 rounded bg-gray-200" />
                <div className="h-4 w-28 rounded bg-gray-100" />
              </div>
            ) : (
              <h3 className="mt-2 text-3xl font-bold text-green-600">₹{(user?.walletBalance ?? 0).toFixed(2)}</h3>
            )}

            {walletMessage && <p className="mt-2 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{walletMessage}</p>}
            {walletError && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{walletError}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setWalletError('');
                  setWalletMessage('');
                  setShowAddMoneyModal(true);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Money
              </button>
            </div>
          </article>

          <article className={glassCard}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">Recent Transactions</h4>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:underline"
                onClick={() => setShowTransactionsModal(true)}
              >
                View All
              </button>
            </div>

            {transactionsLoading && <p className="text-sm text-gray-500">Loading transactions...</p>}
            {!transactionsLoading && transactionsError && <p className="text-sm text-red-600">{transactionsError}</p>}
            {!transactionsLoading && !transactionsError && recentTransactions.length === 0 && (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            )}
            {!transactionsLoading && !transactionsError && recentTransactions.length > 0 && (
              <div className="divide-y divide-gray-100">{recentTransactions.map((tx) => renderTxRow(tx))}</div>
            )}
          </article>
        </div>
      </div>

      {showAvatarActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Profile Photo</h3>
            <p className="mt-1 text-sm text-gray-600">Choose what you want to do.</p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowAvatarActions(false);
                  fileInputRef.current?.click();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Change photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAvatarActions(false);
                  removeAvatar();
                }}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete photo
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAvatarActions(false)}
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showAvatarAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Adjust Profile Photo</h3>
            <p className="mt-1 text-sm text-gray-600">Drag photo to choose center inside the circular frame.</p>

            <div className="mt-4 flex justify-center">
              <div
                className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-gray-200 bg-gray-100"
                onPointerDown={handleAvatarDragStart}
                onPointerMove={handleAvatarDragMove}
                onPointerUp={handleAvatarDragEnd}
                onPointerLeave={handleAvatarDragEnd}
                style={{ touchAction: 'none', cursor: 'grab' }}
              >
                <img
                  src={avatarAdjustSrc}
                  alt="Avatar preview"
                  className="pointer-events-none absolute max-w-none select-none"
                  draggable={false}
                  style={{
                    width: `${previewCover.width}px`,
                    height: `${previewCover.height}px`,
                    left: `${(AVATAR_PREVIEW_SIZE - previewCover.width) / 2 + avatarOffset.x}px`,
                    top: `${(AVATAR_PREVIEW_SIZE - previewCover.height) / 2 + avatarOffset.y}px`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeAvatarAdjustModal}
                className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAdjustedAvatar}
                className="w-1/2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Use Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900">Verify Profile Update</h3>
            <p className="mt-1 text-sm text-gray-500">Enter the OTP sent to your email to commit profile changes.</p>

            {otpMessage && (
              <div
                className={`mt-3 rounded px-3 py-2 text-sm ${
                  otpMessage.toLowerCase().includes('failed') || otpMessage.toLowerCase().includes('enter')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {otpMessage}
              </div>
            )}

            <form onSubmit={verifyProfileSaveOtp} className="mt-4 space-y-4">
              <input
                value={profileOtp}
                onChange={(event) => setProfileOtp(event.target.value)}
                maxLength={6}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Enter OTP"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  onClick={() => {
                    setShowOtpModal(false);
                    setPendingProfilePayload(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || !pendingProfilePayload}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionsModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Transaction History</h3>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
                onClick={() => setShowTransactionsModal(false)}
              >
                Close
              </button>
            </div>

            {transactionsLoading && <p className="text-sm text-gray-500">Loading transactions...</p>}
            {!transactionsLoading && transactionsError && <p className="text-sm text-red-600">{transactionsError}</p>}
            {!transactionsLoading && !transactionsError && transactions.length === 0 && (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            )}

            {!transactionsLoading && !transactionsError && transactions.length > 0 && (
              <div className="divide-y divide-gray-100">{transactions.map((tx) => renderTxRow(tx))}</div>
            )}
          </div>
        </div>
      )}

      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-semibold">Add Money to Wallet</h2>
            <p className="mb-4 text-sm text-gray-600">Choose dummy card/UPI for test success, or Stripe checkout.</p>

            <div className="mb-4 flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  value="dummy"
                  checked={paymentMode === 'dummy'}
                  onChange={() => setPaymentMode('dummy')}
                />
                Dummy payment
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  value="stripe"
                  checked={paymentMode === 'stripe'}
                  onChange={() => setPaymentMode('stripe')}
                />
                Stripe test
              </label>
            </div>

            <label className="mb-1 block text-sm font-medium">Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="50"
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(Number(event.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2"
            />

            {paymentMode === 'dummy' && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dummyMethod"
                      value="card"
                      checked={dummyPaymentMethod === 'card'}
                      onChange={() => setDummyPaymentMethod('card')}
                    />
                    Card
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dummyMethod"
                      value="upi"
                      checked={dummyPaymentMethod === 'upi'}
                      onChange={() => setDummyPaymentMethod('upi')}
                    />
                    UPI
                  </label>
                </div>

                {dummyPaymentMethod === 'card' && (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      placeholder="Card number"
                      value={dummyCardNumber}
                      onChange={(event) => setDummyCardNumber(event.target.value)}
                    />
                    <div className="flex gap-3">
                      <input
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        placeholder="MM/YY"
                        value={dummyCardExpiry}
                        onChange={(event) => setDummyCardExpiry(event.target.value)}
                      />
                      <input
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        placeholder="CVV"
                        value={dummyCardCvv}
                        onChange={(event) => setDummyCardCvv(event.target.value)}
                      />
                    </div>
                  </div>
                )}

                {dummyPaymentMethod === 'upi' && (
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    placeholder="test@upi"
                    value={dummyUpiId}
                    onChange={(event) => setDummyUpiId(event.target.value)}
                  />
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                onClick={() => {
                  setShowAddMoneyModal(false);
                  setAddingMoney(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                onClick={startTopUp}
                disabled={addingMoney}
              >
                {addingMoney ? 'Processing...' : paymentMode === 'dummy' ? 'Pay (Dummy)' : 'Pay with Stripe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
