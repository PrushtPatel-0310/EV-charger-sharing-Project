import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const balance = user?.walletBalance ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wallet</h1>
            <p className="text-gray-600">Check your balance and view your statement.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/wallet/history')}
          >
            Show Transactions
          </button>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-600 mb-2">Available balance</p>
          <div className="text-4xl font-bold">₹{balance.toFixed(2)}</div>
          <p className="text-sm text-gray-500 mt-3">
            Top-ups, charging spends, and refunds appear here instantly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
