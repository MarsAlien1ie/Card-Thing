import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import mysql from "mysql2";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import crypto from "crypto"; //to create a unique code for each image upload
import bcrypt from "bcrypt";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" }); //this is where all uploaded cards go (folder)

//connect to MySQL, info below
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "noakhali12",
  database: "POKEMON",
  port: 3306
});

db.connect((err) => { //connect to the database
  if (err) 
  {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// signups for new user logic
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  console.log("Signup request received:", username, email); //for testing (making sure the signup gets received to the backend)
  try 
  {
    const hashedPassword = await bcrypt.hash(password, 10); //put the password through 10 salt rounds
   
    execFile("./my-server/build/newUser", [username, email, hashedPassword], (error, stdout, stderr) => { //calling the executable file for signups
      console.log("C++ Output:", stdout); //testing to make sure it reaches the c++ code

      if (error) 
      {
        if (error.code === 2) 
        {
          // error code 2 will be for duplicate users
          return res.status(409).json({ message: "User already exists" });
        }
        console.error("Error adding user:", stderr);
        return res.status(500).json({ message: "Database insert failed" }); //other weird error occurs, testing purposes
      }
      res.status(200).json({ message: "Signup successful!" }); 
      }
    );
  }
  catch (err) 
  {
    console.error("Error hashing password:", err);
    res.status(500).json({ message: "Internal server error" }); //there ws a problem hashing the password (dont know what it would be, maybe db?)
  }
});




//login lgoci
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM USERS WHERE UserName = ?"; //finding by the username this time because the password is hashed
  db.query(query, [username], async (err, results) => 
  {
    if (err) 
    {
      console.error("Database error:", err); //error that shouldnt happen, probably unconnected db
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) //basically, couldnt fetch a result(match)
    {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = results[0]; //save the user

    try { //comparing input password with hashed password
      const passwordMatch = await bcrypt.compare(password, user.UserPassword);

      if (!passwordMatch) 
      {
        return res.status(401).json({ message: "Invalid username or password" }); //invalid match with the unhashed passwords
      }

      console.log("User logged in:", username); //message to see if the user and which user was logge din

      // get the user's catalogid after login
      const catalogQuery = "SELECT CatalogID FROM CATALOG WHERE OwnerID = ?";
      
      db.query(catalogQuery, [user.UserID], (catErr, catResults) => {
        if (catErr || catResults.length === 0) 
        {
          console.error("No catalog found for user:", username);
          return res.status(404).json({ message: "Catalog not found" }); //this should not happen anymore, any user signed up should have a catalog
        }

        const catalogID = catResults[0].CatalogID;
        
        //send back both user info and catalog ID
        res.status(200).json({
          message: "Login successful",
          user,
          catalogID,
        });
      });
    } 
    catch (err) 
    {
      console.error("Error comparing passwords:", err);
      res.status(500).json({ message: "Internal server error" }); //some error with the hashing function
    }
  });
});



