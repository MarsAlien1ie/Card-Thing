import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from '@react-oauth/google'

//google client id 
const CLIENT_ID = "398747629639-h0v5olc2qolro39jqknfu4ihe1ntkjdq.apps.googleusercontent.com"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId = {CLIENT_ID}>
      <App />
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);