/* global Office */

let cachedSignatureHtml = null;

// Derive API base from the current page origin
const API_URL = window.location.origin + "/api/signature";

Office.onReady(function (info) {
  console.log("=== Office.onReady ===");
  console.log("Host:", info.host);
  console.log("Platform:", info.platform);

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

function hidePicker() {
  document.getElementById("pickerSection").style.display = "none";
  document.getElementById("pickerList").innerHTML = "";
}

var SKIP_AUTH = false;

/** Office's documented ceiling for the `data` argument of setSignatureAsync. */
var SIGNATURE_MAX_CHARS = 30000;

/**
 * Read the sending address off the compose item. For a shared mailbox this is
 * the same for everyone, so on its own it can't identify the sender.
 */
function getFromAddress() {
  return new Promise(function (resolve) {
    try {
      var item = Office.context.mailbox && Office.context.mailbox.item;
      if (item && item.from && typeof item.from.getAsync === "function") {
        item.from.getAsync(function (result) {
          if (
            result.status === Office.AsyncResultStatus.Succeeded &&
            result.value &&
            result.value.emailAddress
          ) {
            resolve(result.value.emailAddress);
          } else {
            resolve(null);
          }
        });
        return;
      }
    } catch (e) {
      console.log("from.getAsync failed:", e);
    }
    resolve(null);
  });
}

async function fetchSignature(selectedUserId) {
  try {
    setButtonState(false);
    hidePicker();

    var headers = {};
    var token = null;

    // The SSO token identifies the person signed in to Outlook. A shared
    // mailbox has sign-in blocked and can never issue one, so whenever we get a
    // token it names a real human — that's what makes shared mailboxes work.
    if (!SKIP_AUTH) {
      try {
        token = await Office.auth.getAccessToken({
          allowSignInPrompt: true,
          allowConsentPrompt: true,
        });
        headers["Authorization"] = "Bearer " + token;
        console.log("SSO token obtained");
      } catch (ssoErr) {
        console.error("SSO Error:", ssoErr.code, ssoErr.message);
        if (ssoErr.code === 13001) {
          throw new Error("User not signed into Office. Please sign in with your Microsoft work account.");
        } else if (ssoErr.code === 13002) {
          throw new Error("User cancelled sign-in. Please try again.");
        } else if (ssoErr.code === 13003) {
          throw new Error("Office is not connected. Please ensure you're signed in to Office.");
        } else if (ssoErr.code === 13005 || ssoErr.code === 13007) {
          throw new Error("SSO not supported in this Office version. Please update Office.");
        } else if (ssoErr.code === 13008) {
          throw new Error("Admin consent required. Contact your administrator.");
        } else if (ssoErr.code === 13012) {
          throw new Error("Office API not supported. Please use a newer version of Office.");
        } else {
          throw new Error("Sign-in failed (" + ssoErr.code + "): " + ssoErr.message);
        }
      }
    }

    // Sending address. Falls back to userProfile, which in a delegated mailbox
    // may report the mailbox owner rather than the signed-in person — fine,
    // because the token above is what actually decides identity.
    var fromEmail = await getFromAddress();
    if (!fromEmail && Office.context.mailbox && Office.context.mailbox.userProfile) {
      fromEmail = Office.context.mailbox.userProfile.emailAddress;
    }

    if (!fromEmail) {
      throw new Error("Could not determine the sending address. Please ensure you're signed into Office with your work account.");
    }

    var url = API_URL + "?email=" + encodeURIComponent(fromEmail);
    if (selectedUserId) url += "&as=" + encodeURIComponent(selectedUserId);

    var response = await fetch(url, { headers: headers });

    // 409 = shared mailbox, sender not identifiable. Ask who they are.
    if (response.status === 409) {
      var picker = await response.json();
      renderPicker(picker);
      return;
    }

    if (!response.ok) {
      var errData;
      try { errData = await response.json(); } catch (e) { errData = {}; }
      throw new Error(errData.error || "Server returned " + response.status);
    }

    cachedSignatureHtml = await response.text();
    var appliedFor = response.headers.get("X-Signature-User") || fromEmail;
    var viaShared = response.headers.get("X-Signature-Via-Shared-Mailbox") === "true";

    hidePicker();
    setButtonState(true);

    // Once we know whose signature it is there is nothing left to decide, so
    // apply it and get out of the way. The Apply button stays for re-applying
    // after an edit, in hosts that leave the pane open.
    applySignature(
      viaShared
        ? "Signature applied for " + appliedFor + " (sending from " + fromEmail + ")"
        : "Signature applied for " + appliedFor
    );
  } catch (err) {
    console.error("Fetch signature error:", err);
    setStatus("error", err.message || "Unknown error occurred");
    setButtonState(false);
  }
}

function renderPicker(payload) {
  var section = document.getElementById("pickerSection");
  var header = document.getElementById("pickerHeader");
  var list = document.getElementById("pickerList");

  var candidates = payload.candidates || [];
  list.innerHTML = "";

  if (candidates.length === 0) {
    header.textContent =
      payload.sharedMailbox +
      " is a shared mailbox, but no members have been configured. Ask an admin to add them in Shared Mailboxes.";
    section.style.display = "block";
    setStatus("error", "No signature available for this shared mailbox.");
    return;
  }

  header.textContent =
    "Sending from the shared mailbox " +
    payload.sharedMailbox +
    ". Select who you are to apply the right signature.";

  candidates.forEach(function (c) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-item";

    var nameEl = document.createElement("span");
    nameEl.textContent = c.name;
    btn.appendChild(nameEl);

    var emailEl = document.createElement("span");
    emailEl.className = "email";
    emailEl.textContent = c.email;
    btn.appendChild(emailEl);

    btn.onclick = function () {
      setStatus("loading", "Loading signature for " + c.name + "...");
      fetchSignature(c.id);
    };
    list.appendChild(btn);
  });

  section.style.display = "block";
  setStatus("loading", "Select who is sending.");
}

/**
 * Ask Outlook to put the signature in the message.
 *
 * setSignatureAsync is the right call — it fills the signature area without
 * moving the cursor — but Office caps its `data` at 30,000 characters and
 * classic Outlook throws Sys.ArgumentOutOfRangeException past that rather than
 * failing through the callback. Signatures carrying base64 images run several
 * times larger, so above the cap we insert at the cursor instead, which allows
 * a megabyte. On a fresh compose that lands in the same place.
 */
function insertHtml(html, callback) {
  var body = Office.context.mailbox.item.body;
  var options = { coercionType: Office.CoercionType.Html };

  if (html.length <= SIGNATURE_MAX_CHARS) {
    try {
      body.setSignatureAsync(html, options, callback);
      return;
    } catch (e) {
      console.log("setSignatureAsync threw, falling back to cursor insert:", e);
    }
  }

  body.setSelectedDataAsync(html, options, callback);
}

/**
 * Outlook only lets an add-in close its own pane where Office.addin is
 * available; elsewhere this is a no-op and the success message stands in.
 */
function closePane() {
  try {
    if (Office.addin && typeof Office.addin.hide === "function") {
      var result = Office.addin.hide();
      if (result && typeof result.catch === "function") {
        result.catch(function (e) {
          console.log("Taskpane close rejected:", e);
        });
      }
    }
  } catch (e) {
    console.log("Taskpane close unsupported here:", e);
  }
}

function applySignature(successMessage) {
  if (!cachedSignatureHtml) {
    setStatus("error", "No signature loaded. Click Refresh first.");
    return;
  }

  setStatus("loading", "Applying signature...");
  setButtonState(false);

  insertHtml(cachedSignatureHtml, function (asyncResult) {
    setButtonState(true);

    if (asyncResult.status !== Office.AsyncResultStatus.Succeeded) {
      console.error("Signature insert error:", asyncResult.error);
      setStatus("error", "Failed to apply: " + asyncResult.error.message);
      return;
    }

    setStatus("success", successMessage || "Signature applied successfully!");
    closePane();
  });
}

function refreshSignature() {
  cachedSignatureHtml = null;
  hidePicker();
  setStatus("loading", "Refreshing signature...");
  fetchSignature();
}
