/* global Office */

let cachedSignatureHtml = null;

// Derive API base from the current page origin
const API_URL = window.location.origin + "/api/signature";

Office.onReady(function (info) {
  if (info.host === Office.HostType.Outlook) {
    setStatus("loading", "Fetching your signature...");
    fetchSignature();
  } else {
    setStatus("error", "This add-in only works in Outlook.");
  }
});

function setStatus(type, message) {
  var el = document.getElementById("status");
  el.className = "status " + type;
  el.textContent = message;
}

function setButtonState(enabled) {
  document.getElementById("btnApply").disabled = !enabled;
}

var SKIP_AUTH = false;

async function fetchSignature() {
  try {
    setButtonState(false);

    // Get user email from mailbox
    var email = Office.context.mailbox.userProfile.emailAddress;
    var headers = {};

    if (!SKIP_AUTH) {
      var token = await Office.auth.getAccessToken({ allowSignInPrompt: true });
      headers["Authorization"] = "Bearer " + token;
    }

    var response = await fetch(API_URL + "?email=" + encodeURIComponent(email), {
      headers: headers
    });

    if (!response.ok) {
      var errData;
      try { errData = await response.json(); } catch (e) { errData = {}; }
      throw new Error(errData.error || "Server returned " + response.status);
    }

    cachedSignatureHtml = await response.text();

    // Show preview
    document.getElementById("previewBody").innerHTML = cachedSignatureHtml;
    document.getElementById("previewSection").style.display = "block";

    setStatus("success", "Signature loaded for " + email);
    setButtonState(true);
  } catch (err) {
    console.error("Fetch signature error:", err);
    setStatus("error", "Error: " + err.message);
    setButtonState(false);
  }
}

function applySignature() {
  if (!cachedSignatureHtml) {
    setStatus("error", "No signature loaded. Click Refresh first.");
    return;
  }

  setStatus("loading", "Applying signature...");
  setButtonState(false);

  // Use setSignatureAsync — sets the signature without disturbing cursor position.
  // This is the recommended method for email signatures in compose mode.
  // Available in Mailbox requirement set 1.10+
  Office.context.mailbox.item.body.setSignatureAsync(
    cachedSignatureHtml,
    { coercionType: Office.CoercionType.Html },
    function (asyncResult) {
      if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
        setStatus("success", "Signature applied successfully!");
      } else {
        console.error("setSignatureAsync error:", asyncResult.error);
        setStatus("error", "Failed to apply: " + asyncResult.error.message);
      }
      setButtonState(true);
    }
  );
}

function refreshSignature() {
  cachedSignatureHtml = null;
  document.getElementById("previewSection").style.display = "none";
  setStatus("loading", "Refreshing signature...");
  fetchSignature();
}
