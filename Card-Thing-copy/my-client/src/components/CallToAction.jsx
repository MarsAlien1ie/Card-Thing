import React from 'react';
import { Link } from 'react-router-dom'; 

const CallToAction = () => {
    return (
        <section className="cta">
            <div className="cta-box">
                <h2>Ready to Become a Pokémon Master?</h2>
                <div className="gradient-separator-footer"></div>
                <div className="title-underline-center"></div>
                <p>
                    Join thousands of trainers who are already
                    using Card Cataloger to manage their collections
                </p>
                <Link to="/login" className="btn btn-red">Get Started</Link>
            </div>
        </section>
    );
};

export default CallToAction;