import React from 'react'; // Ensure React is imported if not already
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AddUserForm from '../components/AddUserForm'; // Import actual component
import AddVesselForm from '../components/AddVesselForm'; // Import actual component
import AdminReportHistory from '../components/AdminReportHistory'; // Import the new component
import UserList from '../components/UserList';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center">
            <span className="text-gray-600 mr-4">Welcome, {user?.name || 'Admin'}!</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add User Forms */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Office User</h2>
            <AddUserForm role="office" /> 
            {/* Use actual component */}
            <UserList role="office" />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Captain User</h2>
            <AddUserForm role="captain" />
            {/* Use actual component */}
            <UserList role="captain" />
          </div>

          {/* Add Vessel Form */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Vessel</h2>
            <AddVesselForm /> 
            {/* Use actual component */}
          </div>

          {/* Report History Section */}
          <div className="bg-white p-0 rounded-lg shadow md:col-span-2"> 
             {/* Use p-0 on container if history component has its own padding */}
             <AdminReportHistory /> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
