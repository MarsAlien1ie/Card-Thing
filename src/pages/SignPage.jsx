import React from "react";
import pikachuImage from '../images/pikachu.png';
import { Link } from 'react-router-dom';
import './SignPage.css'; 
import pikachu from '../images/pikachu.png';


const SignPage = () => {
    return (
        <div className="login-page-container">
            <form className="login-card">
                {/* Decorative Pikachu Image */}
                <img src={pikachuImage} alt="Pikachu peeking" className="pikachu-peeking" />

                <h1>Card Cataloger</h1>
                <p className="subtitle">Build, trade, and grow your ultimate card deck</p>

                <div className="input-group">
                    <label htmlFor="email">User name</label>
                    <input type="email" id="email" placeholder="Enter your name" />
                </div>
                {/* Email Input */}
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" placeholder="Enter your email" />
                </div>

                {/* Password Input */}
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" placeholder="Enter your password" />
                </div>

                {/* Sign up Button */}
                <button type="submit" className="login-button">
                    Sign Up
                </button>

                {/* Separator */}
                <div className="separator">
                    or
                </div>

                {/* Sign Up Link */}
                <p className="signup-link">
                    Already have an account? <Link to="/login">Log in </Link>
                </p>
            </form>
        </div>
    );
};

export default SignPage;