#include <mysql/mysql.h>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <string>

using json = nlohmann::json;
using namespace std;

// api calls to fetch price
size_t WriteCallback(void* contents, size_t size, size_t nmemb, string* output) 
{
    size_t totalSize = size * nmemb;
    output->append((char*)contents, totalSize);
    return totalSize;
}

//mke url safe to search
string urlEncode(CURL* curl, const string& value) 
{
    char* encoded = curl_easy_escape(curl, value.c_str(), value.length());
    string result = encoded ? encoded : "";
    curl_free(encoded);
    return result;
}

//struct for card info
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

//fetching price with card id and then name + set
double fetchCardPrice(const string& cardId, const string& cardName, const string& setName) 
{
    CURL* curl = curl_easy_init();
    if (!curl) 
    {
        cerr << "CURL init failed.\n";
        return 0.0;
    }

    string readBuffer;
    struct curl_slist* headers = NULL;
    headers = curl_slist_append(headers, "X-Api-Key: 557e28a2-673a-4944-ab1b-65f87b9d3f81");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

    double price = -1; //default price will be -1
    CURLcode res;

    //get card id
    string url = "https://api.pokemontcg.io/v2/cards/" + cardId; 
    //searching card url, hopefully no api failure error
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    res = curl_easy_perform(curl);

    if (res == CURLE_OK && readBuffer.find("\"data\"") != string::npos) 
    {
        try 
        {
            json response = json::parse(readBuffer); //parson the json of the above search
            if (response.contains("data")) 
            {
                auto card = response["data"];
                if (card.contains("tcgplayer")) 
                {
                    auto prices = card["tcgplayer"]["prices"];
                    if (prices.contains("holofoil") && prices["holofoil"].contains("market"))
                    {
                        price = prices["holofoil"]["market"];
                    }
                    else if (prices.contains("normal") && prices["normal"].contains("market"))
                    {
                        price = prices["normal"]["market"];
                    }
                    else if (prices.contains("reverseHolofoil") && prices["reverseHolofoil"].contains("market"))
                    {
                        price = prices["reverseHolofoil"]["market"];
                    }
                }
            }
        } 
        catch (...) 
        {
            cerr << "Failed to parse card data for ID lookup.\n";
        }
    }

    //if not able to search with id, then try with name + set
    if (price < 0) 
    {
        cout << "No price for ID; retrying with name+set query...\n"; //for testing purposes
        readBuffer.clear(); //clear the search
        string encodedName = urlEncode(curl, "\"" + cardName + "\"");
        string encodedSet  = urlEncode(curl, "\"" + setName + "\""); //fixing for url search
        string fallbackUrl = "https://api.pokemontcg.io/v2/cards?q=name:" + encodedName + "+set.name:" + encodedSet;
        curl_easy_setopt(curl, CURLOPT_URL, fallbackUrl.c_str());
        res = curl_easy_perform(curl);

        if (res == CURLE_OK && readBuffer.find("\"data\"") != string::npos) 
        {
            try 
            {
                json response = json::parse(readBuffer);
                if (response.contains("data") && !response["data"].empty()) 
                {
                    auto card = response["data"][0];
                    if (card.contains("tcgplayer")) 
                    {
                        auto prices = card["tcgplayer"]["prices"];
                        if (prices.contains("holofoil") && prices["holofoil"].contains("market"))
                        {
                            price = prices["holofoil"]["market"];
                        }
                        else if (prices.contains("normal") && prices["normal"].contains("market"))
                        {
                            price = prices["normal"]["market"];
                        }
                        else if (prices.contains("reverseHolofoil") && prices["reverseHolofoil"].contains("market"))
                        {
                            price = prices["reverseHolofoil"]["market"];
                        }
                    }
                }
            } 
            catch (...) 
            {
                cerr << "Failed to parse fallback response.\n";
            }
        }
    }

    //if cannot find price with the two methods, price will now be 0
    if (price < 0) 
    {
        cout << "No price found, defaulting to $0.00\n";
        price = 0.0;
    }

    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    return price;
}


//read detected json file
CardInfo readCardFromJson(const string& path = "../image-model/detected_card.json") 
{
    ifstream f(path);
    if (!f.is_open()) 
    {
        cerr << "Could not open " << path << endl; //path issue most likely
        exit(1);
    }

    json data;
    f >> data;
    f.close(); //get all the data and close

    CardInfo card;
    card.id = data["id"];
    card.name = data["name"];
    card.set_name = data["set_name"];
    card.image_url = data["image_url"];
    card.hp = data.contains("hp") ? stoi((string)data["hp"]) : 0;
    card.evoStage = data.contains("subtypes") ? data["subtypes"][0] : "Basic";
    card.types = data.contains("types") ? data["types"][0] : "Unknown";
    card.rarity = data.contains("rarity") ? data["rarity"] : "Unknown";
    return card; //returning the card info, some info may be missing and have defaults
}

