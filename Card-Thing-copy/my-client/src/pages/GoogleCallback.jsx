import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleCallback() 
{
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const userID = params.get("userID"); //get the user info
    const username = params.get("username");

    if (userID && username) 
    {
      localStorage.setItem("username", username);
      localStorage.setItem("userID", userID); //storing user info just as normal logins
      navigate("/dashboard");
    }
  }, []);

  return <p>Authenticating...</p>;
}

/*
this was a process to set up
go to your google cloud console
create a new project
you need to go set up google oauth consent screen
then
go to credentials, create oauth client id
make sure its a web application
then  
for redirect urls (not javascript origins)
set the authorized redirect uris to http://localhost:3000/auth/google/callback
then use the client id and secret and put it in the server variables
*/