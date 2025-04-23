import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is authenticated on component mount and when localStorage changes
        const checkAuth = () => {
            const token = localStorage.getItem('authToken');
            const discordId = localStorage.getItem('discordId');
            setIsAuthenticated(!!(token && discordId));
        };

        checkAuth();

        // Listen for storage changes (in case user logs out in another tab)
        window.addEventListener('storage', checkAuth);
        return () => {
            window.removeEventListener('storage', checkAuth);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('discordId');
        setIsAuthenticated(false);
        navigate('/');
    };

    return (
        <div className="flex flex-row justify-between p-4 text-black bg-green-200">
            <h1 className="text-3xl">
                <Link to="/">The Gardener</Link>
            </h1>
            <div className="flex flex-row gap-4 text-lg items-center">
                <Link to="/">Home</Link>
                
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <button 
                            onClick={handleLogout}
                            className="text-red-600 hover:text-red-800"
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <Link to="/signin" className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded">
                        Sign In
                    </Link>
                )}
            </div>
        </div>
    );   
};

export default Navbar;