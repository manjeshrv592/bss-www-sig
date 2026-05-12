/* global Office */

var API_URL = window.location.origin + "/api/signature";

Office.onReady(function () {
  // Commands are ready
});

// Resolve sender email: try item.from first, fall back to userProfile
function getSenderEmail(callback) {
  try {
    Office.context.mailbox.item.from.getAsync(function (result) {
      if (result.status === Office.AsyncResultStatus.Succeeded && result.value && result.value.emailAddress) {
        callback(result.value.emailAddress);
      } else {
        callback(Office.context.mailbox.userProfile.emailAddress);
      }
    });
  } catch (e) {
    callback(Office.context.mailbox.userProfile.emailAddress);
  }
}

// Core logic: fetch signature and apply via setSignatureAsync (no cursor jump)
function applySignatureLogic(event, isAuto) {
  getSenderEmail(function (email) {
    var cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) {
      console.error("No email address found");
      if (event) event.completed();
      return;
    }

    Office.auth.getAccessToken({ allowSignInPrompt: !isAuto })
      .then(function (token) {
        return fetch(API_URL + "?email=" + encodeURIComponent(cleanEmail), {
          headers: { "Authorization": "Bearer " + token }
        });
      })
      .then(function (response) {
        if (!response.ok) throw new Error("Server returned " + response.status);
        return response.text();
      })
      .then(function (html) {
        if (isAuto) {
          // Skip auto-insert if signature already present
          Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, function (bodyResult) {
            if (
              bodyResult.status === Office.AsyncResultStatus.Succeeded &&
              bodyResult.value &&
              bodyResult.value.includes("bss-signature")
            ) {
              console.log("Signature already present, skipping auto-insertion.");
              if (event) event.completed();
              return;
            }
            setSignature(html, event, isAuto);
          });
        } else {
          setSignature(html, event, isAuto);
        }
      })
      .catch(function (err) {
        console.error("Signature error:", err);
        if (!isAuto) {
          Office.context.mailbox.item.notificationMessages.addAsync("sigError", {
            type: "errorMessage",
            message: "Failed to load signature: " + err.message,
            persistent: false
          });
        }
        if (event) event.completed();
      });
  });
}

function setSignature(html, event, isAuto) {
  Office.context.mailbox.item.body.setSignatureAsync(
    html,
    { coercionType: Office.CoercionType.Html },
    function (asyncResult) {
      if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
        if (!isAuto) {
          Office.context.mailbox.item.notificationMessages.addAsync("sigSuccess", {
            type: "informationalMessage",
            message: "Signature applied successfully!",
            persistent: false
          });
        }
      } else {
        console.error("setSignatureAsync error:", asyncResult.error);
        if (!isAuto) {
          Office.context.mailbox.item.notificationMessages.addAsync("sigError", {
            type: "errorMessage",
            message: "Failed to apply signature: " + asyncResult.error.message,
            persistent: false
          });
        }
      }
      if (event) event.completed();
    }
  );
}

/**
 * Ribbon command: "Refresh Signature"
 */
function refreshSignature(event) {
  applySignatureLogic(event, false);
}

/**
 * LaunchEvent: auto-fires on OnNewMessageCompose
 */
function autoInsertSignature(event) {
  applySignatureLogic(event, true);
}

// Register functions with Office
Office.actions.associate("refreshSignature", refreshSignature);
Office.actions.associate("autoInsertSignature", autoInsertSignature);
