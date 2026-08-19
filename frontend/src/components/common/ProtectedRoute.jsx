import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    const dashboard = user.role === 'faculty'
      ? '/faculty/dashboard'
      : user.role === 'coordinator'
        ? '/coordinator/dashboard'
        : user.role === 'admin'
          ? '/admin/dashboard'
          : '/student/dashboard';
    return <Navigate to={dashboard} replace />;
  }

  return children;
};

export default ProtectedRoute;
