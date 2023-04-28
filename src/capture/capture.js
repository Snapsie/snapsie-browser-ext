var captureParams = {
  x: null,
  y: null,
  width: null,
  height: null,
};

var tabId = null;
var capturing = false;

var capturedUrl = "";
var userId = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("Tab is ready... tell me next");
  const renderScreenshotListener = async (message, sender, sendResponse) => {
    console.log("Render Screenshot Listener: " + message.type);
    if (message.type !== "RENDER_SCREENSHOT") return;

    capturedUrl = message.captureUrl;
    userId = message.userId;

    console.log("Captured URL: " + capturedUrl);

    const img_div = document.getElementById("screenshot_img");
    tabId = message.tabId;
    img_div.src = message.image_buffer;
    img_div.style.visibility = "visible";

    img_div.onload = () => {
      setCanvasSize(img_div);
    };
    chrome.runtime.onMessage.removeListener(renderScreenshotListener);
    await chrome.tabs.update(tabId, { active: true });
  };

  chrome.runtime.onMessage.addListener(renderScreenshotListener);

  // Add the MouseMove Listener
  addMouseEventHandlers();

  console.log("Ready Listener added");
});

function setCanvasSize(img_div) {
  const canvas_div = document.getElementById("screenshot_canvas");
  canvas_div.width = img_div.width;
  canvas_div.height = img_div.height;
  var ctx = canvas_div.getContext("2d");
  ctx.clearRect(0, 0, canvas_div.width, canvas_div.height);
}

function mouseMove(e) {
  const x = e.clientX;
  const y = e.clientY;
  if (capturing == true) {
    updateCaptureParams(e);
    drawRectOnCanvas(
      captureParams.x,
      captureParams.y,
      captureParams.width,
      captureParams.height
    );
  } else {
    // // Find the element at the given position and highlight it.
    // chrome.runtime.sendMessage(
    //   tabId,
    //   { type: "findElementPosition", x, y },
    //   function (response, sender) {
    //     // console.log("Response: " + response + " Sender: " + sender.tab.url);
    //     elementFoundMessageReceived(response);
    //   }
    // );
  }
}
tabId;

function addMouseEventHandlers() {
  document.body.addEventListener("mouseup", mouseUp);
  document.body.addEventListener("mousedown", mouseDown);
  document.body.addEventListener("mousemove", mouseMove);
}

function mouseDown(e) {
  const x = e.clientX;
  const y = e.clientY;
  resetCaptureParams(captureParams);
  capturing = true;
}

function mouseUp(e) {
  capturing = false;
  updateCaptureParams(e);
  drawRectOnCanvas(
    captureParams.x,
    captureParams.y,
    captureParams.width,
    captureParams.height
  );
  saveImage(
    captureParams.x,
    captureParams.y,
    captureParams.width,
    captureParams.height,
    "SUPABASE"
  );
}

function updateCaptureParams(e) {
  const x = e.clientX;
  const y = e.clientY;
  if (capturing == false) return;
  if (captureParams.x == null) {
    captureParams.x = x;
    captureParams.y = y;
  } else {
    captureParams.x = x < captureParams.x ? x : captureParams.x;
    captureParams.y = y < captureParams.y ? y : captureParams.y;
    captureParams.width = Math.abs(x - captureParams.x);
    captureParams.height = Math.abs(y - captureParams.y);
  }
}

function elementFoundMessageReceived(message) {
  if (!message) return;
  drawRectOnCanvas(message.x, message.y, message.width, message.height);
}

function drawRectOnCanvas(x, y, width, height) {
  const canvas_div = document.getElementById("screenshot_canvas");
  var ctx = canvas_div.getContext("2d");
  ctx.clearRect(0, 0, canvas_div.width, canvas_div.height);
  ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
  ctx.strokeRect(x, y, width, height);
}

function resetCaptureParams(captureParams) {
  captureParams.x = null;
  captureParams.y = null;
  captureParams.width = null;
  captureParams.height = null;
}

function saveImage(x, y, width, height, storage_provider) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = document.getElementById("screenshot_img");
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  canvas.toBlob((blob) => {
    console.log("Sending message to save file");

    if (storage_provider == "LOCAL_FILE") {
      saveImageToFile(blob);
      return;
    }

    chrome.runtime.sendMessage({
      action: "SAVE_IMAGE_TO_STORAGE_PROVIDER",
      value: {
        blob: blob,
        base64rep: canvas.toDataURL("image/png"),
        tabId: tabId,
        captureUrl: capturedUrl,
        userId: userId,
        storageProvider: storage_provider,
      },
    });
  }, "image/png");
}

function saveImageToFile(blob) {
  const url = URL.createObjectURL(blob);
  console.log(url);
  chrome.downloads.download({
    url,
    filename: "captured-image.png",
    saveAs: true,
  });
}
