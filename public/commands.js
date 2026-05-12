/* global Office */

Office.onReady(function (info) {
  console.log("=== commands.js loaded ===");
  console.log("Host:", info.host);
  console.log("Platform:", info.platform);
  if (Office.context.requirements.isSetSupported("Mailbox", "1.10")) {
    console.log("Mailbox 1.10 supported - event-based activation OK");
  } else {
    console.log("Mailbox 1.10 NOT supported");
  }
});

var API_URL = window.location.origin + "/api/signature";

// NOTE: Function commands (ribbon ExecuteFunction) CANNOT show sign-in prompts.
// allowSignInPrompt must always be false here. Use the taskpane to sign in first.
function getToken() {
  return Office.auth.getAccessToken({
    allowSignInPrompt: false,
    allowConsentPrompt: false
  });
}

function fetchSignatureHtml(email, token) {
  return fetch(API_URL + "?email=" + encodeURIComponent(email), {
    headers: { "Authorization": "Bearer " + token }
  }).then(function (response) {
    if (!response.ok) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        throw new Error(data.error || "Server returned " + response.status);
      });
    }
    return response.text();
  });
}

function insertSignatureLogic(event, isAuto) {
  var item = Office.context.mailbox.item;

  return new Promise(function (resolve) {
    item.from.getAsync(function (result) {
      var email;
      if (result.status === Office.AsyncResultStatus.Succeeded && result.value && result.value.emailAddress) {
        email = result.value.emailAddress;
        console.log("Email from item.from:", email);
      } else {
        email = Office.context.mailbox.userProfile.emailAddress;
        console.log("Email from userProfile (fallback):", email);
      }
      continueWithEmail(email, item, event, isAuto);
      resolve();
    });
  });
}

function continueWithEmail(userEmail, item, event, isAuto) {
  var cleanEmail = String(userEmail || "").trim().toLowerCase();
  console.log("Using email:", cleanEmail);

  if (!cleanEmail) {
    console.error("No email address found");
    if (event) event.completed();
    return;
  }

  getToken()
    .then(function (token) {
      console.log("SSO token obtained");
      return fetchSignatureHtml(cleanEmail, token);
    })
    .then(function (html) {
      if (isAuto) {
        item.body.getAsync(Office.CoercionType.Html, function (bodyResult) {
          if (
            bodyResult.status === Office.AsyncResultStatus.Succeeded &&
            bodyResult.value &&
            bodyResult.value.includes("bss-signature")
          ) {
            console.log("Signature already present, skipping.");
            if (event) event.completed();
            return;
          }
          setSignature(html, item, event, isAuto);
        });
      } else {
        setSignature(html, item, event, isAuto);
      }
    })
    .catch(function (err) {
      console.error("Signature error. Code:", err.code, "Message:", err.message);
      if (!isAuto) {
        var msg = err.code === 13003 || err.code === 13005 || err.code === 13007 || err.code === 13012
          ? "Sign-in required. Please open the Signature taskpane first to authenticate."
          : "Failed to load signature: " + (err.message || "Unknown error");
        item.notificationMessages.addAsync("sigError", {
          type: "errorMessage",
          message: msg,
          persistent: false
        });
      }
      if (event) event.completed();
    });
}

function setSignature(html, item, event, isAuto) {
  item.body.setSignatureAsync(
    html,
    { coercionType: Office.CoercionType.Html },
    function (result) {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        console.log("Signature set successfully");
        if (!isAuto) {
          item.notificationMessages.addAsync("sigSuccess", {
            type: "informationalMessage",
            message: "Signature applied successfully!",
            persistent: false
          });
        }
      } else {
        console.error("setSignatureAsync error:", result.error.message);
        if (!isAuto) {
          item.notificationMessages.addAsync("sigError", {
            type: "errorMessage",
            message: "Failed to apply signature: " + result.error.message,
            persistent: false
          });
        }
      }
      if (event) event.completed();
    }
  );
}

function refreshSignature(event) {
  console.log("=== refreshSignature clicked ===");
  insertSignatureLogic(event, false);
}

function autoInsertSignature(event) {
  console.log("=== autoInsertSignature triggered ===");
  insertSignatureLogic(event, true);
}

Office.actions.associate("refreshSignature", refreshSignature);
Office.actions.associate("autoInsertSignature", autoInsertSignature);