//insert into db
void insertCardToDB(const CardInfo& card, double price, const string& catalogID) 
{
    MYSQL* conn = mysql_init(nullptr);
    if (!conn) 
    { 
        cerr << "MySQL init failed.\n"; return; 
    }

    //connect to db and insert the card finally
    if (!mysql_real_connect(conn, "localhost", "root", "noakhali12", "POKEMON", 0, nullptr, 0)) 
    {
        cerr << "MySQL connection failed: " << mysql_error(conn) << endl;
        return;
    }

    cout << "Connected to MySQL!\n"; //make sure connection is good
    
    //insertion query
    string cardQuery =
        "INSERT INTO CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice, ImageURL) VALUES (" +
        catalogID + ", '" + card.name + "', " + to_string(card.hp) + ", '" + card.evoStage + "', '" +
        card.types + "', '" + card.rarity + "', '" + card.set_name + "', " + to_string(price) + ", '" + card.image_url + "');";
    
    
    if (mysql_query(conn, cardQuery.c_str())) //make sure it was inserted properly
    {
        cerr << "DB Error: " << mysql_error(conn) << endl;
    } 
    else 
    {
        cout << "Card inserted successfully.\n";
    }


    cout<<"Id: "<<card.id<<endl;
    cout<<"Name: "<<card.name<<endl;
    cout<<"Set name: "<<card.set_name<<endl;
    cout<<"Image url: "<<card.image_url<<endl;
    cout<<"Rarity: "<<card.rarity<<endl;
    cout<<"Type: "<<card.types<<endl;
    cout<<"Evo Stage: "<<card.evoStage<<endl;
    cout<<"HP: "<<card.hp<<endl;

    mysql_close(conn);
}



void getCardInfo(CardInfo &card) 
{
    CURL* curl = curl_easy_init();
    if (!curl) 
    {
        cerr << "CURL init failed.\n";
        return;
    }

    string readBuffer;
    struct curl_slist* headers = NULL;
    headers = curl_slist_append(headers, "X-Api-Key: 557e28a2-673a-4944-ab1b-65f87b9d3f81");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

    //try to get info with id first
    string url = "https://api.pokemontcg.io/v2/cards/" + card.id;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    CURLcode res = curl_easy_perform(curl);

    bool success = false; //flag for success

    if (res == CURLE_OK && readBuffer.find("\"data\"") != string::npos) 
    {
        try 
        {
            json response = json::parse(readBuffer);
            if (response.contains("data")) 
            {
                auto data = response["data"];
                success = true; //got the data with id (possibly can still have missing info, need to do testing)

                if (card.hp == 0 && data.contains("hp")) card.hp = stoi((string)data["hp"]);
                if (card.types == "Unknown" && data.contains("types")) card.types = data["types"][0];
                if (card.evoStage == "Basic" && data.contains("subtypes")) card.evoStage = data["subtypes"][0];
                if (card.rarity == "Unknown" && data.contains("rarity")) card.rarity = data["rarity"];
            }
        } 
        catch (...) 
        {
            cerr << "Failed to parse JSON for ID lookup.\n";
        }
    }

    //if failed, use name + set
    if (!success) 
    {
        cout << "No info found using ID. Retrying with name+set search\n";
        readBuffer.clear();

        string encodedName = urlEncode(curl, "\"" + card.name + "\"");
        string encodedSet  = urlEncode(curl, "\"" + card.set_name + "\"");
        string searchUrl = "https://api.pokemontcg.io/v2/cards?q=name:" + encodedName + "+set.name:" + encodedSet;
        curl_easy_setopt(curl, CURLOPT_URL, searchUrl.c_str());
        res = curl_easy_perform(curl);

        if (res == CURLE_OK && readBuffer.find("\"data\"") != string::npos) 
        {
            try 
            {
                json response = json::parse(readBuffer);
                if (response.contains("data") && !response["data"].empty()) 
                {
                    auto data = response["data"][0];

                    if (card.hp == 0 && data.contains("hp")) card.hp = stoi((string)data["hp"]);
                    if (card.types == "Unknown" && data.contains("types")) card.types = data["types"][0];
                    if (card.evoStage == "Basic" && data.contains("subtypes")) card.evoStage = data["subtypes"][0];
                    if (card.rarity == "Unknown" && data.contains("rarity")) card.rarity = data["rarity"];
                } 
                else 
                {
                    cerr << "No card data found in name+set search.\n";
                }
            } 
            catch (...) 
            {
                cerr << "Failed to parse fallback name+set data.\n";
            }
        }
    }

    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
}


int main(int argc, char* argv[]) 
{
    if (argc < 3) 
    {
        cerr << "Usage: processCard <jsonPath> <catalogID>\n";
        return 1;
    }

    string jsonPath = argv[1];
    string catalogID = argv[2];

    CardInfo card = readCardFromJson(jsonPath);
    cout << "Processing card: " << card.name << " (" << card.set_name << ")\n";
    //if the processor got the wrong card, this will also show cearly

    getCardInfo(card);

    double price = fetchCardPrice(card.id, card.name, card.set_name);
    cout << "Price fetched: $" << price << endl;

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