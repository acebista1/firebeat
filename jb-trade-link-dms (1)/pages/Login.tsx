
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { Button, Input, Card } from '../components/ui/Elements';
import { supabase } from '../lib/supabase';
import { UserService } from '../services/firestore';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('admin'); // Only used for registration
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard'); 
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
      setIsSubmitting(false);
    }
  };

  const handleDevRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      // 1. Create Authentication User
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      const user = data.user;
      if (!user) throw new Error("Signup succeeded but no user returned");

      // 2. Check if an Admin has already created a profile for this email
      const existingUsers = await UserService.getByEmail(email);
      let roleToUse = role;
      let nameToUse = email.split('@')[0];
      let idToUse = user.id;

      // 3. Create/Overwrite the User Profile in Supabase Table
      // Note: We use the Auth UID as the primary key for the 'users' table
      if (existingUsers.length > 0) {
          // If a profile exists (created by admin), we might want to update its ID to match Auth ID
          // Or we just update that record. Since we can't easily change PK, we might delete and recreate or rely on email match logic in future.
          // For now, we will just Insert/Upsert a new record with the Auth ID.
          const existing = existingUsers[0];
          roleToUse = existing.role;
          nameToUse = existing.name;
          
          // Optional: Delete the placeholder if ID doesn't match (cleanup)
          if (existing.id !== user.id) {
             await UserService.delete(existing.id); 
          }
      }

      await supabase.from('users').upsert({
        id: idToUse,
        name: nameToUse,
        email: email,
        role: roleToUse,
        isActive: true,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://ui-avatars.com/api/?name=${email}&background=random`
      });

      alert(`Account created successfully! Role: ${roleToUse}. Please sign in.`);
      setIsRegistering(false);
      setEmail('');
      setPassword('');
      setIsSubmitting(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md p-6" title="">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700 tracking-tight">Firebeat</h1>
          <p className="text-gray-500">DMS (Supabase Edition)</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        {isRegistering ? (
           <form onSubmit={handleDevRegister} className="space-y-6">
             <div className="text-sm text-center font-bold text-gray-700">Dev Registration</div>
             <Input 
               label="Email Address" 
               type="email" 
               value={email} 
               onChange={(e) => setEmail(e.target.value)}
               required 
             />
             <Input 
               label="Password" 
               type="password" 
               value={password} 
               onChange={(e) => setPassword(e.target.value)}
               required 
             />
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Role (if no admin profile exists)</label>
               <div className="flex gap-2">
                  {(['admin', 'sales', 'delivery'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3 py-1 rounded capitalize border transition-colors ${role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {r}
                    </button>
                  ))}
               </div>
             </div>
             <Button type="submit" className="w-full" isLoading={isSubmitting}>
               Create Account
             </Button>
             <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-center text-sm text-gray-600 hover:underline">
               Back to Login
             </button>
           </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Email Address" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Sign In
            </Button>
            
            <div className="text-center pt-2">
              <button type="button" onClick={() => setIsRegistering(true)} className="text-xs text-indigo-600 hover:underline">
                Need an account? Register (Dev Mode)
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
