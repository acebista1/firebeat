
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Edit2, Lock, UserPlus, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { User, UserRole } from '../../types';
import { UserService } from '../../services/firestore';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'sales' as UserRole,
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await UserService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'sales',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;

    try {
      if (editingUser) {
        await UserService.update(editingUser.id, formData);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } as User : u));
      } else {
        const newUser = {
          ...formData,
          createdAt: new Date().toISOString(),
          avatarUrl: `https://ui-avatars.com/api/?name=${formData.email}&background=random`
        };
        const saved = await UserService.add(newUser);
        setUsers([...users, saved as User]);
      }
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save user");
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const newStatus = !user.isActive;
      await UserService.update(user.id, { isActive: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <Button onClick={handleAdd}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User Profile
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-64">
            <Input 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select 
              options={[
                { label: 'All Roles', value: 'all' },
                { label: 'Admin', value: 'admin' },
                { label: 'Sales', value: 'sales' },
                { label: 'Delivery', value: 'delivery' }
              ]}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Activity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" /> : user.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={user.role === 'admin' ? 'blue' : user.role === 'sales' ? 'green' : 'yellow'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={user.isActive ? 'green' : 'red'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(user)}
                        className={`${user.isActive ? 'text-red-600 hover:text-red-900 hover:bg-red-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} p-1 rounded`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingUser ? "Edit User Profile" : "Add User Profile"}
      >
        <div className="space-y-4">
          {!editingUser && (
            <div className="bg-yellow-50 p-3 text-sm text-yellow-800 rounded border border-yellow-200 mb-4">
              <strong>Note:</strong> This only creates the database profile. The user must Register on the Login page with this email to create their password.
            </div>
          )}

          <Input 
            label="Full Name" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. John Doe" 
          />
          <Input 
            label="Email Address" 
            type="email" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            placeholder="john@example.com" 
            disabled={!!editingUser}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Phone" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              placeholder="10 digit mobile" 
            />
            <Select 
              label="Role" 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
              options={[
                { label: 'Admin', value: 'admin' },
                { label: 'Sales', value: 'sales' },
                { label: 'Delivery', value: 'delivery' }
              ]} 
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="activeUser"
              checked={formData.isActive}
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="activeUser" className="text-sm text-gray-700 select-none">User is active</label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingUser ? 'Update Profile' : 'Create Profile'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
