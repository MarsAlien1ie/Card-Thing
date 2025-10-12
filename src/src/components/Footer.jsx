import React from 'react';
import red_circle from '../images/red_circle.png';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-logo-title">
                <img src={red_circle} className="footer-logo" />
                <h3>Card Cataloger</h3>
            </div>
            <p>The ultimate platform for Pokémon card collectors worldwide</p>
        </footer>
    );
};

export default Footer;
