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

var API_BASE = "https://bss-www-sig.vercel.app";
if (typeof self !== "undefined" && self.location && self.location.origin) {
  API_BASE = self.location.origin;
}
var API_URL = API_BASE + "/api/signature";

var SKIP_AUTH = false;

function fetchSignatureHtml(email, allowPrompt, isAutoInsert, callback) {
  var url = API_URL + "?email=" + encodeURIComponent(email) + "&trusted=office";

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "text/html");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        callback(null, xhr.responseText);
      } else {
        callback(new Error("Signature API returned status " + xhr.status));
      }
    }
  };

  xhr.onerror = function () {
    callback(new Error("Network error calling signature API"));
  };

  xhr.send();
}

function insertSignatureLogic(event, isAuto) {
  var item = Office.context.mailbox.item;

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
  });
}

function continueWithEmail(userEmail, item, event, isAuto) {
  var cleanEmail = String(userEmail || "").trim().toLowerCase();
  console.log("Using email:", cleanEmail);

  if (!cleanEmail) {
    console.error("No email address found");
    if (!isAuto) {
      item.notificationMessages.addAsync("sigError", {
        type: "errorMessage",
        message: "Could not determine your email address. Please open the taskpane first.",
        persistent: false
      });
    }
    if (event) event.completed();
    return;
  }

  fetchSignatureHtml(cleanEmail, !isAuto, isAuto, function (err, html) {
    if (err) {
      console.error("Signature fetch error:", err.message);
      if (!isAuto) {
        item.notificationMessages.addAsync("sigError", {
          type: "errorMessage",
          message: "Failed to load signature: " + (err.message || "Unknown error"),
          persistent: false
        });
      }
      if (event) event.completed();
      return;
    }

    if (isAuto) {
      item.body.getAsync(Office.CoercionType.Html, function (bodyResult) {
        if (
          bodyResult.status === Office.AsyncResultStatus.Succeeded &&
          bodyResult.value &&
          bodyResult.value.indexOf("bss-signature") !== -1
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

function insertSignature(event) {
  console.log("=== insertSignature clicked ===");
  insertSignatureLogic(event, false);
}

function autoInsertSignature(event) {
  console.log("=== autoInsertSignature triggered ===");
  insertSignatureLogic(event, true);
}

Office.actions.associate("insertSignature", insertSignature);
Office.actions.associate("autoInsertSignature", autoInsertSignature);
