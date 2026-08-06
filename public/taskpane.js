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

    document.getElementById("previewBody").innerHTML = cachedSignatureHtml;
    document.getElementById("previewSection").style.display = "block";

    setButtonState(true);

    // One click on the ribbon should end with the signature in the message.
    // The Apply button stays for re-applying after an edit.
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

function applySignature(successMessage) {
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
        setStatus("success", successMessage || "Signature applied successfully!");
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
  hidePicker();
  setStatus("loading", "Refreshing signature...");
  fetchSignature();
}
