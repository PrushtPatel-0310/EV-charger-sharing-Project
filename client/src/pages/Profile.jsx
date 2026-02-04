import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { uploadService } from '../services/uploadService.js';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'renter',
    avatar: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'renter',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const avatarInitial = (formData.name || user?.name || '?').charAt(0).toUpperCase();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploading(true);
    setMessage('');
    try {
      const res = await uploadService.uploadImages([avatarFile]);
      const url = res.data?.images?.[0];
      if (url) {
        setFormData((prev) => ({ ...prev, avatar: url }));
        setMessage('Photo uploaded. Save profile to apply.');
      } else {
        setMessage('Upload failed: no URL received');
      }
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await authService.updateProfile(formData);
      updateUser(response.data.user);
      setMessage('Profile updated successfully');
      setShowSuccessModal(true);
      setShowEdit(false);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New password and confirm password must match');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordMessage('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage(error.response?.data?.error?.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="max-w-2xl">
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Chats</h2>
            <p className="text-sm text-gray-600">Message renters and owners without sharing contact details.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/chats')}
          >
            Open chats
          </button>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Wallet</h2>
            <p className="text-sm text-gray-600 mb-1">Available balance</p>
            <div className="text-3xl font-bold">₹{(user?.walletBalance ?? 0).toFixed(2)}</div>
          </div>
          <div className="card flex items-center gap-4">
            {formData.avatar || user?.avatar ? (
              <img
                src={formData.avatar || user?.avatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border bg-gray-200 text-gray-700 flex items-center justify-center text-2xl font-semibold">
                {avatarInitial}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={uploadAvatar}
                  disabled={!avatarFile || uploading}
                  className="btn btn-primary"
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Account Information</h2>
            <div className="space-y-1 text-sm text-gray-700">
              <p><span className="font-semibold">Email:</span> {user?.email}</p>
              <p><span className="font-semibold">Role:</span> {user?.role}</p>
              {user?.rating > 0 && (
                <p>
                  <span className="font-semibold">Rating:</span> ⭐ {user.rating} ({user.totalReviews} reviews)
                </p>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowEdit(true);
              setMessage('');
              setFormData({
                name: user?.name || '',
                email: user?.email || '',
                phone: user?.phone || '',
                role: user?.role || 'renter',
                avatar: user?.avatar || '',
              });
            }}
          >
            Edit Profile
          </button>
        </div>

        {showEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
              <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>

              {message && (
                <div
                  className={`mb-4 p-3 rounded ${
                    message.includes('success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="input"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="input"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      className="input"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      name="role"
                      className="input"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="renter">Renter</option>
                      <option value="owner">Host</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setShowEdit(false);
                      setMessage('');
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        role: user?.role || 'renter',
                        avatar: user?.avatar || '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Saving...' : 'Confirm Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <form onSubmit={submitPasswordChange} className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Change Password</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setPasswordMessage('');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              {showPasswordForm ? 'Close' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <>
              {passwordMessage && (
                <div
                  className={`mb-4 p-3 rounded ${
                    passwordMessage.includes('success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {passwordMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    className="input"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    className="input"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="input"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <button type="submit" disabled={passwordLoading} className="btn btn-primary">
                  {passwordLoading ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-green-600">Changes Confirmed</h3>
            <p className="text-sm text-gray-700">Your profile has been updated.</p>
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/profile');
              }}
            >
              Back to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

