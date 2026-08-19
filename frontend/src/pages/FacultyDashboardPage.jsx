import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';

const FacultyDashboardPage = () => (
  <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-content">
      <Outlet />
    </main>
  </div>
);

export default FacultyDashboardPage;
