import { useEffect, useState } from "react";
import { GitHub, ExternalLink } from "react-feather";

function App() {
  const [authData, setAuthData] = useState();
  const [authorized, setAuthorized] = useState(false);

  const onLogin = async () => {
    if (authorized) return;
    chrome.runtime.sendMessage({
      action: "AUTH_REQUEST",
    });
  };

  const takeScreenshot = async () => {
    console.log("Sending message to take background script from Popup");
    chrome.runtime.sendMessage({
      action: "TAKE_SCREENSHOT",
    });
  };

  // Initially check for authorised state
  useEffect(() => {
    (async () => {
      const activeSession = await fetch("http://localhost:3000/api/auth/me");
      if (activeSession.ok) {
        const sessionResponse = await activeSession.json();
        console.log(sessionResponse.session.user);
        // setAuthSession(session);
        setAuthorized(sessionResponse.authenticated);
        setAuthData(sessionResponse.session.user.email);
      }
    })();
  }, []);

  // Checks whether an access token has just been set
  useEffect(() => {
    const onStorageChanged = (changes) => {
      if (changes.accessToken) {
        const accessToken = changes.accessToken.newValue;
        setAuthorized(Boolean(accessToken));
      }
    };

    chrome.storage.sync.onChanged.addListener(onStorageChanged);

    return () => {
      chrome.storage.sync.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  useEffect(() => {
    const onMessage = ({ type, payload }) => {
      switch (type) {
        case "AUTH_RESPONSE":
          // Containing auth code and uri to display
          setAuthData(payload);
          setAuthorized(true);
          break;
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return (
    <div className="App p-5 min-w-[300px] min-h-[200px] flex flex-col justify-center items-center">
      <h1 className="font-bold text-5xl text-center">Snapsie</h1>
      <button
        type="button"
        className="rounded-lg py-3 px-5 mt-3 bg-teal-800 text-white hover:text-black transition-colors cursor-pointer font-medium hover:border-blue-500 focus:ring"
        onClick={onLogin}
      >
        {authorized ? "Authorised as " + authData : "Authorise Snapsie"}
        <GitHub className="h-6 inline ml-3" />
      </button>
      <button
        type="button"
        className="rounded-lg py-3 px-5 mt-3 bg-teal-800 text-white hover:text-black transition-colors cursor-pointer font-medium hover:border-blue-500 focus:ring"
        onClick={takeScreenshot}
      >
        Take Screenshot
      </button>
    </div>
  );
}

export default App;
