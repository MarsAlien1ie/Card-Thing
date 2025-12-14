import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import "./DashboardPage.css"; // reuse styling
import pokeball from "../images/pokeball.png";
import grass from '../images/grass.png';
import lightning from '../images/lightning.png';
import dark from '../images/dark.png';
import fairy from '../images/fairy.png';
import fire from '../images/fire.png';
import psychic from '../images/psychic.png';
import metal from '../images/metal.png';
import dragon from '../images/dragon.jpg';
import water from '../images/water.png';
import fighting from '../images/fighting.png';
import colorless from '../images/colorless.png';
import all_type from '../images/all_type.png';
import pikachu from '../images/pikachu.webp';

export default function UserCatalog() {
  {/*most of the code is copy and paste from the dahsboard of the logged in user, it doesnt include remove and uploading cards obv*/ }
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);


  const [cards, setCards] = useState([]);
  const [username, setUsername] = useState("");

  //for search input
  const [searchCard, setSearchCard] = useState("");
  //for price sort
  const [sortOrder, setSortOrder] = useState("none");
  //for type dropdown

  const typeOptions = [
    { value: 'all', label: 'All Types', image: all_type },
    { value: 'Grass', label: 'Grass', image: grass },
    { value: 'Lightning', label: 'Lightning', image: lightning },
    { value: 'Darkness', label: 'Darkness', image: dark },
    { value: 'Fairy', label: 'Fairy', image: fairy },
    { value: 'Fire', label: 'Fire', image: fire },
    { value: 'Psychic', label: 'Psychic', image: psychic },
    { value: 'Metal', label: 'Metal', image: metal },
    { value: 'Dragon', label: 'Dragon', image: dragon },
    { value: 'Water', label: 'Water', image: water },
    { value: 'Fighting', label: 'Fighting', image: fighting },
    { value: 'Colorless', label: 'Colorless', image: colorless }
  ];


  //for custom type dropdown
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTypeLabel, setSelectedTypeLabel] = useState("All Types");
  const [selectedTypeImage, setSelectedTypeImage] = useState(typeOptions[0].image);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadCatalog() { //fetch user catalog from backend
      try {
        const res = await fetch(`http://localhost:3001/catalogById/${userId}`);
        const data = await res.json();

        if (!Array.isArray(data.cards)) {
          console.error("Invalid response", data);
          return;
        }

        setCards(data.cards);
        setUsername(data.username);
      } catch (err) {
        console.error("Error fetching user catalog:", err);
      }
    }

    loadCatalog();
  }, [userId]);

  const filteredCards = useMemo(() => {
    let results = [...cards]; //get all the cards

    // searching by name
    if (searchCard.trim() !== "") {
      results = results.filter((card) =>
        card.PokeName.toLowerCase().includes(searchCard.toLowerCase())
      );
    }

    // searching by type
    if (selectedType !== "all") {
      results = results.filter((card) => card.Typing === selectedType);
    }

    // sort by price
    if (sortOrder !== "none") {
      results.sort((a, b) => {
        const priceA = parseFloat(a.UngradedPrice);
        const priceB = parseFloat(b.UngradedPrice);

        if (isNaN(priceA) || isNaN(priceB)) return 0; //shouldn't happen, but just in case

        return sortOrder === "asc" ? priceA - priceB : priceB - priceA; //generic sorting logic for asc and desc
      });
    }

    return results;
  }, [cards, searchCard, selectedType, sortOrder]);


  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };


  const closeModal = () => {
    setIsModalOpen(false);
  };




  return (
    <div className="dashboard-container">
      <img className="pokeball-decoration pos-1" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-2" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-3" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-4" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-5" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-6" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-7" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-8" src={pokeball} alt="" />
      <img className="pokeball-decoration pos-9" src={pokeball} alt="" />

      <header className="dashboard-header">
        <h1>{username}'s Collection</h1>
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search Cards..."
            className="search-input"
            value={searchCard}
            onChange={(e) => setSearchCard(e.target.value)}
          />
          <div className="type-select-custom">
            <button
              className="type-select-toggle"
              onClick={() => setIsTypeDropdownOpen(prev => !prev)}
            >
              <div className="type-label-row">
                <img src={selectedTypeImage} alt="" className="type-icon" />
                {selectedTypeLabel}
              </div>
              {/*small arrow icon*/}
              <span className="dropdown-arrow">&#9662;</span>
            </button>
            {/*the code after && runs if istypedropdown is true
                        It deals how we show/hide the menu
                        */}
            {isTypeDropdownOpen && (
              <div className="type-select-menu">
                {/*Maps through the typeOptions array*/}
                {typeOptions.map(option => (
                  <div
                    key={option.value}
                    className="type-select-option"
                    onClick={() => {
                      setSelectedType(option.value);
                      setSelectedTypeLabel(option.label);
                      setSelectedTypeImage(option.image); // Update image
                      setIsTypeDropdownOpen(false);
                    }}
                  >
                    <img src={option.image} alt="" className="type-icon" />
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="sort-button"
            onClick={() => setSortOrder(prev => prev === "none" ? "asc" : prev === "asc" ? "desc" : "none")}
          >
            Sort by Price {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
          </button>
        </div>

        <button className="add-card-button" onClick={() => navigate("/users")}>
          <span className="inner-oval">← Back to Users</span>
        </button>
      </header>

      <div className="card-grid">
        {filteredCards.map(card => (
          <div key={card.CardID} className="card-container">
            <img
              src={card.ImageURL}
              alt={card.PokeName}
              className="card-image"
              onClick={() => handleCardClick(card)}
            />
            <div className="price-hover-box">
              ${Number(card.UngradedPrice).toFixed(2)}
            </div>
            <div className='quantity-hover-box'>
              x {card.Quantity} {/*display the quantity of the card*/}
            </div>
          </div>
        ))
        }
      </div>
      {isModalOpen && selectedCard && (
        <div className="modal-overlay">
          <div className="modal-content"> {/*display all the card information*/}
            <h2>{selectedCard.PokeName}</h2>
            <p><strong>Set:</strong> {selectedCard.PokeSet}</p>
            <p><strong>HP:</strong> {selectedCard.HP}</p>
            <p><strong>Evolution Stage:</strong> {selectedCard.EvoStage}</p>
            <p><strong>Type:</strong> {selectedCard.Typing}</p>
            <p><strong>Rarity:</strong> {selectedCard.Rarity}</p>
            <p><strong>Qty:</strong> {selectedCard.Quantity}</p>
            <p><strong>Price:</strong> ${parseFloat(selectedCard.UngradedPrice || 0).toFixed(2)}</p>
            {/*page reads price as a string, converting to float*/}

            <button onClick={closeModal} className="close-modal-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
