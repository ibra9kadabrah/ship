import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { User } from '../types/user';

interface UserListProps {
  role: 'captain' | 'office';
}

const UserList: React.FC<UserListProps> = ({ role }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await api.getUsersByRole(role);
      setUsers(fetchedUsers);
    } catch (err) {
      setError(`Failed to fetch ${role} users`);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role]);

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(userId);
        // Refresh the user list after deletion
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
        console.error(err);
      }
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-700 capitalize">{role}s</h3>
      <ul className="mt-2 space-y-2">
        {users.map((user) => (
          <li key={user.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
            <span>{user.name} ({user.username})</span>
            <button
              onClick={() => handleDelete(user.id)}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded transition duration-150 ease-in-out"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;