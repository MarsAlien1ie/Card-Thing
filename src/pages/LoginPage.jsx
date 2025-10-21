// src/components/LoginPage.js
import React from 'react';
import './LoginPage.css'; 
import {Link, useNavigate} from 'react-router-dom'
import pikachuImage from '../images/pikachu.png'; 
import pokeball from '../images/pokeball.png';

const LoginPage = () => {
    const navigate = useNavigate();
    const handleLogin = (event) =>{
        event.preventDefault();

        console.log("Login successful, navigating to dashboard");
        navigate('/dashboard');
    };
    return (
        <div className="login-page-container">
            <div className="login-header">
            </div>
            <div className="background-decorations">
                <img className="pokeball-decoration pos-1" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-2" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-4" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-5" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-6" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-7" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-8" src={pokeball} alt="" />
            </div>
            <form className="login-card" onSubmit={handleLogin}>
                {/* Decrative Pikachu Image */}
                <img src={pikachuImage} alt="Pikachu peeking" className="pikachu-peeking" />
                <h1>Card Cataloger</h1>
                <p className="subtitle">Build, trade, and grow your ultimate card deck</p>
                {/* Email Input */}
                <div className="input-group">
                    <label htmlFor="email">User name</label>
                    <input type="email" id="email" placeholder="Enter your user name" />
                </div>
                {/* Password Input */}
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" placeholder="Enter your password" />
                </div>
                {/* Login Button */}
                <button type="submit" className="login-button">
                    Login
                </button>
                {/* Separator */}
                <div className="separator">
                    or
                </div>
                {/* Sign Up Link */}
                <p className="signup-link">
                    Don't have an account? <Link to="/signup">Sign Up </Link>
                </p>
            </form>
        </div>
    );
};

export default LoginPage;