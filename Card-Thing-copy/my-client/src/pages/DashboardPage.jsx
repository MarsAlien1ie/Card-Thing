import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './DashboardPage.css';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import pokeball from '../images/pokeball.png';

function DashboardPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const username = localStorage.getItem("username");

  //for search input
  const [searchCard, setSearchCard] = useState("");
  //for price sort
  const [sortOrder, setSortOrder] = useState("none");
  //for type dropdown
  const [selectedType, setSelectedType] = useState("all");

  //fetching card from backend on dashboard
  useEffect(() => {
    async function fetchCards() 
    {
      if (!username) return; //loading cards to correct account and make sure user is logged in
      try 
      {
        const response = await fetch(`http://localhost:3001/userCards?username=${username}`);
        const data = await response.json();
        setCards(data);
        console.log("Loaded cards:", data); //test message to make sure user's cards are loaded
      } 
      catch (err) 
      {
        console.error("Error fetching cards:", err); //test message to spot errors
      }
    }
    fetchCards();

    const interval = setInterval(fetchCards, 5000); //new refresh every 5 seconds to update card price

    return () => clearInterval(interval);
  }, [username]);


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


  //file uploading
  const onDrop = useCallback(async (acceptedFiles) => 
  {
    if (!username) 
    {
      alert("No username found, please log in again.");
      //making sure that the card is uploaded on the right account,
      //can change to userID, but no dup usernames should exist
      return;
    }

    for (const file of acceptedFiles) 
    {
      const formData = new FormData();
      formData.append("cardImage", file);
      formData.append("username", username);

      try 
      {
        const response = await fetch("http://localhost:3001/upload", 
        {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("Upload success:", data);

        //adds new card
        if (data.card) setCards((prev) => [...prev, data.card]);
      } 
      catch (err) 
      {
        console.error("Upload failed:", err); //test message to spot errors
      }
    }
  }, [username]);

  //cleanup temporary object urls
  useEffect(() => {
    return () => 
    {
      cards.forEach(card => URL.revokeObjectURL(card.imageUrl));
    };
  }, [cards]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    noClick: true, //no longer just png, also jpg and jpegs
  });

  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = (card) => {
  setSelectedCard(card);
  setIsModalOpen(true);
  };


  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleDeleteCard = async (event, cardIdToDelete) => {
    event.stopPropagation(); // prevent modal popup

    try 
    {
      const response = await fetch(`http://localhost:3001/deleteCard/${cardIdToDelete}`, 
      {
        method: "DELETE", //sends delete to backend
      });

      if (!response.ok) 
      {
        const data = await response.json();
        alert(`Failed to delete card: ${data.error || response.statusText}`);
        return;
      }

      // remove the card from the dashboard UI
      setCards(prevCards => prevCards.filter(card => card.CardID !== cardIdToDelete));

      console.log(`🗑️ Card ${cardIdToDelete} removed from dashboard`); //for testing to see if right card was deleted
    } 
    catch (error) 
    {
      console.error("Error deleting card:", error);
    }
  };


  const handleLogout = () => {
        // Add your authentication logic here
        // I guess that's clearing local storage.
        // Example: localStorage.removeItem('userToken');
        console.log("User logging out...");
        // Redirect to the landing page
        navigate('/');
  };

  const handleUpdateAllPrices = async () => { //new button to update prices
    //if (!username) return alert("Not logged in.");

    try 
    {
      const response = await fetch("http://localhost:3001/updateAllPrices", //call the backend when clicking
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      alert(data.message || "Prices are being updated!");
  } 
  catch (err) 
  {
    console.error("Error updating prices:", err);
  }
};


  return ( //UI layout + some logic
    <div className='dashboard-container'>
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
        <div className="header-main-nav">
                    <button
                        className="nav-button active"
                        onClick={() => navigate('/dashboard')}>
                        My Collection
                    </button>
                    <button className="nav-button"
                        onClick={() =>navigate('/users')}>
                        Other Users
                    </button>
                </div>
          <div className="price updater">
            <button className="update-prices-button" onClick={handleUpdateAllPrices}>
              Update All Prices
            </button>
          </div>
        
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
        <div className="header-buttons">
          <button className="add-card-button" onClick={open}>+ Add New Card</button>
          <button className="logout-button" onClick={handleLogout}>Log Out</button> {/* NEW: Logout Button */}
        </div>
      </header>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop the card here ...</p> : <p>Drag 'n' drop a PNG or JPG file here</p>}
      </div>

      {/*UI of the card and interactivity*/}
      <div className="card-grid">
        {filteredCards.map((card) => ( //unique key for each card is mapped, no longer need uuidv4 i believe
          <div key={card.CardID} className="card-container"> 
            <button className="delete-card-button"
              onClick={(e) => handleDeleteCard(e, card.CardID)} //when user clicks the X button
            >
              &times;
            </button>
            <img src={card.ImageURL} alt={card.PokeName} className="card-image" onClick={() => handleCardClick(card)}/> {/* display a clean copy of the card from the tcg url */}
            <div className="price-hover-box">
              ${Number(card.UngradedPrice).toFixed(2)} {/*convert price to a float*/}
              {/*this hover box doesn't look too good, in the css, make it prettier*/}
            </div>
          </div>
        ))}
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

export default DashboardPage;