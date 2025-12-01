#include <mysql/mysql.h>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <string>
#include <chrono>

using json = nlohmann::json;
using namespace std;

size_t WriteCallback(void *contents, size_t size, size_t nmemb, string *output)
{
    size_t totalSize = size * nmemb;
    output->append((char *)contents, totalSize);
    return totalSize;
}

// mke url safe to search
string urlEncode(CURL *curl, const string &value)
{
    char *encoded = curl_easy_escape(curl, value.c_str(), value.length());
    string result = encoded ? encoded : "";
    curl_free(encoded);
    return result;
}

// fetching price with card id and then name + set (reusing old code)
double fetchPrice(const string &cardId, const string &cardName, const string &setName)
{
    CURL *curl = curl_easy_init();
    if (!curl)
    {
        cerr << "CURL init failed.\n";
        return 0.0;
    }

    string readBuffer;
    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "X-Api-Key: 557e28a2-673a-4944-ab1b-65f87b9d3f81");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);

    double price = -1; // default price will be -1
    CURLcode res;

    // get card id
    string url = "https://api.pokemontcg.io/v2/cards/" + cardId;
    // searching card url, hopefully no api failure error
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    res = curl_easy_perform(curl);

    if (res == CURLE_OK && readBuffer.find("\"data\"") != string::npos)
    {
        try
        {
            json response = json::parse(readBuffer); // parson the json of the above search
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

    // if not able to search with id, then try with name + set
    if (price < 0)
    {
        cout << "No price for ID; retrying with name+set query...\n"; // for testing purposes
        readBuffer.clear();                                           // clear the search
        string encodedName = urlEncode(curl, "\"" + cardName + "\"");
        string encodedSet = urlEncode(curl, "\"" + setName + "\""); // fixing for url search
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

    // if cannot find price with the two methods, price will now be 0
    if (price < 0)
    {
        cout << "No price found, defaulting to $0.00\n";
        price = 0.0;
    }

    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    return price;
}

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        cerr << "Usage: priceUpdater <cardID>" << endl;
        return 1;
    }

    int dbRowId = stoi(argv[1]); // the row of the card (cardID)

    MYSQL *conn = mysql_init(NULL);
    mysql_real_connect(conn, "127.0.0.1", "root", "noakhali12", "POKEMON", 3306, NULL, 0);

    string q = "SELECT PokeID, PokeName, PokeSet, UngradedPrice FROM CARDS WHERE CardID = " + to_string(dbRowId);
    //need the unqiue id of every card for these searches cause it was split from processCard and fetching json file again is redundant
    //also ned the ungraded price just in case of api failure


    mysql_query(conn, q.c_str());
    MYSQL_RES *res = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(res);

    string PokeID = row[0];
    string name = row[1];
    string setName = row[2];
    double oldPrice = atof(row[3]); //the old price will be maintained

    cout << "Existing price = " << oldPrice << endl;
    cout << "Fetching new price for: " << PokeID << endl; //testing purposes

    double newPrice = fetchPrice(PokeID, name, setName);

    if (newPrice <= 0.0)
    {
        cout << "API fetched 0, preserving old price: " << oldPrice << endl;
        newPrice = oldPrice;
    }
    else
    {
        cout << "New price fetched: " << newPrice << endl; 
    }

    string update = "UPDATE CARDS SET UngradedPrice = " + to_string(newPrice) + " WHERE CardID = " + to_string(dbRowId); //update the price

    mysql_query(conn, update.c_str());
    return 0;
}

/*
g++ priceUpdater.cpp -o priceUpdater \
  -I/opt/homebrew/include \
  -L/opt/homebrew/lib \
  -lmysqlclient \
  -lcurl

./priceUpdater
*/