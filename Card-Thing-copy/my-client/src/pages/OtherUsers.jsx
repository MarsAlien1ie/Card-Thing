import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './OtherUsers.css';
import pokeball from '../images/pokeball.png';

export default function OtherUsers() {
  const [users, setUsers] = useState([]);

  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();  

  const loggedInUserId = Number(localStorage.getItem("userID")); //need to save userID for to not show yourself
  const loggedInUsername = localStorage.getItem("username");

  useEffect(() => {
  async function loadData() {
    try {
      const resUsers = await fetch("http://localhost:3001/allUsers"); //fetch all users
      const allUsers = await resUsers.json();

      const filteredUsers = allUsers.filter(u => u.UserID !== loggedInUserId); //dont show yourself

      // fetch all liked users
      const resLiked = await fetch(
        `http://localhost:3001/likedUsers?username=${loggedInUsername}`
      );
      const likedList = await resLiked.json();  // make list for the page to show

      const likedIds = new Set(likedList.map(u => u.UserID)); //get the userIDs to unique-ify them

      // merge liked status into full user list
      const merged = filteredUsers.map(u => ({
        ...u,
        isLiked: likedIds.has(u.UserID)
      }));

      setUsers(merged);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }

  loadData();
}, [loggedInUserId, loggedInUsername]);



  const handleLikeToggle = async (userId) => {
    const username = localStorage.getItem("username"); // get logged in username
    const isCurrentlyLiked = users.find(u => u.UserID === userId)?.isLiked; //check if the user is liked or not

    if (isCurrentlyLiked) { //
      await fetch("http://localhost:3001/unlikeUser", { //if liked, then can unlike
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likerUsername: username, likedUserId: userId })
      });
    } else {
      await fetch("http://localhost:3001/likeUser", { //if not liked, then can like
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likerUsername: username, likedUserId: userId })
      });
    }

    setUsers(prev => //update whenever some liking action is taken
      prev.map(u =>
        u.UserID === userId ? { ...u, isLiked: !u.isLiked } : u
      )
    );
  };

  const usersToDisplay =
    activeTab === "all" ? users : users.filter(u => u.isLiked); //filter to fisplay liked users

  return (
    <div className="other-users-page">
      <header className="dashboard-header">
        <div className="header-main-nav">
          <button className="nav-button" onClick={() => navigate('/dashboard')}> {/*back to dashboard my collection button*/}
            My Collection
          </button>
          <button className="nav-button active" onClick={() => navigate('/users')}>  {/*other users nav button*/}
            Other Users
          </button>
        </div>

        <div className="tab-container"> {/*showing all unliked users*/}
          <button
            className={`tab-button ${activeTab === "all" ? "active" : ""}`} 
            onClick={() => setActiveTab("all")}
          >
            All Users
          </button>
{/*showing all liked users*/}
          <button 
            className={`tab-button ${activeTab === "liked" ? "active" : ""}`}
            onClick={() => setActiveTab("liked")}
          >
            Liked Users
          </button>
        </div>
      </header>
      {/*style of the user buttons*/}
      <div className="container">
        <div className="user-list">
          {usersToDisplay.length > 0 ? (
            usersToDisplay.map(user => (
              <div
                key={user.UserID}
                className="user-item"
                onClick={() => navigate(`/catalog/${user.UserID}`)} 
              > {/*if they clicked on the user's tab then it will go to their catalog*/}
                <span className="user-name">{user.UserName}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeToggle(user.UserID); {/*if they clicked the heart, handle it*/}
                  }}
                  className="like-button"
                >
                  <Heart className={`like-icon ${user.isLiked ? "liked" : ""}`} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-list-message">
              {activeTab === "liked"
                ? "You haven't liked any users yet."
                : "No users found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
