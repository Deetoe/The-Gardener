import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  useEffect(() => {
    const token = searchParams.get('token');
    const discordId = searchParams.get('discord_id');
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setTimeout(() => navigate('/signin'), 3000);
      return;
    }
    
    if (!token || !discordId) {
      setError('Missing authentication data. Please try again.');
      setTimeout(() => navigate('/signin'), 3000);
      return;
    }
    
    // Store auth data in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('discordId', discordId);
    
    // Redirect to dashboard
    navigate('/dashboard');
  }, [searchParams, navigate]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="mt-2 text-sm">Redirecting you back to the sign-in page...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-green-500 rounded-full border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg">Authentication successful! Redirecting...</p>
        </div>
      )}
    </div>
  );
};

export default AuthSuccess;