import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './DashboardPage.css';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import pokeball from '../images/pokeball.png';
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


function DashboardPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const username = localStorage.getItem("username");

  //for search input
  const [searchCard, setSearchCard] = useState("");
  //for price sort
  const [sortOrder, setSortOrder] = useState("none");

  //this is to keep track of the amount of te cards being uploaded
  const [uploadsInProgress, setUploadsInProgress] = useState(0);

  //for type dropdown
  // Card type dropdown options
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

  //fetching card from backend on dashboard
  useEffect(() => {
    async function fetchCards() {
      if (!username) return; //loading cards to correct account and make sure user is logged in

      try {
        const response = await fetch(`http://localhost:3001/userCards?username=${username}`);
        const fetchedData = await response.json();

        setCards(prevCards => {
          if (prevCards.length === 0) return fetchedData; //for if there are no cards

          // if there are any cards, call the function to update them
          return fetchedData.map(card => {
            const exists = prevCards.find(c => c.PokeID === card.PokeID);
            return exists ? { ...exists, ...card } : card;
          });
        });

        console.log("Loaded cards:", fetchedData);
      }
      catch (err) 
      {
        console.error("Error fetching cards:", err);
      }
    }

    fetchCards();

    const interval = setInterval(fetchCards, 1500); //refrehs the page every 1.5 seconds for the card prices to show
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
  const onDrop = useCallback(async (acceptedFiles) => {
    if (!username) {
      alert("No username found, please log in again.");
      //making sure that the card is uploaded on the right account,
      //can change to userID, but no dup usernames should exist
      return;
    }

    setUploadsInProgress(prev => prev + acceptedFiles.length); //increment the amount of uploads being added

    await Promise.all(
      acceptedFiles.map(async (file) => {
        const formData = new FormData(); //sending file to backend
        formData.append("cardImage", file);
        formData.append("username", username);

        try 
        {
          const response = await fetch("http://localhost:3001/upload",
          {
            method: "POST",
            body: formData,
          });
          await response.json();
        }
      catch (err) 
      {
        console.error("Upload failed:", err); //test message to spot errors
      } 
      finally 
      {
        setUploadsInProgress(prev => prev - 1); //when upload is done, decrease
      }
    })
    );
  }, [username]);

  //cleanup temporary object urls
  useEffect(() => {
    return () => {
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

  //delete now deletes one quantity per click
  const handleDeleteCard = async (event, cardIdToDelete) => {
    event.stopPropagation();

    try {
      const response = await fetch(`http://localhost:3001/deleteCard/${cardIdToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json(); //send this to backend

      if (data.deleted) 
        {//to delete the entire card when there is only 1 left
        setCards(prevCards => prevCards.filter(card => card.CardID !== cardIdToDelete));
      } 
      else 
        { //update the card quantity to (should be -1 at a time)
        setCards(prevCards => prevCards.map(card => card.CardID === cardIdToDelete ? { ...card, Quantity: data.newQuantity } : card
          )
        );
      }
    } 
    catch (err) 
    {
      console.error("Failed to delete card", err);
    }
  };




  const handleLogout = () => {
    // Add your authentication logic here
    // I guess that's clearing local storage.
    // Example: localStorage.removeItem('userToken');
    console.log("User logging out...");
    // redirect to the landing page
    navigate('/');
  };

  const handleUpdateAllPrices = async () => { //new button to update prices
    //if (!username) return alert("Not logged in.");

    try {
      const response = await fetch("http://localhost:3001/updateAllPrices", //call the backend when clicking
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });

      const data = await response.json();
      alert(data.message || "Prices are being updated!");
    }
    catch (err) {
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
            onClick={() => navigate('/users')}>
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
        <div className="header-buttons">
          <button className="add-card-button" onClick={open}>+ Add New Card</button>
          <button className="logout-button" onClick={handleLogout}>Log Out</button> {/* NEW: Logout Button */}
        </div>
      </header>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {
          uploadsInProgress > 0 ? ( //to show loading animation when uploading
            <div className="loading-indicator">
              <img
                src={pikachu}
                alt="Loading..."
                width="80"
              />
              <p className = "animationText">{uploadsInProgress === 1 ? 
              "Catching 1 card..." : //if 1 card ? if multiple cards
              `Catching ${uploadsInProgress} cards...`}
              </p>
            </div>
            // This shows different text based on if a user is dragging a file
          ) : isDragActive ?
            <p>Drop the card here ...</p> :
            <p>Drag 'n' drop a PNG or JPG file here</p>
        }
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
            <img src={card.ImageURL} alt={card.PokeName} className="card-image" onClick={() => handleCardClick(card)} /> {/* display a clean copy of the card from the tcg url */}
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

export default DashboardPage;