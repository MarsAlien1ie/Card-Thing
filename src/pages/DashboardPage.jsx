import React, { useState, useCallback, useEffect } from 'react';
import './DashboardPage.css';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import pokeball from '../images/pokeball.png';

function DashboardPage() {
    // 'isModalOpen' is a state variable that tracks if the details pop-up is visible
    // 'setIsModalOpen' is the function I use to update its value (true/false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    // 'cards' is the state variable that holds the  array of card objects
    // 'setCards' adds/removes cards from the array
    const [cards, setCards] = useState([])

    //for search input
    const [searchCard, setSearchCard] = useState("");
    //for price sort
    const [sortOrder, setSortOrder] = useState("none");
    //for type dropdown
    const [selectedType, setSelectedType] = useState("all");

    const navigate = useNavigate(); // NEW: Initialize the navigate hook

    //  Drag-and-Drop  
    // 'onDrop' is a function that runs when a user drops a file onto the dropzone
    const onDrop = useCallback(acceptedFiles => {
        acceptedFiles.forEach(file => {
            // Create a new card object for each file
            const newCard = {
                // Use uuid() to create a unique ID
                id: uuidv4(),
                name: file.name,
                // Create a temporary URL to display the image preview
                imageUrl: URL.createObjectURL(file)
            };
            setCards(prevCards => [...prevCards, newCard]);
        });
    }, []);

    // Initialize the 'useDropzone' hook
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'], // Only accept .png files
        },
        noClick: true,
    });
    // 3. This effect handles cleanup to prevent memory leaks
    useEffect(() => {
        return () => {
            cards.forEach(card => URL.revokeObjectURL(card.imageUrl));
        };
    }, [cards]);

    //sets the modal state to 'true' to show it
    const handleCardClick = (card) => {
        setIsModalOpen(true);
    }

    //sets the modal state to 'false' to hide it
    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleDeleteCard = (event, cardIdToDelete) => {
        // Stop the click from bubbling up and opening the modal
        event.stopPropagation();

        // Create a new array without the card that matches the ID
        setCards(prevCards => prevCards.filter(card => card.id !== cardIdToDelete));
    };

    const handleLogout = () => {
        // Add your authentication logic here
        // I guess that's clearing local storage.
        // Example: localStorage.removeItem('userToken');
        console.log("User logging out...");
        // Redirect to the login page
        navigate('/');
    };

    let filteredAndSortedCards = [...cards];

    // This logic will work once u add card attributes like 'name', 'type', and 'price'

    // Apply Search Filter
    if (searchCard) {
        filteredAndSortedCards = filteredAndSortedCards.filter(card =>
            card.name && card.name.toLowerCase().includes(searchCard.toLowerCase())
        );
    }

    // Apply Type Filter
    if (selectedType !== "all") {
        filteredAndSortedCards = filteredAndSortedCards.filter(card =>
            card.type === selectedType
        );
    }

    // Apply Price Sort
    if (sortOrder !== "none") {
        filteredAndSortedCards.sort((a, b) => {
            const priceA = a.price || 0;
            const priceB = b.price || 0;

            if (sortOrder === 'asc') {
                return priceA - priceB;
            } else {
                return priceB - priceA;
            }
        });
    }
    return (
        <div className='dashboard-container'>
            <img className="pokeball-decoration pos-1" src={pokeball} alt="" />
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
                <h1>My Collection</h1>
         
                <div className="filter-controls">
                    <input
                        type="text"
                        placeholder="Search Card..."
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
                        onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
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
                    // This shows different text based on if a user is dragging a file
                    isDragActive ?
                        <p>Drop the card here ...</p> :
                        <p>Drag 'n' drop a PNG file here</p>
                }
            </div>
            {/*  displays all the cards */}
            <div className="card-grid">
                {/* loops through the cards array and create a div for each card*/}
                {filteredAndSortedCards.map((card) => (
                    <div
                        key={card.id}
                        className="card-container"
                    >
                        <button
                            className="delete-card-button"
                            onClick={(e) => handleDeleteCard(e, card.id)}>
                            &times;
                            </button>
                        <img src={card.imageUrl} alt={card.name} className="card-image" onClick={() => handleCardClick(card)} />
                        {/* The placeholder box for the price */}
                        <div className="price-hover-box">
                            {/* price goes here, Ashish */}
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Card Details</h2>
                        <p>Details for the selected card will go here</p>
                        <button onClick={closeModal} className="close-modal-button">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;