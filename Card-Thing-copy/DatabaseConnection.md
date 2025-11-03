# How to Connect your SQL Database to the website


## Steps
> Create the SQL database
> Create the frontend React file
> Create the backend javascript file
> Run both and see the information display


```
Place you team's answer here
```

## Creating the database
> Download MySQLWorkbench for your operating system
> Create a connection (database) by clicking the plus sign in the interface
> Name the connection and put in a password (remember the password it is important)
> Copy and paste my SQL code and run it all and save the database file

```
CREATE SCHEMA POKEMON;

CREATE TABLE POKEMON.USERS (
	UserID INT AUTO_INCREMENT NOT NULL,
    UserName VARCHAR(50) NOT NULL,
    UserEmail VARCHAR(50) NOT NULL,
    UserPassword VARCHAR(50) NOT NULL,
    PRIMARY KEY(UserID)
);

CREATE TABLE POKEMON.CATALOG (
    CatalogID INT AUTO_INCREMENT NOT NULL,
    OwnerID INT NOT NULL,
    PRIMARY KEY (CatalogID),
    FOREIGN KEY (OwnerID)
        REFERENCES USERS (UserID)
);

CREATE TABLE POKEMON.CARDS (
    CardID INT AUTO_INCREMENT NOT NULL,
    CatalogID INT NOT NULL,
    PokeName VARCHAR(50) NOT NULL,
    HP SMALLINT NOT NULL,
	EvoStage TINYINT NOT NULL,
    Typing VARCHAR(50) NOT NULL,
    Rarity VARCHAR(50) NOT NULL,
    PokeSet VARCHAR(50) NOT NULL,
    UngradedPrice DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (CardID),
    FOREIGN KEY (CatalogID)
        REFERENCES CATALOG (CatalogID)
);


INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Ash', 'Ash@gmail.com', 'Ash123!');
INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Misty', 'Misty@gmail.com', 'Misty123!');
INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Brock', 'Brock@gmail.com', 'Brock123!');


INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Misty';

INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Brock';

INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Ash';


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Brock'), 
'Onix', 300, 1, 'Rock', '12/200', 'Kanto', 1.20);


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Ash'), 
'Pikachu', 150, 2, 'Electric', '50/200', 'Kanto', 10.20);


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Misty'), 
'Staryu', 120, 2, 'Water', '45/200', 'Kanto', 7.20);



INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Ash'),
'Charizard', 300, 3, 'Fire', '4/102', 'Base Set', 200.00);

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Ash'),
'Bulbasaur', 100, 1, 'Grass', '44/102', 'Base Set', 5.50);


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Misty'),
'Psyduck', 90, 1, 'Water', '53/110', 'Fossil', 3.00);

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Misty'),
'Gyarados', 250, 3, 'Water', '6/102', 'Base Set', 40.00);


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Brock'),
'Geodude', 80, 1, 'Rock', '74/132', 'Gym Heroes', 0.80);

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Brock'),
'Steelix', 280, 2, 'Steel', '15/111', 'Neo Genesis', 15.00);
```


> In your terminal type: mysql -u root -p
> This will check if your local instance is active and running



## Creating the React App
> If you already have a React App, then copy and paste the react code later. If not, read below:
> Make sure your cd is the Desktop or whatever folder your project files are stored at
> Create react framework and java script variant
> Copy the code into your terminal one by one

```
npm create vite@latest my-client
cd my-client
npm install
npm install axios
npm run dev
```

> Your react app should be running at http://localhost:5173/

> Copy and paste the React code below into your App.jsx inside your src folder :

```
import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3001/users")
      .then(res => setUsers(res.data))
      .catch(err => console.error("Error:", err));
  }, []);

  return (
    <div>
      <h1>Pokemon Users</h1>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </div>
  );
}

export default App;
```



## Creating the Javascript backend
> OUTSIDE THE my-client MAKE A NEW FOLDER 
> Copy the code below into your terminal one by one:


```
mkdir my-server
cd my-server
npm init -y
npm install express mysql2 cors
```

> Open your folder and copy the code into your server.js file:

```
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Connect to MySQL
const db = mysql.createConnection({
  host: "",   // or "localhost", but get the address from your SQL session
  user: "root",
  password: "",  // same one you type into Workbench
  database: "POKEMON",
  port:            // make sure this matches Workbench
});

// Test connection
db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database!");
});

// Example route
app.get("/users", (req, res) => {
  db.query("SELECT * FROM POKEMON.USERS", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```


> You have to fill in the host, password, and port yourself
> This is found when you open your database on MySQLWorkbench and start your session
> Look at the bottom left where it says Object Info and Session
> Click on session and you will find the necessary info
> Copy and paste it inside the host, password, and port variable declarations


> Save and then run by typing this in your terminal (make sure you are in the my-server directory)
> node server.js
> It should say it is connected


## Connecting everything and run

> On one terminal type:
> node server.js
> Do not close it


> On another terminal, go to the my-client directory which is your react page
> On the terminal, type:
> npm run dev

> Now it should display your information inserted on the database (just the users and their info)









