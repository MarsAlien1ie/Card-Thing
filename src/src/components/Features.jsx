import React from 'react';
import user_auth_shield from '../images/user_auth_shield.png';
import catalog_control from '../images/catalog_control.png';
import trainer_community from '../images/trainer_community.png'

/* Component for features card */
function FeatureCard({ icon, title, text }) {
    return (
        <div className="feature-card">
            <img src={icon} className="feature-icon" />
            <h3>{title}</h3>
            <p>{text}</p>
        </div>
    );
}
const Features = () => {
    return (
        <section id="features" className="features">
            <h2>Master Your Collection</h2>
            <div class="gradient-separator-footer"></div>
            <div className="title-underline"></div>
            <div className="features-grid">
                <FeatureCard
                    icon={user_auth_shield}
                    title="User Authentication"
                    text="Create your free account to securely access and start building your ultimate Pokémon card collection today."
                />
                <FeatureCard
                    icon={catalog_control}
                    title="Catalog Control"
                    text="Easily delete, or add new cards to your collection — just drop a PNG of your Pokémon card, and it will be added to your master collection instantly."
                />
                <FeatureCard
                    icon={trainer_community}
                    title="Trainer Community"
                    text="Check out other users' collections, share yours, and explore what others have added."
                />
            </div>
        </section>
    );
};

export default Features;