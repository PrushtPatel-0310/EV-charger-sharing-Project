import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chargerService } from '../services/chargerService.js';

const MyChargers = () => {
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disableModal, setDisableModal] = useState({ open: false, charger: null, step: 'choice', mode: null });
  const [tempRange, setTempRange] = useState({ startDate: '', endDate: '' });
  const [todayRange, setTodayRange] = useState({ startTime: '', endTime: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChargers();
  }, []);

  const fetchChargers = async () => {
    try {
      const response = await chargerService.getMyChargers();
      const chargersResp = response.data?.chargers || response.data?.data?.chargers || [];
      setChargers(chargersResp);
    } catch (error) {
      console.error('Error fetching chargers:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setDisableModal({ open: false, charger: null, step: 'choice', mode: null });
    setTempRange({ startDate: '', endDate: '' });
    setTodayRange({ startTime: '', endTime: '' });
    setSubmitting(false);
  };

  const handleDisable = async () => {
    if (!disableModal.charger) return;
    const payload = { mode: disableModal.mode };

    if (disableModal.mode === 'temporary') {
      if (!tempRange.startDate || !tempRange.endDate) {
        alert('Please select start and end dates.');
        return;
      }
      payload.startDate = tempRange.startDate;
      payload.endDate = tempRange.endDate;
    }

    if (disableModal.mode === 'today') {
      if (!todayRange.startTime || !todayRange.endTime) {
        alert('Please select a start and end time.');
        return;
      }
      payload.startTime = todayRange.startTime;
      payload.endTime = todayRange.endTime;
    }

    setSubmitting(true);
    try {
      await chargerService.disable(disableModal.charger._id, payload);
      await fetchChargers();
      closeModal();
      alert(
        disableModal.mode === 'permanent'
          ? 'Charger disabled permanently.'
          : disableModal.mode === 'today'
            ? 'Charger disabled for today.'
            : 'Charger disabled for the selected dates.'
      );
    } catch (error) {
      console.error('Error disabling charger:', error);
      alert(error.response?.data?.message || 'Failed to disable charger');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Chargers</h1>
          <Link to="/create-charger" className="btn btn-primary">
            Add New Charger
          </Link>
        </div>

        {chargers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chargers.map((charger) => (
              <div key={charger._id} className="card">
                <Link
                  to={`/chargers/${charger._id}`}
                  className="text-xl font-semibold text-primary-600 hover:underline mb-2 block"
                >
                  {charger.title}
                </Link>
                <p className="text-gray-600 mb-2">
                  {charger.location.city}, {charger.location.state}
                </p>
                <p className="text-2xl font-bold text-primary-600 mb-2">
                  ${charger.pricePerHour}/hr
                </p>
                <p className="text-sm text-gray-500">
                  {charger.chargerType} • {charger.connectorType}
                </p>
                <p className="text-sm mt-2">
                  Status:{' '}
                  <span className={charger.isActive ? 'text-green-600' : 'text-red-600'}>
                    {charger.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={() =>
                      setDisableModal({ open: true, charger, step: 'choice', mode: null })
                    }
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No chargers listed yet</p>
            <Link to="/create-charger" className="btn btn-primary">
              List Your First Charger
            </Link>
          </div>
        )}
      </div>

      <DisableModal
        disableModal={disableModal}
        setDisableModal={setDisableModal}
        tempRange={tempRange}
        setTempRange={setTempRange}
        todayRange={todayRange}
        setTodayRange={setTodayRange}
        onClose={closeModal}
        onConfirm={() => handleDisable()}
        submitting={submitting}
      />
    </>
  );
};

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
      <button className="absolute top-3 right-3 text-gray-500" onClick={onClose}>
        ×
      </button>
      {children}
    </div>
  </div>
);

const DisableModalContent = ({ state, tempRange, setTempRange, onClose, onConfirm, submitting }) => {
  if (!state.charger) return null;

  if (state.step === 'choice') {
    return (
      <>
        <h3 className="text-xl font-bold mb-4">Disable {state.charger.title}</h3>
        <p className="text-sm text-gray-600 mb-4">Choose how you want to disable this charger.</p>
        <div className="space-y-2">
          <button
            className="btn btn-secondary w-full"
            onClick={() => state.setStep?.('temporary') || null}
          >
            Disable Temporarily
          </button>
          <button
            className="btn btn-outline w-full"
            onClick={() => state.setStep?.('today') || null}
          >
            Disable for Today
          </button>
          <button
            className="btn btn-outline w-full"
            onClick={() => state.setStep?.('permanent') || null}
          >
            Disable Permanently
          </button>
        </div>
      </>
    );
  }

  if (state.step === 'permanent') {
    return (
      <>
        <h3 className="text-xl font-bold mb-4">Disable Permanently</h3>
        <p className="text-sm text-gray-700 mb-4">
          Are you sure? You will not be able to enable again and will need to list a new charger.
        </p>
        <div className="flex gap-3">
          <button className="btn w-1/2" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary w-1/2" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Disabling...' : 'Confirm'}
          </button>
        </div>
      </>
    );
  }

  if (state.step === 'today') {
    return (
      <>
        <h3 className="text-xl font-bold mb-4">Disable for Today</h3>
        <p className="text-sm text-gray-700 mb-4">Pick a time window for today. Bookings inside this window will be cancelled and refunded.</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="time"
              className="input w-full"
              value={state.todayRange?.startTime}
              onChange={(e) => state.setTodayRange?.((prev) => ({ ...prev, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="time"
              className="input w-full"
              value={state.todayRange?.endTime}
              onChange={(e) => state.setTodayRange?.((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn w-1/2" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary w-1/2" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Disabling...' : 'Disable'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="text-xl font-bold mb-4">Disable Temporarily</h3>
      <p className="text-sm text-gray-700 mb-4">Select the start and end dates to disable this charger.</p>
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            className="input w-full"
            value={tempRange.startDate}
            onChange={(e) => setTempRange((prev) => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            className="input w-full"
            value={tempRange.endDate}
            onChange={(e) => setTempRange((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn w-1/2" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary w-1/2" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Disabling...' : 'Disable'}
        </button>
      </div>
    </>
  );
};

const DisableModal = ({ disableModal, setDisableModal, tempRange, setTempRange, todayRange, setTodayRange, onClose, onConfirm, submitting }) => {
  if (!disableModal.open) return null;

  const stateWithSetter = {
    ...disableModal,
    setStep: (step) => setDisableModal((prev) => ({ ...prev, step, mode: step === 'permanent' ? 'permanent' : step === 'today' ? 'today' : 'temporary' })),
    todayRange,
    setTodayRange,
  };

  return (
    <Modal onClose={onClose}>
      <DisableModalContent
        state={stateWithSetter}
        tempRange={tempRange}
        setTempRange={setTempRange}
        onClose={onClose}
        onConfirm={onConfirm}
        submitting={submitting}
      />
    </Modal>
  );
};

export default MyChargers;

