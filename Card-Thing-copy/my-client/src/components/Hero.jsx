import React from 'react';
import pikachuImage from '../images/crochet-pikachu.jpg';
import { Link } from 'react-router-dom'; 

const Hero = () => {
    return (
        <section className="hero">
            <div className="hero-text">
                <h1>
                    <span class="highlighted-text">Gotta Catalog 'Em All!</span> <br />
                    <span className="white">The Ultimate</span> <br />
                    <span className="red">Pokémon Card</span> <br />
                    <span className="blue">Collection Manager</span>
                </h1>
                <div class="gradient-separator"></div>
                <p>
                    Organize, track, and showcase your Pokémon card collection like a
                    true master trainer. Discover card values, and connect
                    with fellow collectors worldwide.
                </p>
                <Link to="/login">
                    <button className="btn-red-outline">Start Collecting</button>
                </Link>
            </div>
            <div className="hero-image-container">
                <div className="hero-image">
                    <img src={pikachuImage} alt="Crochet Pikachu" />
                </div>
            </div>
        </section>
    );
};

export default Hero;