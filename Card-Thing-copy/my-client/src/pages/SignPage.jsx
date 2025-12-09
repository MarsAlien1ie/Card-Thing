import React, { useState } from "react";
import pikachuImage from '../images/pikachu.png';
import { Link } from 'react-router-dom';
import './SignPage.css'; 
import pikachu from '../images/pikachu.png';


const SignPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page reload

    //new logic to make sure fields arent null
    if (!username.trim()) {
      alert("Username cannot be empty.");
      return;
    }
    if (!email.trim()) {
      alert("Email cannot be empty.");
      return;
    }
    if (!password.trim()) {
      alert("Password cannot be empty.");
      return;
    }
    if (password.length < 5) {
      alert("Password must be at least 5 characters long.");
      return;
    }

    try { // signup set to backend and sent to database
      const response = await fetch("http://localhost:3001/signup", 
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (response.ok) 
      {
        alert("Signup successful!");
      } 
      else if (response.status === 409) 
      {
        alert("User already exists!"); // backend has unique code of 409 to prevent dup username and email
      } 
      else 
      {
        alert("Signup failed. Check console for details."); //shouldnt happen, some weird error
      }
    } 
    catch (err) 
    {
      console.error("Network error:", err); //probably forgot to boot up the server
      alert("Could not connect to backend.");
    }
  };

  return ( //all other UI elements (Danylo)
    <div className="login-page-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={pikachuImage} alt="Pikachu peeking" className="pikachu-peeking" />

        <h1>Card Cataloger</h1>
        <p className="subtitle">Build, trade, and grow your ultimate card deck</p>

        <div className="input-group">
          <label htmlFor="username">User name</label>
          <input
            id="username"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="login-button">
          Sign Up
        </button>

        <div className="separator">or</div>

        <p className="signup-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
};

export default SignPage;