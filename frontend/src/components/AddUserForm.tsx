import React, { useState } from 'react';
import apiClient from '../services/api';
import { UserRole } from '../types/user'; // Use frontend UserRole type

interface AddUserFormProps {
  role: UserRole; // 'office' or 'captain'
}

const AddUserForm: React.FC<AddUserFormProps> = ({ role }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim() || !name.trim()) {
      setError('All fields are required.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = { username, password, name, role };
      await apiClient.post('/auth/register', payload); // Uses interceptor for admin token
      setSuccess(`Successfully added ${role} user: ${name}`);
      // Clear form
      setUsername('');
      setPassword('');
      setName('');
    } catch (err: any) {
      console.error(`Error adding ${role} user:`, err);
      setError(err.response?.data?.error || `Failed to add ${role} user.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
          {success}
        </div>
      )}
      <div>
        <label htmlFor={`${role}-name`} className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id={`${role}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Full Name"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor={`${role}-username`} className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id={`${role}-username`}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Login Username"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor={`${role}-password`} className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id={`${role}-password`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Initial Password"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition duration-150 ease-in-out ${
          isLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? 'Adding...' : `Add ${role.charAt(0).toUpperCase() + role.slice(1)} User`}
      </button>
    </form>
  );
};

export default AddUserForm;
