import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';

const StudentDashboardPage = () => (
  <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-content">
      <Outlet />
    </main>
  </div>
);

export default StudentDashboardPage;
