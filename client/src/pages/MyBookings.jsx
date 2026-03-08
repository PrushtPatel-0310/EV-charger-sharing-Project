import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { bookingService } from '../services/bookingService.js';
import { chatService } from '../services/chatService.js';
import { reviewService } from '../services/reviewService.js';

const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [windowFilter, setWindowFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState({ open: false, booking: null, mode: 'add' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [bookingReviews, setBookingReviews] = useState({});
  const [chatLoadingId, setChatLoadingId] = useState(null);
  const [chatErrorByBooking, setChatErrorByBooking] = useState({});
  const [deleteReviewLoadingId, setDeleteReviewLoadingId] = useState(null);

  const formatBookingDateTime = (value, timezone = 'UTC') => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
      }).format(new Date(value));
    } catch {
      return new Date(value).toLocaleString();
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchUserReviews();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const response = await bookingService.getAll({ type: 'bookings' });
      const fetchedBookings = response.data?.bookings || [];
      setBookings(fetchedBookings);
      setBookingReviews((prev) => {
        const next = { ...prev };
        fetchedBookings.forEach((booking) => {
          if (booking.review) {
            next[booking._id] = booking.review;
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    if (!user?._id) return;
    try {
      const res = await reviewService.getByUser(user._id);
      const mapped = (res.data?.reviews || []).reduce((acc, review) => {
        if (review.booking) {
          acc[review.booking] = review;
        }
        return acc;
      }, {});
      setBookingReviews((prev) => ({ ...mapped, ...prev }));
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const openReviewModal = (booking, mode = 'add') => {
    const existing = bookingReviews[booking._id];
    setReviewModal({ open: true, booking, mode });
    setReviewForm({
      rating: existing?.rating ?? 5,
      comment: existing?.comment ?? '',
    });
    setReviewError('');
    setReviewMessage('');
  };

  const closeReviewModal = () => {
    setReviewModal({ open: false, booking: null, mode: 'add' });
    setReviewForm({ rating: 5, comment: '' });
    setReviewSubmitting(false);
    setReviewError('');
  };

  const submitReview = async () => {
    if (!reviewModal.booking) return;
    const bookingId = reviewModal.booking._id;
    try {
      setReviewSubmitting(true);
      setReviewError('');
      setReviewMessage('');
      let response;
      if (reviewModal.mode === 'edit' && bookingReviews[bookingId]) {
        response = await reviewService.update(bookingReviews[bookingId]._id, {
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        });
      } else {
        response = await reviewService.create({
          bookingId,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        });
      }

      const savedReview = response?.data?.review;
      if (savedReview) {
        setBookingReviews((prev) => ({ ...prev, [bookingId]: savedReview }));
      }

      setReviewMessage(reviewModal.mode === 'edit' ? 'Review updated.' : 'Review submitted. Thank you!');
      closeReviewModal();
      fetchUserReviews();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to submit review';
      setReviewError(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (bookingId, reviewId) => {
    if (!reviewId) return;
    try {
      setDeleteReviewLoadingId(bookingId);
      setReviewError('');
      setReviewMessage('');
      await reviewService.remove(reviewId);
      setBookingReviews((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setReviewMessage('Review deleted.');
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to delete review';
      setReviewError(message);
    } finally {
      setDeleteReviewLoadingId(null);
    }
  };

  const handleMessageOwner = async (booking) => {
    if (!booking) return;
    try {
      setChatLoadingId(booking._id);
      setChatErrorByBooking((prev) => ({ ...prev, [booking._id]: '' }));
      const res = await chatService.startOrUpgrade({ chargerId: booking.charger._id, bookingId: booking._id });
      const chatId = res.data?.chat?._id;
      if (chatId) {
        navigate(`/chats/${chatId}`, { state: { chargerId: booking.charger._id, bookingId: booking._id } });
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to open chat';
      setChatErrorByBooking((prev) => ({ ...prev, [booking._id]: message }));
    } finally {
      setChatLoadingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    const now = Date.now();
    const sorted = [...bookings].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return sorted.filter((booking) => {
      const start = new Date(booking.startTime).getTime();
      const end = new Date(booking.endTime).getTime();
      const normalizedStatus = String(booking.status || '').toLowerCase();
      const matchesStart = dateRange.start ? start >= new Date(dateRange.start).getTime() : true;
      const matchesEnd = dateRange.end ? start <= new Date(dateRange.end).getTime() : true;
      const locationText = `${booking.charger?.location?.address || ''} ${booking.charger?.location?.city || ''} ${booking.charger?.location?.state || ''}`.toLowerCase();
      const matchesLocation = locationFilter
        ? locationText.includes(locationFilter.trim().toLowerCase())
        : true;
      const matchesStatus = statusFilter === 'all' ? true : normalizedStatus === statusFilter;
      const matchesWindow =
        windowFilter === 'all'
          ? true
          : windowFilter === 'upcoming'
            ? end >= now
            : end < now;
      return matchesStart && matchesEnd && matchesLocation && matchesStatus && matchesWindow;
    });
  }, [bookings, dateRange, locationFilter, statusFilter, windowFilter]);

  const visibleBookings = useMemo(
    () => (showAll ? filteredBookings : filteredBookings.slice(0, 5)),
    [filteredBookings, showAll]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        <div>
          <label className="text-sm font-semibold text-gray-700">Start date</label>
          <input
            type="date"
            className="input mt-1 w-full"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">End date</label>
          <input
            type="date"
            className="input mt-1 w-full"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Location</label>
          <input
            type="text"
            placeholder="City or address"
            className="input mt-1 w-full"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Status</label>
          <select
            className="input mt-1 w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">When</label>
          <select
            className="input mt-1 w-full"
            value={windowFilter}
            onChange={(e) => setWindowFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {reviewMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {reviewMessage}
        </div>
      )}

      {reviewError && !reviewModal.open && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {reviewError}
        </div>
      )}

      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const review = bookingReviews[booking._id];
            const bookingTimezone = booking.charger?.availabilityTemplate?.timezone || 'UTC';
            return (
              <div
                key={booking._id}
                className="card bg-white cursor-pointer transition-shadow hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/bookings/${booking._id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/bookings/${booking._id}`);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      to={`/chargers/${booking.charger._id}`}
                      className="text-xl font-semibold text-primary-600 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {booking.charger.title}
                    </Link>
                    <p className="text-gray-600 mt-2">
                      {formatBookingDateTime(booking.startTime, bookingTimezone)} -{' '}
                      {formatBookingDateTime(booking.endTime, bookingTimezone)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Status: <span className="capitalize">{booking.status}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        className="btn btn-outline text-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMessageOwner(booking);
                        }}
                        disabled={chatLoadingId === booking._id}
                      >
                        {chatLoadingId === booking._id ? 'Opening chat...' : 'Message owner'}
                      </button>

                      {booking.status === 'completed' && (
                        review ? (
                          <>
                            <button
                              className="btn btn-outline text-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openReviewModal(booking, 'edit');
                              }}
                            >
                              Edit Review
                            </button>
                            <button
                              className="btn btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteReview(booking._id, review._id);
                              }}
                              disabled={deleteReviewLoadingId === booking._id}
                            >
                              {deleteReviewLoadingId === booking._id ? 'Deleting...' : 'Delete Review'}
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-outline text-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openReviewModal(booking, 'add');
                            }}
                          >
                            Add Review
                          </button>
                        )
                      )}
                    </div>

                    {chatErrorByBooking[booking._id] && (
                      <p className="mt-2 text-sm text-red-600">{chatErrorByBooking[booking._id]}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">₹{booking.totalPrice}</p>
                    <p className="text-sm text-gray-500">Click card for details</p>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredBookings.length > 5 && (
            <div className="text-center">
              <button
                className="btn btn-outline"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? 'Show Less' : 'Show More'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No bookings found</p>
          <Link to="/chargers" className="btn btn-primary mt-4 inline-block">
            Browse Chargers
          </Link>
        </div>
      )}
    </div>

    {reviewModal.open && reviewModal.booking && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h3 className="text-xl font-semibold mb-1">{reviewModal.mode === 'edit' ? 'Edit Review' : 'Add Review'}</h3>
          <p className="text-sm text-gray-600 mb-4">{reviewModal.booking.charger.title}</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Rating</label>
              <select
                className="input w-full"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comment</label>
              <textarea
                className="input w-full"
                rows="4"
                placeholder="Share your experience"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
              ></textarea>
            </div>
            {reviewError && (
              <p className="text-sm text-red-600">{reviewError}</p>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button className="btn w-1/2" onClick={closeReviewModal} disabled={reviewSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary w-1/2"
              onClick={submitReview}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Saving...' : reviewModal.mode === 'edit' ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default MyBookings;

