import React, { useState } from "react";
import {Link, useNavigate} from 'react-router-dom'
import "./LoginPage.css";
import pikachuImage from "../images/pikachu.png";
import pokeball from "../images/pokeball.png";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => { //login function handler
    e.preventDefault();
    try 
    {
      const res = await fetch("http://localhost:3001/login", //connect to backend
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json(); //should fetch user data from backend (if exists)
      if (res.ok) 
      {
        alert("Login successful!");
        console.log("Logged in user:", data.user); //for testing purposes
        localStorage.setItem("username", data.user.UserName);
        localStorage.setItem("userID", data.user.UserID);
        navigate('/dashboard'); //redirect to dashboard
      } 
      else 
      {
        alert("Unsuccessful! " + data.message); //probably wrong credentials
      }
    } 
    catch (err) 
    {
      console.error("Network error:", err);
      alert("Could not connect to backend."); //forgot to connect to backend
    }
  };

  return ( //login page UI (Danylo)
    <div className="login-page-container">
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
        <img src={pikachuImage} alt="Pikachu" className="pikachu-peeking" />
        <h1>Card Cataloger</h1>
        <p className="subtitle">Build, trade, and grow your ultimate card deck</p>

        <div className="input-group">
          <label htmlFor="username">User name</label>
          <input
            id="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          Login
        </button>

        <div className="separator">or</div>
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;