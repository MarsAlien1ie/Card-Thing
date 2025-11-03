#include <mysql/mysql.h>
#include <iostream>
#include <string>

using namespace std;

//reusing existing helper from main file
void newCatalog(MYSQL* conn, unsigned long ownerID) 
{
    //any user signing up gets a catalog
    string catalogQuery = "INSERT INTO CATALOG (OwnerID) VALUES (" + to_string(ownerID) + ")"; //owerID foreign key
    if (mysql_query(conn, catalogQuery.c_str())) 
    {
        cerr << "Error inserting catalog: " << mysql_error(conn) << "\n";
    } 
    else 
    {
        cout << "Catalog created successfully for user ID: " << ownerID << "\n"; //verify inserting
    }
}




int main(int argc, char* argv[]) 
{
    if (argc < 4) 
    {
        cerr << "Usage: " << argv[0] << " <UserName> <UserEmail> <UserPassword>\n";
        return 1;
    }

    string userName = argv[1];
    string userEmail = argv[2];
    string userPassword = argv[3]; //get the user inputs

    MYSQL* conn = mysql_init(nullptr);
    if (!conn) 
    {
        cerr << "Init failed\n";
        return 1;
    }

    if (!mysql_real_connect(conn, "localhost", "root", "noakhali12", "POKEMON", 0, nullptr, 0)) 
    {
        cerr << "Connection failed: " << mysql_error(conn) << "\n"; //mysql connection didnt work, wrong credentials likely
        return 1;
    }

    cout << "Connected successfully!\n";


    // checking for duplicates
    string checkQuery =
        "SELECT COUNT(*) FROM USERS WHERE UserEmail='" + userEmail +
        "' OR UserName='" + userName + "'";
    if (mysql_query(conn, checkQuery.c_str())) 
    {
        cerr << "Duplicate check failed: " << mysql_error(conn) << "\n";
        mysql_close(conn);
        return 1;
    } //any same users or emails arent allowed

    MYSQL_RES* result = mysql_store_result(conn);
    MYSQL_ROW row = mysql_fetch_row(result);
    int count = stoi(row[0]);
    mysql_free_result(result);

    if (count > 0) 
    {
        cout << "User already exists with this email or username.\n";
        mysql_close(conn);
        return 2; // special return code for duplicates
    }

    // inserting user if not duplicate
    string userQuery =
        "INSERT INTO USERS (UserName, UserEmail, UserPassword) VALUES ('" +
        userName + "', '" + userEmail + "', '" + userPassword + "')";
    if (mysql_query(conn, userQuery.c_str())) 
    {
        cerr << "Error inserting user: " << mysql_error(conn) << "\n";
        mysql_close(conn);
        return 1;
    }

    unsigned long userID = mysql_insert_id(conn);
    cout << "User inserted successfully with ID: " << userID << "\n"; //verify insert

    //create catalog
    newCatalog(conn, userID); //the two outputs should have the same IDs

    mysql_close(conn);
    cout << "User and catalog creation complete!\n";
    return 0;
}





/*
g++ newUser.cpp -o ../build/newUser -I/opt/homebrew/include -L/opt/homebrew/lib -lmysqlclient


./newUser
*/