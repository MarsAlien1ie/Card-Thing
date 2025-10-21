import React, { useState, useCallback, useEffect } from 'react';
import './DashboardPage.css';
import { useDropzone } from 'react-dropzone';
import {v4 as uuidv4} from 'uuid'
import pokeball from '../images/pokeball.png';

function DashboardPage() {
    // 'isModalOpen' is a state variable that tracks if the details pop-up is visible
    // 'setIsModalOpen' is the function I use to update its value (true/false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    // 'cards' is the state variable that holds the  array of card objects
    // 'setCards' adds/removes cards from the array
    const [cards, setCards] = useState([])

    //  Drag-and-Drop  
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
                <button className="add-card-button" onClick={open}>+ Add New Card</button>
            </header>
            {/* This is the dropzone element that was missing */}
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                {
                    // This shows different text based on if a user is dragging a file
                    isDragActive ?
                        <p>Drop the card here ...</p> :
                        <p>Drag 'n' drop a PNG file here</p>
                }
            </div>
            {/*  displays all the cards */}
            <div className="card-grid">
                {/* loops through the cards array and create a div for each card*/}
                {cards.map((card) => (
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