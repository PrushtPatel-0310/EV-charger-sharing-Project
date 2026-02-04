import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chargerService } from '../services/chargerService.js';
import { uploadService } from '../services/uploadService.js';
import { CHARGER_TYPES, CONNECTOR_TYPES } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import LocationPicker from '../components/LocationPicker.jsx';

const CreateCharger = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    chargerType: 'Level 2',
    connectorType: 'Type 2',
    powerOutput: '',
    pricePerHour: '',
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      coordinates: {
        lat: '',
        lng: '',
      },
    },
    amenities: [],
    availability: {
      isAvailable: true,
      schedule: [],
    },
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
// mycode

const handleAddressUpdate = ({ displayName, address = {} }) => {
  const street = [address.house_number, address.road].filter(Boolean).join(' ').trim();
  const city = address.city || address.town || address.village || address.hamlet || address.county || '';
  const state = address.state || address.region || address.state_district || '';
  const zipCode = address.postcode || '';
  const country = address.country || formData.location.country;

  setFormData((prev) => ({
    ...prev,
    location: {
      ...prev.location,
      address: street || displayName || prev.location.address,
      city: city || prev.location.city,
      state: state || prev.location.state,
      zipCode: zipCode || prev.location.zipCode,
      country: country || prev.location.country,
    },
  }));
};
//
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      if (locationField === 'coordinates.lat' || locationField === 'coordinates.lng') {
        const coordField = locationField.split('.')[1];
        setFormData({
          ...formData,
          location: {
            ...formData.location,
            coordinates: {
              ...formData.location.coordinates,
              [coordField]: value,
            },
          },
        });
      } else {
        setFormData({
          ...formData,
          location: {
            ...formData.location,
            [locationField]: value,
          },
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenityInput.trim()],
      });
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (amenity) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((a) => a !== amenity),
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      alert('Please log in to upload images.');
      navigate('/login');
      return;
    }

    // Check if token exists
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Your session has expired. Please log in again.');
      navigate('/login');
      return;
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file sizes (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      alert('File size too large. Maximum 5MB per image.');
      e.target.value = '';
      return;
    }

    setUploadingImages(true);
    setError(''); // Clear previous errors
    try {
      const response = await uploadService.uploadImages(files);
      setImages([...images, ...response.data.images]);
    } catch (error) {
      console.error('Error uploading images:', error);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.error?.details?.[0]
        || error.message 
        || 'Failed to upload images. Please try again.';
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setUploadingImages(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location: {
              ...formData.location,
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            },
          });
        },
        (error) => {
          alert('Unable to get your location. Please enter coordinates manually.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.title || !formData.location.address || !formData.location.city ||
        !formData.location.state || !formData.location.zipCode ||
        !formData.location.coordinates.lat || !formData.location.coordinates.lng ||
        !formData.powerOutput || !formData.pricePerHour) {
      setError('Please select a location and complete required address fields');
      setLoading(false);
      return;
    }

    try {
      const chargerData = {
        ...formData,
        images: images,
        powerOutput: parseFloat(formData.powerOutput),
        pricePerHour: parseFloat(formData.pricePerHour),
        location: {
          ...formData.location,
          coordinates: {
            lat: parseFloat(formData.location.coordinates.lat),
            lng: parseFloat(formData.location.coordinates.lng),
          },
        },
      };

      const response = await chargerService.create(chargerData);
      navigate(`/chargers/${response.data.charger._id}`);
    } catch (err) {
      console.error('Error creating charger:', err);
      const errorMessage = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to create charger. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is owner
  if (user && user.role !== 'owner' && user.role !== 'both') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Owner Account Required</h2>
          <p className="text-gray-600 mb-4">
            You need an owner account to list chargers. Please update your profile.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">List Your Charger</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold mb-1">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                maxLength={100}
                className="input"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Fast Charging Station in Downtown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                rows={4}
                maxLength={1000}
                className="input"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your charger, nearby amenities, parking availability, etc."
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Images (up to 10)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageUpload}
                disabled={uploadingImages || images.length >= 10}
                className="input"
              />
              {uploadingImages && (
                <p className="text-sm text-gray-500 mt-1">Uploading images...</p>
              )}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Charger ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length >= 10 && (
                <p className="text-sm text-yellow-600 mt-1">
                  Maximum 10 images allowed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Charger Specifications */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Charger Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Charger Type <span className="text-red-500">*</span>
              </label>
              <select
                name="chargerType"
                required
                className="input"
                value={formData.chargerType}
                onChange={handleChange}
              >
                {CHARGER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Connector Type <span className="text-red-500">*</span>
              </label>
              <select
                name="connectorType"
                required
                className="input"
                value={formData.connectorType}
                onChange={handleChange}
              >
                {CONNECTOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Power Output (kW) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="powerOutput"
                required
                min="0"
                step="0.1"
                className="input"
                value={formData.powerOutput}
                onChange={handleChange}
                placeholder="e.g., 7.2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Price per Hour ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="pricePerHour"
                required
                min="0"
                step="0.01"
                className="input"
                value={formData.pricePerHour}
                onChange={handleChange}
                placeholder="e.g., 10.00"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Location</h2>
          <div className="space-y-4">
            <LocationPicker
              initialLat={formData.location.coordinates.lat || 23.0225}
              initialLng={formData.location.coordinates.lng || 72.5714}
              disableManualEntry
              onLocationSelected={(coords) => {
                setFormData((prev) => ({
                  ...prev,
                  location: {
                    ...prev.location,
                    coordinates: {
                      lat: coords.lat,
                      lng: coords.lng,
                    },
                  },
                }));
              }}
              onAddressChange={(payload) => {
                const display = typeof payload === 'string' ? payload : payload?.displayName || '';
                const addr = typeof payload === 'object' && payload?.address ? payload.address : {};
                setFormData((prev) => ({
                  ...prev,
                  location: {
                    ...prev.location,
                    address: addr.road || addr.residential || display || prev.location.address,
                    city: addr.city || addr.town || addr.village || addr.hamlet || prev.location.city,
                    state: addr.state || prev.location.state,
                    zipCode: addr.postcode || prev.location.zipCode,
                    country: addr.country || prev.location.country,
                  },
                }));
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.address"
                  required
                  className="input"
                  value={formData.location.address}
                  onChange={handleChange}
                  placeholder="e.g., 123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.city"
                  required
                  className="input"
                  value={formData.location.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.state"
                  required
                  className="input"
                  value={formData.location.state}
                  onChange={handleChange}
                  placeholder="State or Province"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Zip/Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location.zipCode"
                  required
                  className="input"
                  value={formData.location.zipCode}
                  onChange={handleChange}
                  placeholder="e.g., 380001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  name="location.country"
                  className="input"
                  value={formData.location.country}
                  onChange={handleChange}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            {/* <LocationPicker
              selectedLocation={{
                lat: Number(formData.location.coordinates.lat) || 0,
                lng: Number(formData.location.coordinates.lng) || 0,
              }}
              onLocationSelect={(coords) =>
                setFormData((prev) => ({
                  ...prev,
                  location: {
                    ...prev.location,
                    coordinates: { lat: coords.lat, lng: coords.lng },
                  },
                }))
              }
            /> */}
          </div>
        </div>

        {/* Amenities */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Amenities</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAmenity();
                  }
                }}
                placeholder="e.g., WiFi, Restroom, Parking"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="btn btn-secondary"
              >
                Add
              </button>
            </div>

            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(amenity)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'List Charger'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/my-chargers')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCharger;


