import browser from "webextension-polyfill";
import supabase from "./src/supabase_client";
import * as uuid from "uuid";
import { decode } from "base64-arraybuffer";

const BASE_URL = "http://localhost:3000/";
const BUCKET_NAME = "screenshots";

// @ts-ignore
browser.runtime.onMessage.addListener((msg, sender, response) => {
  handleMessage(msg, response);
  return true;
});

type Message =
  | {
      action: "TAKE_SCREENSHOT";
      value: null;
    }
  | {
      action: "SAVE_IMAGE_TO_STORAGE_PROVIDER";
      value: {
        blob: string;
        base64rep: string;
        tabId: number;
        captureUrl: string;
        userId: string;
        storageProvider: string;
      };
    };

type ResponseCallback = (data: any) => void;

async function handleMessage(
  { action, value }: Message,
  response: ResponseCallback
) {
  switch (action) {
    case "TAKE_SCREENSHOT":
      {
        const currentActiveSession = await (await fetchActiveSession()).json();
        console.log(currentActiveSession);
        if (!currentActiveSession) {
          console.log("Invalid Session");
          return;
        }
        initiateTakeScreenshot(currentActiveSession);
      }
      break;
    case "SAVE_IMAGE_TO_STORAGE_PROVIDER":
      {
        console.log("Received message to storage provider");
        const { blob, base64rep, tabId, captureUrl, userId, storageProvider } =
          value;
        await saveImage(
          blob,
          base64rep,
          userId,
          tabId,
          captureUrl,
          storageProvider
        );
      }
      break;
    default:
      break;
  }
}

export const redirectToSignIn = async () => {
  let tab = await chrome.tabs.create({
    url: `${BASE_URL}/signin`,
  });

  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (tabId === tab.id) {
      console.log("Tab closed");
    }

    const activeSession = await fetchActiveSession();
    chrome.runtime.sendMessage({
      type: "AUTH_RESPONSE",
      payload: {
        activeSession,
      },
    });

    chrome.tabs.onRemoved.removeListener(() => {});
  });
};

export const fetchActiveSession = async () => {
  const session = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return session;
};

function initiateTakeScreenshot(session) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // `tabs` is an array of tabs that match the query
    const activeTab = tabs[0];
    console.log(activeTab.url);
    TakeScreenshot(activeTab, function (buffer) {
      console.log("Screenshot taken successfully: ", buffer);
      CreateCaptureTab(
        activeTab,
        chrome.runtime.getURL("src/capture/capture.html"),
        buffer,
        session.userId
      ).then((tabId) => {
        console.log("Successfully created a new tab");
      });
    });
  });
}

async function CreateCaptureTab(activeTab, url, buffer, userId) {
  let tabCreated = false;
  const tab = await chrome.tabs.create({ url: url, active: false });

  // Wait for the tab to finish loading
  await new Promise<void>((resolve) => {
    console.log("Waiting for Tab to finish loading");
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        // console.log("Executing element_position.js");
        // chrome.tabs.executeScript(activeTab.id, {
        //   file: "/src/element_position.js",
        // });
        chrome.tabs.onUpdated.removeListener(listener);

        console.log("Sending message to the tab");
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "RENDER_SCREENSHOT",
            image_buffer: buffer,
            tabId: tabId,
            captureUrl: activeTab.url,
            userId: userId,
          },
          null
        );

        resolve();
      }
    });
  });

  return tab.id;
}

async function TakeScreenshot(activeTab, resolveFunc) {
  chrome.tabs.captureVisibleTab(
    activeTab.windowId,
    { format: "png" },
    resolveFunc
  );
}

async function saveImage(
  blob,
  base64rep,
  userId,
  tabId,
  captureUrl,
  storage_provider
) {
  console.log(storage_provider);
  switch (storage_provider) {
    case "LOCAL_FILE":
      saveImageToFile(blob);
      break;
    case "FILESTACK":
      console.log("Error, Filestack support not implemented");
      break;
    case "SUPABASE":
      await saveImageToSupabase(blob, base64rep, userId, captureUrl, tabId);
      break;
    default:
      console.error("Invalid storage provider selected");
  }
}

async function saveImageToSupabase(blob, base64rep, userId, captureUrl, tabId) {
  const folderName = userId;
  const imageBytes = base64rep.split(",")[1];
  console.log("Uploading file to Supabase");
  const supabaseFilename = folderName + "/" + uuid.v4();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(supabaseFilename, decode(imageBytes), {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  // get the URL of the uploaded file
  const storageUrlResponse = await supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(supabaseFilename);

  await uploadToSnapsie(
    supabaseFilename,
    storageUrlResponse.data.publicUrl,
    captureUrl,
    tabId
  );
}

async function uploadToSnapsie(filename, imageUrl, captureUrl, tabId) {
  console.log("Uploading to Snapsie");
  const hostname = "God knows what";
  const url = BASE_URL + "/api/screenshots";
  const rawResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      screenshot_filename: filename,
      capture_url: captureUrl,
      screenshot_url: imageUrl,
      hostname: hostname,
    }),
  });

  console.log("Finished uploading to Snapsie");

  const response = await rawResponse.json();
  console.log(response);
  await chrome.tabs.update(tabId, { url: response.url });
}

// ---------------------------------------------------------------------------------------------------------------------------------
async function bucketExists(bucketName) {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);

    if (error || data === null) {
      return false;
    }

    console.log(`Bucket ${bucketName} exists!`);
    return true;
  } catch (error) {
    if (error.status === 404) {
      console.log(`Bucket ${bucketName} does not exist!`);
      return false;
    } else {
      console.error(error.message);
      return false;
    }
  }
}

async function createNewBucket(bucketName) {
  console.log("Creating a new bucket");
  try {
    const bucket = await supabase.storage.createBucket(bucketName);
    console.log(`Bucket ${bucketName} created!`);
    return true;
  } catch (error) {
    console.log("--------------------------");
    console.error(error.message);
    return false;
  }
}

// function saveImageToFilestack(blob) {
//   const file = new File([blob], "tmp1.png", { type: "image/png" });
//   // Upload the file to Filestack
//   filestackClient
//     .upload(file)
//     .then((response) => {
//       console.log("Filestack response:", response);
//       // The uploaded filepageURL is in response.url
//       uploadToSnapsie(response.url, capturedUrl);
//     })
//     .catch((error) => {
//       console.error("Filestack error:", error);
//     });
// }
