#include <mysql/mysql.h>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <string>
#include <chrono>

using json = nlohmann::json;
using namespace std;

// struct for card info
struct CardInfo
{
    string id;
    string name;
    string set_name;
    string image_url;
    string rarity;
    string types;
    string evoStage;
    int hp;
};

// read detected json file
CardInfo readCardFromJson(const string &path = "../image-model/detected_card.json")
{
    ifstream f(path);
    if (!f.is_open())
    {
        cerr << "Could not open " << path << endl; // path issue most likely
        exit(1);
    }

    json data;
    f >> data;
    f.close(); // get all the data and close

    CardInfo card;
    card.id = data.value("id", "");
    card.name = data.value("name", "");
    card.set_name = data.value("set_name", "");
    card.image_url = data.value("image_url", "");
    card.hp = stoi(data.value("hp", "0"));
    card.evoStage = data.value("subtypes", "Basic");
    card.types = data.value("types", "Unknown");
    card.rarity = data.value("rarity", "Unknown");

    return card; // returning the card info, some info may be missing and have defaults
}

// insert into db
void insertCardToDB(const CardInfo &card, double price, const string &catalogID)
{
    MYSQL *conn = mysql_init(nullptr);
    if (!conn)
    {
        cerr << "MySQL init failed.\n";
        return;
    }

    // connect to db and insert the card finally
    if (!mysql_real_connect(conn, "localhost", "root", "noakhali12", "POKEMON", 0, nullptr, 0))
    {
        cerr << "MySQL connection failed: " << mysql_error(conn) << endl;
        return;
    }

    cout << "Connected to MySQL!\n"; // make sure connection is good

    string checkQuery =
        "SELECT Quantity FROM CARDS WHERE CatalogID = " + catalogID + " AND PokeID='" + card.id + "'";

    mysql_query(conn, checkQuery.c_str());
    MYSQL_RES *res_check = mysql_store_result(conn);

    if (mysql_num_rows(res_check) > 0)
    {
        MYSQL_ROW row = mysql_fetch_row(res_check);
        int oldQty = stoi(row[0]);

        int newQty = oldQty + 1;

        string updateQtyQuery =
            "UPDATE CARDS SET Quantity=" + to_string(newQty) + " WHERE CatalogID=" + catalogID + " AND PokeID='" + card.id + "'";

        mysql_query(conn, updateQtyQuery.c_str());
        mysql_free_result(res_check);

        cout << "Updated quantity to " << newQty << " for card " << card.name << endl;

        return;
    }

    mysql_free_result(res_check);

    // insertion query
    string cardQuery =
        "INSERT INTO CARDS (CatalogID, PokeName, PokeID, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL) VALUES (" +
        catalogID + ", '" + card.name + "', '" + card.id + "', " + to_string(card.hp) + ", '" + card.evoStage + "', '" +
        card.types + "', '" + card.rarity + "', '" + card.set_name + "', " + to_string(price) + ", '" + card.image_url + "');";

    if (mysql_query(conn, cardQuery.c_str())) // make sure it was inserted properly
    {
        cerr << "DB Error: " << mysql_error(conn) << endl;
    }
    else
    {
        cout << "Card inserted successfully.\n";
    }

    cout << "Id: " << card.id << endl;
    cout << "Name: " << card.name << endl;
    cout << "Set name: " << card.set_name << endl;
    cout << "Card ID: " << card.id << endl;
    cout << "Image url: " << card.image_url << endl;
    cout << "Rarity: " << card.rarity << endl;
    cout << "Type: " << card.types << endl;
    cout << "Evo Stage: " << card.evoStage << endl;
    cout << "HP: " << card.hp << endl;

    mysql_close(conn);
}

int main(int argc, char *argv[]) // deleted all old instances of fetching price
{
    if (argc < 3)
    {
        cerr << "Usage: processCard <jsonPath> <catalogID>\n";
        return 1;
    }

    string jsonPath = argv[1];
    string catalogID = argv[2];

    cout << "Starting readind the card from the file" << endl;
    auto now = std::chrono::system_clock::now();
    CardInfo card = readCardFromJson(jsonPath);
    auto end = std::chrono::system_clock::now();
    std::chrono::duration<double> time = end - now;
    cout << "Time taken to read card info: " << time.count() << endl;

    cout << "Ending reading the card: " << card.name << " (" << card.set_name << ")\n"; // this is purely for testing time it takes to read card info
    // if the processor got the wrong card, this will also show cearly

    double price = 0.00;

    insertCardToDB(card, price, catalogID);
    return 0;
}

/*
g++ processCard.cpp -o processCard \
  -I/opt/homebrew/include \
  -L/opt/homebrew/lib \
  -lmysqlclient \
  -lcurl

./processCard
*/