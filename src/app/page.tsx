
import Image from 'next/image';
import Navbar from '../components/Navbar';
import SignInPage from './sign-in/[[...sign-in]]/page';
import SchoolResultSystem from './SchoolResultSystem';


const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Navbar */}
      <Navbar />
      <SignInPage />

      {/* Hero Section */}
  
      

      {/* Footer */}
      <footer className="bg-blue-800 text-white py-4 text-center mt-8 shadow-inner">
        <div className="container mx-auto">
          <p className="text-sm">&copy; {new Date().getFullYear()} Bright Future School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;