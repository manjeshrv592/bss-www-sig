/* global Office */

let cachedSignatureHtml = null;

// Derive API base from the current page origin
const API_URL = window.location.origin + "/api/signature";

Office.onReady(function (info) {
  console.log("=== Office.onReady ===");
  console.log("Host:", info.host);
  console.log("Platform:", info.platform);
  
  if (info.host === Office.HostType.Outlook) {
    // Log available context info for debugging
    console.log("Mailbox:", Office.context.mailbox);
    console.log("UserProfile:", Office.context.mailbox?.userProfile);
    console.log("Email:", Office.context.mailbox?.userProfile?.emailAddress);
    console.log("Item:", Office.context.mailbox?.item);
    
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

// Helper to decode JWT and extract email
function getEmailFromToken(token) {
  try {
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.preferred_username || payload.upn || payload.email || null;
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
}

async function fetchSignature() {
  try {
    setButtonState(false);

    var email = null;
    var headers = {};
    var token = null;
    
    // Step 1: Try to get SSO token first (this also authenticates the user)
    if (!SKIP_AUTH) {
      try {
        token = await Office.auth.getAccessToken({ allowSignInPrompt: true, allowConsentPrompt: true });
        headers["Authorization"] = "Bearer " + token;
        console.log("SSO token obtained successfully");
        
        // Try to extract email from token
        var tokenEmail = getEmailFromToken(token);
        if (tokenEmail) {
          email = tokenEmail;
          console.log("Email from SSO token:", email);
        }
      } catch (ssoErr) {
        console.error("SSO Error:", ssoErr.code, ssoErr.message);
        // Handle specific SSO error codes
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
    
    // Step 2: If no email from token, try userProfile
    if (!email && Office.context.mailbox && Office.context.mailbox.userProfile) {
      email = Office.context.mailbox.userProfile.emailAddress;
      console.log("Email from userProfile:", email);
    }
    
    // Step 3: If still no email, try item.from (compose mode)
    if (!email && Office.context.mailbox && Office.context.mailbox.item) {
      try {
        var item = Office.context.mailbox.item;
        if (item.from && typeof item.from.getAsync === 'function') {
          email = await new Promise(function(resolve) {
            item.from.getAsync(function(result) {
              if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
                resolve(result.value.emailAddress);
              } else {
                resolve(null);
              }
            });
          });
          console.log("Email from item.from:", email);
        }
      } catch (e) {
        console.log("Error getting from:", e);
      }
    }
    
    if (!email) {
      console.error("No email found. Context:", {
        mailbox: !!Office.context.mailbox,
        userProfile: !!Office.context.mailbox?.userProfile,
        item: !!Office.context.mailbox?.item,
        tokenObtained: !!token
      });
      throw new Error("Could not determine your email address. Please ensure you're signed into Office with your work account.");
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
    setStatus("error", err.message || "Unknown error occurred");
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
