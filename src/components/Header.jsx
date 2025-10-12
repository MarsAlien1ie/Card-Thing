import React from 'react';
import { Link } from 'react-router-dom'; 

const Header = () => {
    return (
        <header className="header">
            <nav className="nav-links">
                <a href="#features">Features</a>
                <Link to="/login">
                    <button class="get-started-button">
                        Get Started
                    </button>
                </Link>
            </nav>
        </header>
    );
};

export default Header;