import React, { useState } from "react";
import {Link, useNavigate} from 'react-router-dom'
import "./LoginPage.css";
import pikachuImage from "../images/pikachu.png";
import pokeball from "../images/pokeball.png";
import { GoogleLogin } from "@react-oauth/google";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  //talks to backend for google oauth
 const handleGoogleSuccess = async (credentialResponse) => {
  try {
    const res = await fetch("http://localhost:8000/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: credentialResponse.credential,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log("Google user:", data.user);

      //save the username
      localStorage.setItem("username", data.user.UserName);
      navigate("/dashboard");
    } else {
      alert("Google login failed: " + data.message);
    }

    //failed to fetch the data
  } catch (err) {
    console.error("Google login processing error:", err);
    alert("Google login failed");
  }
};


  //error 
  const handleGoogleError = () => {
    console.log("Google login failed");
    alert("Google login failed");
  };


  const handleLogin = async (e) => { //login function handler
    e.preventDefault();
    try 
    {                                     //changed to my database 8000
      const res = await fetch("http://localhost:8000/login", //connect to backend
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

        {/* The google login button */}
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>

        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;