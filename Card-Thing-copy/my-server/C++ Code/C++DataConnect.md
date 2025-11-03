# How to Connect your SQL Database to the C++ Code

##This may not work exactly right on your operating system due to different path files and such
##My operating system: MacBook M1 Chip, Sequoia (shouldnt matter the version)

## Steps
> Install the mysql-connector-c++
> Set up your VSCode configurations
> Write the C++ Code



## Install the mysql-connector-c++

> Install mysql if you havent already: brew install mysql
> Go to your terminal and copy and paste the code below to check the paths:

```
brew install mysql-connector-c++
brew info mysql-connector-c++
```

> You should see something like this:

```
/opt/homebrew/include
/opt/homebrew/lib
```
> You can confirm it by typing this code and it might not say that the file does not exist,
but they may be different paths slightly on your OS

```
ls /opt/homebrew/include/mysql/mysql.h
ls /opt/homebrew/lib | grep mysql
```

> If you found that it exists or found where the files are located, you can move on


## Setting up Configurations

> Open your VSCode and whatever C++ file you are using to run your code
> Open your configurations
> If you can find it, press Cmd+Shift+P on VSCode and type Edit configurations and click the JSON file
> My configurations look like below, but you only need to edit a few spots


```
{
    "version": 4,
    "configurations": [
        {
            "name": "Mac M1",
            "includePath": [
                "${workspaceFolder}/**",
                "/opt/homebrew/include"
            ],
            "defines": [],
            "macFrameworkPath": [
                "/System/Library/Frameworks",
                "/Library/Frameworks"
            ],
            "compilerPath": "/usr/bin/clang",
            "cStandard": "c17",
            "cppStandard": "c++20",
            "intelliSenseMode": "macos-clang-arm64",
            "browse": {
                "path": [
                    "${workspaceFolder}",
                    "/opt/homebrew/include"
                ],
                "limitSymbolsToIncludedHeaders": true
            }
        }
    ]
}

```

> Change where it says "/opt/homebrew/include" to where your homebrew includes are located





## Write the C++ Code

> Remember that this is for M1 Mac, your includes might be somewhat different 
> In libraries, you may notice #include <mysql/mysql.h>
> It might be "#include <mysql.h>" only for you 


```
#include <mysql/mysql.h>
#include <iostream>
#include <string>

int main() {
    MYSQL *conn = mysql_init(nullptr);
    if (!conn) { std::cerr << "Init failed\n"; return 1; }

    if (!mysql_real_connect(conn, "localhost", "root", "password", "POKEMON", 0, nullptr, 0)) {
        std::cerr << "Connection failed: " << mysql_error(conn) << "\n";
        return 1;
    }

    std::cout << "Connected successfully!\n";

    std::string userQuery = "INSERT INTO USERS (UserName, UserEmail, UserPassword) VALUES ('Red','Red@gmail.com','Red123!')";
    if (mysql_query(conn, userQuery.c_str())) std::cerr << mysql_error(conn) << "\n";

    unsigned long userID = mysql_insert_id(conn);
    std::string catalogQuery = "INSERT INTO CATALOG (OwnerID) VALUES (" + std::to_string(userID) + ")";
    mysql_query(conn, catalogQuery.c_str());

    unsigned long catalogID = mysql_insert_id(conn);
    std::string cardQuery = "INSERT INTO CARDS (CatalogID, PokeName, HP, EvoStage, Typing, Rarity, PokeSet, UngradedPrice) "
                            "VALUES (" + std::to_string(catalogID) + ", 'Pikachu', 150, 2, 'Electric', '50/200', 'Kanto', 10.20)";
    mysql_query(conn, cardQuery.c_str());
    
    std::cout<<"Everything worked"<<std::endl;

    mysql_close(conn);
    return 0;
}

```

> In the line where it says: if (!mysql_real_connect(conn, "localhost", "root", "password", "POKEMON", 0, nullptr, 0)) {

> Change password and POKEMON to your MySQL Database password and the name of your databse, mine is Pokemon


> To run the code, open the terminal and run

```
g++ main.cpp -o main \
    -I/opt/homebrew/include \
    -L/opt/homebrew/lib -lmysqlclient
```


```
./main
```

> Now this may not work for you fully and there may be some issues poping up but thats fine
> Tell me what happened and we will try to debug it






