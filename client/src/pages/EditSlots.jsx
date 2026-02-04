import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chargerService } from '../services/chargerService.js';
import { slotService } from '../services/slotService.js';

const EditSlots = () => {
  const { chargerId } = useParams();
  const navigate = useNavigate();
  const [charger, setCharger] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [modifiedSlots, setModifiedSlots] = useState({});

  const statusStyles = {
    available: 'bg-green-100 text-green-800',
    booked: 'bg-blue-100 text-blue-800',
    'in-use': 'bg-amber-100 text-amber-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    blocked: 'bg-neutral-200 text-neutral-800',
  };

  useEffect(() => {
    fetchData();
  }, [chargerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const chargerResponse = await chargerService.getById(chargerId);
      setCharger(chargerResponse.data.charger);

      const slotsResponse = await slotService.getSlots(chargerId, { status: 'all' });
      setSlots(slotsResponse.slots || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load slot data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (slot) => {
    setEditingSlot({
      ...slot,
      startTime: new Date(slot.startTime).toISOString().slice(0, 16),
      endTime: new Date(slot.endTime).toISOString().slice(0, 16),
    });
  };

  const handleEditChange = (field, value) => {
    setEditingSlot({ ...editingSlot, [field]: value });
    setModifiedSlots({
      ...modifiedSlots,
      [editingSlot._id]: { ...editingSlot, [field]: value },
    });
  };

  const handleToggleStatus = (slotId, currentStatus) => {
    if (currentStatus === 'booked') {
      alert('Cannot change status of a booked slot');
      return;
    }

    if (!['available', 'blocked'].includes(currentStatus)) {
      alert('Only available or blocked slots can be toggled');
      return;
    }

    const newStatus = currentStatus === 'available' ? 'blocked' : 'available';
    const slot = slots.find((s) => s._id === slotId);
    
    setModifiedSlots({
      ...modifiedSlots,
      [slotId]: { ...slot, status: newStatus },
    });

    setSlots(
      slots.map((s) => (s._id === slotId ? { ...s, status: newStatus } : s))
    );
  };

  const handleDeleteSlot = async (slotId) => {
    const slot = slots.find((s) => s._id === slotId);
    if (slot.status === 'booked') {
      alert('Cannot delete a booked slot');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    try {
      await slotService.deleteSlot(chargerId, slotId);
      setSlots(slots.filter((s) => s._id !== slotId));
      const newModified = { ...modifiedSlots };
      delete newModified[slotId];
      setModifiedSlots(newModified);
      alert('Slot deleted successfully');
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to delete slot');
    }
  };

  const handleSaveAll = async () => {
    try {
      // Save all modified slots
      const updatePromises = Object.keys(modifiedSlots).map(async (slotId) => {
        const modifiedSlot = modifiedSlots[slotId];
        await slotService.updateSlot(chargerId, slotId, {
          startTime: modifiedSlot.startTime,
          endTime: modifiedSlot.endTime,
          pricePerSlot: modifiedSlot.pricePerSlot ? Number(modifiedSlot.pricePerSlot) : undefined,
          status: modifiedSlot.status,
        });
      });

      await Promise.all(updatePromises);
      alert('All changes saved successfully');
      setModifiedSlots({});
      setEditingSlot(null);
      navigate('/my-chargers');
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to save changes');
    }
  };

  const handleCancel = () => {
    if (Object.keys(modifiedSlots).length > 0) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    navigate('/my-chargers');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!charger) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Charger not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Edit Slots</h1>
        <p className="text-gray-600">
          {charger.title} - {charger.location.city}, {charger.location.state}
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">No slots created yet</p>
          <p className="text-sm text-gray-400 mt-2">Go to charger detail page to create slots</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => {
            const isEditing = editingSlot?._id === slot._id;
            const isModified = modifiedSlots[slot._id];

            return (
              <div
                key={slot._id}
                className={`card ${isModified ? 'border-2 border-yellow-400' : ''}`}
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Start Time</label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={editingSlot.startTime}
                          onChange={(e) => handleEditChange('startTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Time</label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={editingSlot.endTime}
                          onChange={(e) => handleEditChange('endTime', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Price for Slot (optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={editingSlot.pricePerSlot || ''}
                        onChange={(e) => handleEditChange('pricePerSlot', e.target.value)}
                        placeholder={`Default: $${charger.pricePerHour}/hr`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSlot(null);
                          if (!modifiedSlots[slot._id]) {
                            fetchData();
                          }
                        }}
                        className="btn btn-outline flex-1"
                      >
                        Cancel Edit
                      </button>
                      <button
                        onClick={() => setEditingSlot(null)}
                        className="btn btn-primary flex-1"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              statusStyles[slot.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                          </span>
                          {isModified && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Modified
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-lg">
                          {new Date(slot.startTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ends: {new Date(slot.endTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Price:{' '}
                          {slot.pricePerSlot
                            ? `$${slot.pricePerSlot}`
                            : `$${charger.pricePerHour}/hr (default)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEditClick(slot)}
                        className="btn btn-outline text-sm"
                        disabled={slot.status === 'booked'}
                      >
                        Edit Slot
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot._id)}
                        className="btn btn-outline text-sm text-red-600 border-red-300 hover:bg-red-50"
                        disabled={slot.status === 'booked'}
                      >
                        Delete Slot
                      </button>
                      <button
                        onClick={() => handleToggleStatus(slot._id, slot.status)}
                        className={`btn text-sm ${
                          slot.status === 'available'
                            ? 'btn-outline border-gray-400'
                            : 'btn-primary'
                        }`}
                        disabled={slot.status === 'booked'}
                      >
                        {slot.status === 'available' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                    {slot.status === 'booked' && (
                      <p className="text-xs text-blue-600 mt-2">
                        This slot is booked and cannot be modified
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 justify-end">
        <button onClick={handleCancel} className="btn btn-outline px-8">
          Cancel
        </button>
        <button
          onClick={handleSaveAll}
          className="btn btn-primary px-8"
          disabled={Object.keys(modifiedSlots).length === 0}
        >
          Save Changes
          {Object.keys(modifiedSlots).length > 0 && (
            <span className="ml-2 bg-white text-primary-600 px-2 py-0.5 rounded-full text-xs">
              {Object.keys(modifiedSlots).length}
            </span>
          )}
        </button>
      </div>

      {Object.keys(modifiedSlots).length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You have {Object.keys(modifiedSlots).length} unsaved change(s).
            Click "Save Changes" to apply them.
          </p>
        </div>
      )}
    </div>
  );
};

export default EditSlots;
