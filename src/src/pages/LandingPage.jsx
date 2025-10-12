import React from "react";
import "./LandingPage.css";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import CallToAction from "../components/CallToAction";
import pokeball from '../images/pokeball.png';

function LandingPage() {
    return (
        <div className="landing-page">
            <div className="background-decorations">
                <img className="pokeball-decoration pos-1" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-2" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-3" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-4" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-5" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-6" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-7" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-8" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-9" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-10" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-11" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-12" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-13" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-14" src={pokeball} alt="" />
                <img className="pokeball-decoration pos-15" src={pokeball} alt="" />
            </div>
            <div className="main-container">
                <Header />
                <Hero />
                <Features />
                <CallToAction />
                <Footer />
            </div>
        </div>
    );
}

export default LandingPage;