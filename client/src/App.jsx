import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ChargerList from './pages/ChargerList.jsx';
import ChargerDetail from './pages/ChargerDetail.jsx';
import Booking from './pages/Booking.jsx';
import MyBookings from './pages/MyBookings.jsx';
import MyChargers from './pages/MyChargers.jsx';
import CreateCharger from './pages/CreateCharger.jsx';
import Profile from './pages/Profile.jsx';
import Layout from './components/layout/Layout.jsx';
import Chat from './pages/Chat.jsx';
import Wallet from './pages/Wallet.jsx';
import TransactionHistory from './pages/TransactionHistory.jsx';
import PlanRoute from './pages/PlanRoute.jsx';
import SearchLocation from './pages/SearchLocation.jsx';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="chargers" element={<ChargerList />} />
        <Route path="plan-route" element={<PlanRoute />} />
        <Route path="search-location" element={<SearchLocation />} />
        <Route path="chargers/:id" element={<ChargerDetail />} />
        <Route
          path="bookings/:id"
          element={
            <PrivateRoute>
              <Booking />
            </PrivateRoute>
          }
        />
        <Route
          path="my-bookings"
          element={
            <PrivateRoute>
              <MyBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="my-chargers"
          element={
            <PrivateRoute>
              <MyChargers />
            </PrivateRoute>
          }
        />
        <Route
          path="create-charger"
          element={
            <PrivateRoute>
              <CreateCharger />
            </PrivateRoute>
          }
        />
        <Route
          path="profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="wallet"
          element={
            <PrivateRoute>
              <Wallet />
            </PrivateRoute>
          }
        />
        <Route
          path="wallet/history"
          element={
            <PrivateRoute>
              <TransactionHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="chats/:chatId?"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

