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
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import session from "express-session";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const newUserPath = path.join(__dirname, "build", "newUser.exe");
//const processCardPath = path.join(__dirname, "C++ Code", "processCard.exe");
//const priceUpdaterPath = path.join(__dirname, "C++ Code", "priceUpdater.exe");




const app = express();
const PORT = 3001;

app.use(
  session({ //session middleware for passport
    secret: "pokecardcatalogerkey",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

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
  if (err) {
    console.error("Database connection failed:", err);
  }
  else {
    console.log("Connected to MySQL database");
  }
});

// signups for new user logic
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
  return res.status(400).json({ message: "Fields cannot be empty." });
}


  console.log("Signup request received:", username, email); //for testing (making sure the signup gets received to the backend)
  try {
    const hashedPassword = await bcrypt.hash(password, 10); //put the password through 10 salt rounds

    execFile("./my-server/build/newUser", [username, email, hashedPassword], (error, stdout, stderr) => { //calling the executable file for signups
      console.log("C++ Output:", stdout); //testing to make sure it reaches the c++ code

      if (error) {
        if (error.code === 2) {
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
  catch (err) {
    console.error("Error hashing password:", err);
    res.status(500).json({ message: "Internal server error" }); //there ws a problem hashing the password (dont know what it would be, maybe db?)
  }
});




//login lgoci
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM USERS WHERE UserName = ?"; //finding by the username this time because the password is hashed
  db.query(query, [username], async (err, results) => {
    if (err) {
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

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid username or password" }); //invalid match with the unhashed passwords
      }

      console.log("User logged in:", username); //message to see if the user and which user was logge din

      // get the user's catalogid after login
      const catalogQuery = "SELECT CatalogID FROM CATALOG WHERE OwnerID = ?";

      db.query(catalogQuery, [user.UserID], (catErr, catResults) => {
        if (catErr || catResults.length === 0) {
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
    catch (err) {
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
  execFile("python3", [path.join(__dirname, "image_model", "final_main.py"), filePath, jsonPath], (pyErr, pyOut, pyErrOut) => { //file path to the code
    if (pyErr) {
      // if predictor exited with code 3 then there was no detection
      if (pyErr.code === 3) {
        console.error("No card detected in image.");
        fs.rm(jobDir, { recursive: true, force: true }, () => { });
        return res.status(400).json({ error: "No card detected" });
      }
      console.error("Python error:", pyErrOut || pyErr.message);
      fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Python processing failed" });
    }

    console.log("Python output:", pyOut);

    // checking the JSON for this job exists
    if (!fs.existsSync(jsonPath)) {
      console.error("Predictor did not write JSON."); //this is probably a false card or processor didnt detect it
      fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(400).json({ error: "No detected card JSON" }); //no jsons for bad card reads
    }

    // step 2, get catalog ID for this user
    const userQuery = "SELECT UserID FROM USERS WHERE UserName = ?";  //using username as a connector for this for now
    db.query(userQuery, [username], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        console.error("Could not find user:", userErr);
        fs.rm(jobDir, { recursive: true, force: true }, () => { });
        return res.status(404).json({ error: "User not found" }); //user may not be in the database for some reason even though logged in, probably a database issue
      }

      const userID = userResults[0].UserID;
      const catalogQuery = "SELECT CatalogID FROM CATALOG WHERE OwnerID = ?"; //get the catalog
      db.query(catalogQuery, [userID], (catErr, catResults) => {
        if (catErr || catResults.length === 0) {
          console.error("Could not find catalog:", catErr);
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(404).json({ error: "Catalog not found" }); //database issue most likely
        }

        const catalogID = catResults[0].CatalogID;

        //step 3, run c++ program with json path and catalogID
        execFile(
          path.join(__dirname, "C++ Code", "processCard"), //run process card first
          [jsonPath, catalogID.toString()],
          (cppErr, cppOut, cppErrOut) => {
            if (cppErr) {
              console.error("C++ error:", cppErrOut || cppErr.message);
              fs.rm(jobDir, { recursive: true, force: true }, () => { });
              return res.status(500).json({ error: "C++ processing failed" });
            }

            console.log("C++ Output:", cppOut);

            // step 4 — fetch the card JUST inserted
            db.query(
              "SELECT * FROM CARDS ORDER BY CardID DESC LIMIT 1;",
              (err, results) => {

                if (err) {
                  console.error("MySQL error:", err);
                  fs.rm(jobDir, { recursive: true, force: true }, () => { });
                  return res.status(500).json({ error: "Database fetch failed" });
                }

                const insertedCard = results[0];

                // new step 5 - get the price in the background
                execFile(
                  path.join(__dirname, "C++ Code", "priceUpdater"), //call price updater
                  [String(insertedCard.CardID)],
                  console.log("Finishing getting price for:", insertedCard.CardID),
                  (err) => {
                    if (err) {
                      console.log("Price updater failed silently:", err.message);
                    }
                  }
                );

                // cleanup temp directory for this upload
                fs.rm(jobDir, { recursive: true, force: true }, () => { });

                // return card immediately even before price is updated
                return res.status(200).json({ card: insertedCard });
              }
            );
          }
        );
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
  db.query(userQuery, [username], (userErr, userResults) => {
    if (userErr || userResults.length === 0) {
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
      if (err) {
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

  const quantityQuery = "SELECT Quantity FROM CARDS WHERE CardID = ?"; //check the quantity of the card

  db.query(quantityQuery, [cardId], (err, results) => {
    if (err) //generic database error
      {
      console.error("Error checking quantity:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) 
    { //card should e found since its on the web app
      return res.status(404).json({ error: "Card not found" });
    }

    const quantity = results[0].Quantity; //pull the quantity

    if (quantity <= 1)  //if quantity is 1 or less, delete the card entirely
      { 
      const deleteQuery = "DELETE FROM CARDS WHERE CardID = ?";
      db.query(deleteQuery, [cardId], (err) => {
        if (err) 
        {
          console.error("Delete failed:", err);
          return res.status(500).json({ error: "Delete failed" });
        }
        console.log(`Card ${cardId} removed entirely`);
        return res.json({ deleted: true, newQuantity: 0 });
      });
    } 
    else 
    { //if there is more than one quantity, decrement by 1
      const updateQuery = "UPDATE CARDS SET Quantity = Quantity - 1 WHERE CardID = ?";
      db.query(updateQuery, [cardId], (err) => {
        if (err) 
        {
          console.error("Quantity update failed:", err);
          return res.status(500).json({ error: "Quantity update failed" });
        }
        console.log(`Card ${cardId} quantity reduced`);
        return res.json({ deleted: false, newQuantity: quantity - 1 }); //send back quant
      });
    }
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

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const q1 = "SELECT UserID FROM USERS WHERE UserName = ?";

  db.query(q1, [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userID = results[0].UserID;

    //new table for getting the liked users of the logged in one
    const q2 = `
      SELECT u.UserID, u.UserName
      FROM LIKES l
      JOIN USERS u ON l.LikedUserID = u.UserID
      WHERE l.LikerID = ?;
    `;

    db.query(q2, [userID], (err2, liked) => {
      if (err2) {
        return res.status(500).json({ error: "DB error" });
      }

      res.json(liked);
    });
  });
});



app.post("/likeUser", (req, res) => { //liking user logic for posting
  const { likerUsername, likedUserId } = req.body;

  const getUser = "SELECT UserID FROM USERS WHERE UserName = ?";
  db.query(getUser, [likerUsername], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const likerID = results[0].UserID;

    const insert = "INSERT IGNORE INTO LIKES (LikerID, LikedUserID) VALUES (?, ?)"; //userid and the liked user's id is inserted
    db.query(insert, [likerID, likedUserId], (err2) => {
      if (err2) {
        return res.status(500).json({ error: "Failed to like" });
      }
      res.json({ success: true });
    });
  });
});


app.delete("/unlikeUser", (req, res) => { //unliking user logic for deleting
  const { likerUsername, likedUserId } = req.body;

  const getUser = "SELECT UserID FROM USERS WHERE UserName = ?"; //get the userID of the logged in user
  db.query(getUser, [likerUsername], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const likerID = results[0].UserID;

    const del = "DELETE FROM LIKES WHERE LikerID = ? AND LikedUserID = ?"; //find the user you are unliking and delete that perosn
    db.query(del, [likerID, likedUserId], (err2) => {
      if (err2) {
        return res.status(500).json({ error: "Failed to unlike" });
      }

      res.json({ success: true });
    });
  });
});



app.post("/updateAllPrices", (req, res) => { //new price updater logic
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" }); //issue if backend cant find the usernae
  }

  const userQuery = "SELECT UserID FROM USERS WHERE UserName = ?"; //this shouldn't be an error, because two people cant have the same username
  db.query(userQuery, [username], (err, userResults) => {
    if (err || userResults.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userID = userResults[0].UserID;

    const cardsQuery = `SELECT cr.CardID, cr.PokeID FROM CARDS cr JOIN CATALOG c ON cr.CatalogID = c.CatalogID WHERE c.OwnerID = ?`;
    //fetching all the cards in the catalog

    db.query(cardsQuery, [userID], (err, cards) => { //more safety checks
      if (err) {
        console.error("DB error fetching cards:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (cards.length === 0) {
        return res.status(200).json({ message: "No cards to update." });
      }

      console.log(`Updating prices for ${cards.length} cards...`);

      //running priceUpdater for each card
      cards.forEach(card => {
        execFile(
          path.join(__dirname, "C++ Code", "priceUpdater"),
          [String(card.CardID)], //passing in the cardID (not row number, but actual cardID)
          (cppErr, cppOut, cppErrOut) => {
            if (cppErr) {
              console.error(`Price update failed for card ${card.CardID}`);
              console.error(cppErrOut || cppErr.message);
              return;
            }

            console.log("Price updated:", cppOut);
          }
        );
      });

      return res.status(200).json(
        {
          message: "Price updates started."
        });
    });
  });
});

//below is all passport and google oauth logic
passport.serializeUser((user, done) => { //storing user session info
  done(null, user.UserID);
});

passport.deserializeUser((id, done) => { //getting user info from session
  const q = "SELECT * FROM USERS WHERE UserID = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return done(err);
    return done(null, rows[0]); //returning the user
  });
});

passport.use(
  new GoogleStrategy(
    { //google oauth credentials
      clientID: "74352189358-0i7imqd08l0i279kj5aoct6nbeqa7cjq.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "http://localhost:3001/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      const googleEmail = profile.emails[0].value; //getting email and name from google profile
      const googleName = profile.displayName;

      // need to check if the user exsists already
      const q = "SELECT * FROM USERS WHERE UserEmail = ?";

      db.query(q, [googleEmail], async (err, rows) => {
        if (err) return done(err);

        // if he exists, return the user
        if (rows.length > 0) return done(null, rows[0]);

        // if he dosn't exist, create the user
        const insertUserQuery = "INSERT INTO USERS (UserName, UserEmail, UserPassword) VALUES (?, ?, ?)";

        // generate a random password and hash it although google users wont need it, but need to store something in db
        const randomPassword = crypto.randomBytes(16).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        db.query(insertUserQuery, [googleName, googleEmail, hashedPassword], (err, result) => {
          if (err) return done(err);

          const newUserID = result.insertId; //get the new user's id

          // create catalog
          db.query("INSERT INTO CATALOG (OwnerID) VALUES (?)", [newUserID]);

          return done(null, {
            UserID: newUserID,
            UserName: googleName,
            UserEmail: googleEmail,
          }); //returning the new user info
        });
      });
    }
  )
);


app.get( //route to start google oauth
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get( //callback route after google oauth
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:5173/login" }),
  (req, res) => {
    const user = req.user;

    res.redirect(
      `http://localhost:5173/googleAuthSuccess?userID=${user.UserID}&username=${user.UserName}` //redirecting to frontend with user info
    );
  }
);






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
    if (err) {
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