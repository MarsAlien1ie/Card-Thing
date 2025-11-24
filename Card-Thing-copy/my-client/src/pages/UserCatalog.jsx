import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import "./DashboardPage.css"; // reuse styling
import pokeball from "../images/pokeball.png";

export default function UserCatalog() { {/*most of the code is copy and paste from the dahsboard of the logged in user, it doesnt include remove and uploading cards obv*/}
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
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    async function loadCatalog() {
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
          <select
            size="1"
            className="type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Grass">Grass</option>
            <option value="Lightning">Lightning</option>
            <option value="Darkness">Darkness</option>
            <option value="Fairy">Fairy</option>
            <option value="Fire">Fire</option>
            <option value="Psychic">Psychic</option>
            <option value="Metal">Metal</option>
            <option value="Dragon">Dragon</option>
            <option value="Water">Water</option>
            <option value="Fighting">Fighting</option>
            <option value="Colorless">Colorless</option>
          </select>
          <button
            className="sort-button"
            onClick={() => setSortOrder(prev => prev === "none" ? "asc" : prev === "asc" ? "desc" : "none")}
          >
            Sort by Price {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
          </button>
        </div>

        <button className="add-card-button" onClick={() => navigate("/users")}>
          ← Back to Users
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
            <p><strong>Price:</strong> ${parseFloat(selectedCard.UngradedPrice || 0).toFixed(2)}</p>
            {/*page reads price as a string, converting to float*/}

            <button onClick={closeModal} className="close-modal-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
