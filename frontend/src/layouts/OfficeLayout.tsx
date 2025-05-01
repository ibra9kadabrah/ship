import React from 'react';
import { Outlet } from 'react-router-dom';
// Import the actual OfficeSidebar component
import OfficeSidebar from '../components/OfficeSidebar'; 

const OfficeLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Use the actual Sidebar component */}
      <OfficeSidebar /> 
      
      {/* Main content area */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet /> {/* Nested office routes will render here */}
      </main>
    </div>
  );
};

export default OfficeLayout;