//uploading logic, should disallow any uploads while one card is being uploaded already
app.post("/upload", upload.single("cardImage"), (req, res) => {
  const filePath = path.resolve(req.file.path);
  console.log("Received image:", filePath); //see if image was sent to backend

  // make sure the correct user's catalog is being uploaded into, using username for now as a connector
  const username = req.body.username;
  console.log("Received upload from user:", username);
  
  const jobId = crypto.randomBytes(8).toString("hex"); //creating a unique job id for each image upload
  const jobDir = path.join(__dirname, "temp", jobId); //make the unique path name
  fs.mkdirSync(jobDir, { recursive: true });

  const jsonPath = path.join(jobDir, "detected_card.json"); //make the path

  // first, run Python predictor
  execFile("python3", [path.join(__dirname, "image-model", "predictor.py"), filePath, jsonPath], (pyErr, pyOut, pyErrOut) => { //file path to the code
      if (pyErr) 
      {
        // if predictor exited with code 3 then there was no detection
        if (pyErr.code === 3) 
        {
          console.error("No card detected in image.");
          fs.rm(jobDir, { recursive: true, force: true }, () => {});
          return res.status(400).json({ error: "No card detected" });
        }
        console.error("Python error:", pyErrOut || pyErr.message);
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
        return res.status(500).json({ error: "Python processing failed" });
      }

      console.log("Python output:", pyOut);

      // checking the JSON for this job exists
      if (!fs.existsSync(jsonPath)) 
      {
        console.error("Predictor did not write JSON."); //this is probably a false card or processor didnt detect it
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
        return res.status(400).json({ error: "No detected card JSON" }); //no jsons for bad card reads
      }

      // step 2, get catalog ID for this user
      const userQuery = "SELECT UserID FROM USERS WHERE UserName = ?";  //using username as a connector for this for now
      db.query(userQuery, [username], (userErr, userResults) => {
        if (userErr || userResults.length === 0) 
        {
          console.error("Could not find user:", userErr);
          fs.rm(jobDir, { recursive: true, force: true }, () => {});
          return res.status(404).json({ error: "User not found" }); //user may not be in the database for some reason even though logged in, probably a database issue
        }

        const userID = userResults[0].UserID;
        const catalogQuery = "SELECT CatalogID FROM CATALOG WHERE OwnerID = ?"; //get the catalog
        db.query(catalogQuery, [userID], (catErr, catResults) => {
          if (catErr || catResults.length === 0) 
          {
            console.error("Could not find catalog:", catErr);
            fs.rm(jobDir, { recursive: true, force: true }, () => {});
            return res.status(404).json({ error: "Catalog not found" }); //database issue most likely
          }

          const catalogID = catResults[0].CatalogID;

          //step 3, run c++ program with json path and catalogID
          execFile(path.join(__dirname, "C++ Code", "processCard"), [jsonPath, catalogID.toString()],(cppErr, cppOut, cppErrOut) => {
              if (cppErr) 
              {
                console.error("C++ error:", cppErrOut || cppErr.message); //couldnt get ot the c++ code
                fs.rm(jobDir, { recursive: true, force: true }, () => {});
                return res.status(500).json({ error: "C++ processing failed" });
              }

              console.log("C++ Output:", cppOut);

              //step 4, fetch latest inserted card
              db.query(
                "SELECT * FROM CARDS ORDER BY CardID DESC LIMIT 1;",
                (err, results) => {
                  // cleanup
                  fs.rm(jobDir, { recursive: true, force: true }, () => {}); //removing the temp file made for the job

                  if (err) 
                  {
                    console.error("MySQL error:", err);
                    return res.status(500).json({ error: "Database fetch failed" }); //database connection issue
                  }
                  res.status(200).json({ card: results[0] });
            }
          );
        });
      });
    });
  });
});


app.get("/userCards", (req, res) => {
  const { username } = req.query;

  if (!username) //using username to load the user's data
  {
    return res.status(400).json({ error: "Username is required" }); //issue if backend cant find the usernae
  }

  const userQuery = "SELECT UserID FROM USERS WHERE UserName = ?";
  db.query(userQuery, [username], (userErr, userResults) => 
  {
    if (userErr || userResults.length === 0) 
    {
      console.error("Could not find user:", userErr);
      return res.status(404).json({ error: "User not found" }); //same issue
    }

    const userID = userResults[0].UserID; //get all the cards that is in the user's catalog
    const query = `
      SELECT cr.*
      FROM USERS u
      JOIN CATALOG c ON u.UserID = c.OwnerID
      JOIN CARDS cr ON c.CatalogID = cr.CatalogID
      WHERE u.UserID = ?;
    `;
    db.query(query, [userID], (err, results) => {
      if (err) 
      {
        console.error("MySQL error:", err); //some database fetching issue happened
        return res.status(500).json({ error: "Database fetch failed" });
      }
      res.json(results);
    });
  });
});



