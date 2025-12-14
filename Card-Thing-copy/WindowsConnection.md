# How to get website running for windows 

## Installs 
>make sure Node.js and Python are installed 

```
https://nodejs.org/
https://www.python.org/downloads/

```


## Python Installs 
> Install the following python dependencys for image processing

```
python -m pip install opencv-python imagehash pillow scipy ultralytics imutils

python -m pip install paddlepaddle paddleocr

```

## Installing the Visual Studio Build tools and Windows SDK

>Download visual studio community, 

>once installed select the desktop development with c++ workload 
``` 
https://visualstudio.microsoft.com/downloads/

```

## Important components 
>Make sure the install contains the following

>MSVC v14.x x64/x86 build tools

>Windows 10 SDK or Windows 11 SDK

>Windows Universal CRT

>C++ CMake tools for Windows 

## Use the MSVC (cl.exe) compiler on Windows

> This project must be compiled using the MSVC (cl.exe)  
> it should not use g++, MinGW, or MSYS2  

> VS Code does NOT automatically select cl.exe


## Verify installs 
> Now open x64 Native Tools Command Prompt for Visual Studio, and enter the following
``` 
cl

```
> You should then see Microsoft (R) C/C++ Optimizing Compiler



## Install vcpkg for curl and json
> In powershell you run the following to install and initialize vcpkg, the package manager that builds and manages native libraries using MSVC.

> additionally it is installed globally and does not sit insde our repo

``` 
cd C:\
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
.\bootstrap-vcpkg.bat

```

> Now connect vcpkg with visual studio 

``` 
.\vcpkg integrate install
```

> install the following libraries 

``` 
.\vcpkg install curl:x64-windows
.\vcpkg install nlohmann-json:x64-windows
```
## Building the executables 
> to build the correct executables you have to again open x64 Native Tools Command Prompt for VS, and navigate to my-server. Make sure the following are ran from the x64 Native Tools Command Prompt for VS

>path should look similar to this 

``` 
cd C:\Path\to\Card-Thing\Card-Thing-copy\my-server
```

## Build newUser.exe
``` 
cl /EHsc /std:c++17 ^
  /I "C:\Program Files\MySQL\MySQL Server 8.0\include" ^
  "C++ Code\newUser.cpp" ^
  /link /LIBPATH:"C:\Program Files\MySQL\MySQL Server 8.0\lib" libmysql.lib ^
  /OUT:"build\newUser.exe"

```

## Build processCard.exe

``` 
cl /EHsc /std:c++17 ^
  /I "C:\Program Files\MySQL\MySQL Server 8.0\include" ^
  /I "C:\vcpkg\installed\x64-windows\include" ^
  "C++ Code\processCard.cpp" ^
  /link /LIBPATH:"C:\Program Files\MySQL\MySQL Server 8.0\lib" ^
        /LIBPATH:"C:\vcpkg\installed\x64-windows\lib" ^
        libmysql.lib libcurl.lib ^
  /OUT:"C++ Code\processCard.exe"

```

## Build priceUpdater.exe

``` 
cl /EHsc /std:c++17 ^
  /I "C:\Program Files\MySQL\MySQL Server 8.0\include" ^
  /I "C:\vcpkg\installed\x64-windows\include" ^
  "C++ Code\priceUpdater.cpp" ^
  /link /LIBPATH:"C:\Program Files\MySQL\MySQL Server 8.0\lib" ^
        /LIBPATH:"C:\vcpkg\installed\x64-windows\lib" ^
        libmysql.lib libcurl.lib ^
  /OUT:"C++ Code\priceUpdater.exe"

```

## Copy the DLLs
>  Each c++ executables will need their its .dll files in the same folder as the .exe

>executable locations:

build\newUser.exe

C++ Code\processCard.exe

C++ Code\priceUpdater.exe


> in powershell got to my-server

``` 
cd path\to\Card-Thing\Card-Thing-copy\my-server
``` 

> and now copy the DLL into both executable folders
``` 
Copy-Item "C:\vcpkg\installed\x64-windows\bin\*.dll" ".\C++ Code\"
Copy-Item "C:\vcpkg\installed\x64-windows\bin\*.dll" ".\build\"

Copy-Item "C:\Program Files\MySQL\MySQL Server 8.0\lib\libmysql.dll" ".\C++ Code\"
Copy-Item "C:\Program Files\MySQL\MySQL Server 8.0\lib\libmysql.dll" ".\build\"

```

## Added on Running C++ executables on node.js (might need to update code)
> On Windows, Node.js does not automatically find .exe files when running c++ programs For every c++ program in server.js 
> we must call their full path and manually include the .exe

> NOTE: Do not modify any execFile calls that invoke Python.

## Step 1

> Define executable paths which are commented under _dirname

``` 
const newUserPath = path.join(__dirname, "build", "newUser.exe");
const processCardPath = path.join(__dirname, "C++ Code", "processCard.exe");
const priceUpdaterPath = path.join(__dirname, "C++ Code", "priceUpdater.exe");
```

## Step 2 
> change existing execFile calls

### Signup (for new users)

>before

```
execFile("./my-server/build/newUser", [username, email, hashedPassword], ...)
``` 

>after

```
execFile(newUserPath, [username, email, hashedPassword], (error, stdout, stderr)...)
``` 
### process card

>before
```
execFile(
  path.join(__dirname, "C++ Code", "processCard"),
  [jsonPath, catalogID.toString()],
  (cppErr, cppOut, cppErrOut) => {
    ...
  }
);
```
> After 

```
execFile(
  processCardPath,
  [jsonPath, catalogID.toString()],
  (cppErr, cppOut, cppErrOut) => {
    ...
  }
);

```
> In total you need to edit 4 execFile, but not the python 


## Run the Backend 

> In PowerShell, navigate to the backend server directory at my-server and start the server 
``` 
cd path\to\Card-Thing\my-server
node server.js

```

> If it is running correctly you should see 

``` 
Server running on http://localhost:3001
Connected to MySQL database

```
> If you get an error refer back to the DatabaseConnection.md

## Run the frontend 

``` 
cd path\to\Card-Thing\my-client
npm install
npm run dev

```

## Additional notes 
> For Node and python run them in normal powershell, additionally below is a picture of what the C++ Code directory may look like 

``` 
C++ Code/
├─ newUser.cpp
├─ processCard.cpp
├─ priceUpdater.cpp
│
├─ newUser.exe
├─ processCard.exe
├─ priceUpdater.exe
│
├─ libmysql.dll
├─ libcurl.dll
├─ libssl-3-x64.dll
├─ libcrypto-3-x64.dll
└- (other curl / OpenSSL DLLs)
 
```