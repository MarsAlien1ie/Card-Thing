import React, { useState } from 'react';
import { Heart } from 'lucide-react'; // For the heart icon
import { useNavigate } from 'react-router-dom';
import './OtherUsers.css'; 
import pokeball from '../images/pokeball.png';

// --- Mock Data ---
const MOCK_USERS = [
  { id: 1, name: 'Person1', isLiked: false },
  { id: 2, name: 'Person2', isLiked: false },
  { id: 3, name: 'Person3', isLiked: false },
  { id: 4, name: 'Person4', isLiked: false },
  { id: 5, name: 'Person5', isLiked: false },
  { id: 6, name: 'Jessie', isLiked: false },
  { id: 7, name: 'James', isLiked: false },
  { id: 8, name: 'John', isLiked: false },
  { id: 9, name: 'Tom', isLiked: false },
];

/*
  A single item in the user list
 */
function UserItem({ user, onLikeToggle }) {
  return (
    <div className="user-item">
      <span className="user-name">{user.name}</span>
      <button
        onClick={() => onLikeToggle(user.id)}
        className="like-button"
        aria-label={user.isLiked ? "Unlike user" : "Like user"}
      >
        <Heart
          className={`like-icon ${user.isLiked ? 'liked' : ''}`}
        />
      </button>
    </div>
  );
}
/**
  The main page component for the User Gallery.
 */
export default function OtherUsers() {
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState(MOCK_USERS);
  const navigate = useNavigate();

  const handleLikeToggle = (userId) => {
    setUsers(currentUsers =>
      currentUsers.map(user =>
        user.id === userId ? { ...user, isLiked: !user.isLiked } : user
      )
    );
  };

  const likedUsers = users.filter(user => user.isLiked);
  const usersToDisplay = activeTab === 'all' ? users : likedUsers;
  return (
    <div className="other-users-page">
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
              <div className="header-main-nav">
                  <button
                      className="nav-button"
                      onClick={() => navigate('/dashboard')}>
                      My Collection
                  </button>
                  <button className="nav-button active"
                      onClick={() => navigate('/users')}>
                      Other Users
                  </button>
              </div>
              {/* Tab Button Container */}
              <div className="tab-container">
                  <button
                      onClick={() => setActiveTab('all')}
                      className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                  >
                      All Users
                  </button>
                  <button
                      onClick={() => setActiveTab('liked')}
                      className={`tab-button ${activeTab === 'liked' ? 'active' : ''}`}
                  >
                      Liked Users
                  </button>
              </div>
          </header>
      <div className="container">
        {/* User List */}
        <div className="user-list">
          {usersToDisplay.length > 0 ? (
            usersToDisplay.map(user => (
              <UserItem
                key={user.id}
                user={user}
                onLikeToggle={handleLikeToggle}
              />
            ))
          ) : (
            <div className="empty-list-message">
              <p>
                {activeTab === 'liked'
                  ? "You haven't liked any users yet."
                  : "No users found."}
              </p>
            </div>
          )}
        </div>  
      </div>
    </div>
  );
}