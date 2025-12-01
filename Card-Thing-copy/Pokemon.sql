CREATE SCHEMA POKEMON;

CREATE TABLE POKEMON.USERS (
	UserID INT AUTO_INCREMENT NOT NULL,
    UserName VARCHAR(50) NOT NULL,
    UserEmail VARCHAR(50) NOT NULL,
    UserPassword TEXT NOT NULL,
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
    PokeID VARCHAR(32) NOT NULL,
    HP SMALLINT NOT NULL,
	EvoStage VARCHAR(50) NOT NULL,
    Typing VARCHAR(50) NOT NULL,
    Rarity VARCHAR(50) NOT NULL,
    PokeSet VARCHAR(50) NOT NULL,
    UngradedPrice DECIMAL(10,2) NOT NULL,
    ImageURL MEDIUMTEXT NOT NULL,
    PRIMARY KEY (CardID),
    FOREIGN KEY (CatalogID)
        REFERENCES CATALOG (CatalogID)
);


CREATE TABLE POKEMON.LIKES (
    LikeID INT AUTO_INCREMENT PRIMARY KEY,
    LikerID INT NOT NULL,
    LikedUserID INT NOT NULL,
    CONSTRAINT fk_liker FOREIGN KEY (LikerID) REFERENCES USERS(UserID) ON DELETE CASCADE,
    CONSTRAINT fk_liked FOREIGN KEY (LikedUserID) REFERENCES USERS(UserID) ON DELETE CASCADE
);



/*
INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Ash', 'Ash@gmail.com', 'Ash123!');
INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Misty', 'Misty@gmail.com', 'Misty123!');
INSERT INTO POKEMON.USERS (UserName, UserEmail, UserPassword) VALUES ('Brock', 'Brock@gmail.com', 'Brock123!');


INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Misty';

INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Brock';

INSERT INTO POKEMON.CATALOG (OwnerID) 
SELECT UserID FROM POKEMON.USERS WHERE UserName = 'Ash';


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Brock'), 
'Onix', 300, 'Basic', 'Rock', '12/200', 'Kanto', 1.20, 'fakeurl');


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Ash'), 
'Pikachu', 150, 'Stage 1', 'Electric', '50/200', 'Kanto', 10.20, 'fakeurl');


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT CatalogID FROM POKEMON.CATALOG, POKEMON.USERS WHERE UserID = OwnerID AND UserName = 'Misty'), 
'Staryu', 120, 'Stage 1', 'Water', '45/200', 'Kanto', 7.20, 'fakeurl');



INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Ash'),
'Charizard', 300, 'Stage 2', 'Fire', '4/102', 'Base Set', 200.00, 'fakeurl');

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Ash'),
'Bulbasaur', 100, 'Basic', 'Grass', '44/102', 'Base Set', 5.50, 'fakeurl');


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Misty'),
'Psyduck', 90, 'Basic', 'Water', '53/110', 'Fossil', 3.00, 'fakeurl');

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Misty'),
'Gyarados', 250, 'Stage 2', 'Water', '6/102', 'Base Set', 40.00, 'fakeurl');


INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Brock'),
'Geodude', 80, 'Basic', 'Rock', '74/132', 'Gym Heroes', 0.80, 'fakeurl');

INSERT INTO POKEMON.CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL)
VALUES((SELECT c.CatalogID FROM POKEMON.CATALOG c JOIN POKEMON.USERS u ON u.UserID = c.OwnerID WHERE u.UserName = 'Brock'),
'Steelix', 280, 'Stage 1', 'Steel', '15/111', 'Neo Genesis', 15.00, 'fakeurl');

DELIMITER $$

CREATE TRIGGER after_user_insert
AFTER INSERT ON POKEMON.USERS
FOR EACH ROW
BEGIN
    INSERT INTO POKEMON.CATALOG (OwnerID)
    VALUES (NEW.UserID);
END $$

DELIMITER ;
*/

SELECT *
FROM POKEMON.USERS;

SELECT *
FROM POKEMON.LIKES;

SELECT *
FROM POKEMON.CATALOG;

SELECT *
FROM POKEMON.CARDS;

SELECT *
FROM POKEMON.USERS, POKEMON.CATALOG, POKEMON.CARDS
WHERE CARDS.CatalogID = CATALOG.CatalogID AND UserID = OwnerID;

SELECT *
FROM POKEMON.USERS, POKEMON.CATALOG
WHERE UserID = OwnerID;

 
SELECT CatalogID
FROM POKEMON.CATALOG, POKEMON.USERS
WHERE USERS.UserID = CATALOG.OwnerID AND USERS.UserName = "fake";

DELETE FROM POKEMON.USERS
WHERE UserID = 2;

DROP SCHEMA POKEMON