//delete card logic by cardID
app.delete("/deleteCard/:cardId", (req, res) => {
  const cardId = req.params.cardId; //get the cardID

  const query = "DELETE FROM CARDS WHERE CardID = ?"; //query to find the card in the database and will delete it
  db.query(query, [cardId], (err, result) => {
    if (err) 
    {
      console.error("Error deleting card:", err);
      return res.status(500).json({ error: "Database delete failed" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Card not found" }); //cards should be in the dashboard, possibly a fetching issue
    }

    console.log(`Card ${cardId} deleted successfully`);
    res.status(200).json({ message: "Card deleted successfully" });
  });
});



// getting all users for the otherusers page
app.get("/allUsers", (req, res) => {
  const query = "SELECT UserID, UserName FROM USERS";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Failed to load users:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});



app.get("/catalogById/:id", (req, res) => { //the page names have to be differentiated by their userid
  const userId = req.params.id;

  //gets the cards of the user with the clicked on userID
  const userQuery = "SELECT UserName FROM USERS WHERE UserID = ?"; 
  const cardsQuery = `
    SELECT cr.*
    FROM CATALOG c
    JOIN CARDS cr ON c.CatalogID = cr.CatalogID
    WHERE c.OwnerID = ?;
  `;

  db.query(userQuery, [userId], (err, userResults) => {
    if (err || userResults.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResults[0].UserName;

    db.query(cardsQuery, [userId], (err2, cardResults) => {
      if (err2) {
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        username,
        cards: cardResults,
      });
    });
  });
});


app.get("/likedUsers", (req, res) => { //liking user logic for getching
  const { username } = req.query;

  if (!username)
    return res.status(400).json({ error: "Username is required" });

  const q1 = "SELECT UserID FROM USERS WHERE UserName = ?";
  db.query(q1, [username], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: "User not found" });

    const userID = results[0].UserID;

    //new table for getting the liked users of the logged in one
    const q2 = `
      SELECT u.UserID, u.UserName
      FROM LIKES l
      JOIN USERS u ON l.LikedUserID = u.UserID
      WHERE l.LikerID = ?;
    `;

    db.query(q2, [userID], (err2, liked) => {
      if (err2)
        return res.status(500).json({ error: "DB error" });

      res.json(liked);
    });
  });
});



app.post("/likeUser", (req, res) => { //liking user logic for posting
  const { likerUsername, likedUserId } = req.body;

  const getUser = "SELECT UserID FROM USERS WHERE UserName = ?";
  db.query(getUser, [likerUsername], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: "User not found" });

    const likerID = results[0].UserID;

    const insert = "INSERT IGNORE INTO LIKES (LikerID, LikedUserID) VALUES (?, ?)"; //userid and the liked user's id is inserted
    db.query(insert, [likerID, likedUserId], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to like" });
      res.json({ success: true });
    });
  });
});


app.delete("/unlikeUser", (req, res) => { //unliking user logic for deleting
  const { likerUsername, likedUserId } = req.body;

  const getUser = "SELECT UserID FROM USERS WHERE UserName = ?"; //get the userID of the logged in user
  db.query(getUser, [likerUsername], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: "User not found" });

    const likerID = results[0].UserID;

    const del = "DELETE FROM LIKES WHERE LikerID = ? AND LikedUserID = ?"; //find the user you are unliking and delete that perosn
    db.query(del, [likerID, likedUserId], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to unlike" });
      res.json({ success: true });
    });
  });
});








//this is all unused, just to see originally if the backend is actually connected
app.get("/allData", (req, res) => {
  const query = `
    SELECT 
      u.UserID, 
      u.UserName, 
      u.UserEmail, 
      c.CatalogID,
      cr.CardID,
      cr.PokeName,
      cr.HP,
      cr.EvoStage,
      cr.Typing,
      cr.Rarity,
      cr.PokeSet,
      cr.UngradedPrice
    FROM USERS u
    JOIN CATALOG c ON u.UserID = c.OwnerID
    JOIN CARDS cr ON c.CatalogID = cr.CatalogID
    ORDER BY u.UserID, c.CatalogID, cr.CardID;
  `;

  db.query(query, (err, results) => {
    if (err) 
    {
      console.error("Error fetching joined data:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});


// start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});