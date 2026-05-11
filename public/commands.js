/* global Office */

var BASE_PATH = "/bss-sig";
var API_URL = window.location.origin + BASE_PATH + "/api/signature";

Office.onReady(function () {
  // Commands are ready
});

/**
 * Ribbon command: "Refresh Signature"
 * Fetches the latest signature from the API and applies it.
 */
function refreshSignature(event) {
  Office.auth.getAccessToken({ allowSignInPrompt: false })
    .then(function (token) {
      var email = Office.context.mailbox.userProfile.emailAddress;
      return fetch(API_URL + "?email=" + encodeURIComponent(email), {
        headers: { "Authorization": "Bearer " + token }
      });
    })
    .then(function (response) {
      if (!response.ok) throw new Error("Server returned " + response.status);
      return response.text();
    })
    .then(function (html) {
      Office.context.mailbox.item.body.setSignatureAsync(
        html,
        { coercionType: Office.CoercionType.Html },
        function (asyncResult) {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.error("setSignatureAsync error:", asyncResult.error);
          }
          event.completed();
        }
      );
    })
    .catch(function (err) {
      console.error("Refresh signature error:", err);
      event.completed();
    });
}

/**
 * LaunchEvent: auto-fires on OnNewMessageCompose
 * Uses setSignatureAsync to set signature zone (no cursor jump).
 */
function autoInsertSignature(event) {
  Office.auth.getAccessToken({ allowSignInPrompt: false })
    .then(function (token) {
      var email = Office.context.mailbox.userProfile.emailAddress;
      return fetch(API_URL + "?email=" + encodeURIComponent(email), {
        headers: { "Authorization": "Bearer " + token }
      });
    })
    .then(function (response) {
      if (!response.ok) throw new Error("Server returned " + response.status);
      return response.text();
    })
    .then(function (html) {
      Office.context.mailbox.item.body.setSignatureAsync(
        html,
        { coercionType: Office.CoercionType.Html },
        function (asyncResult) {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.error("autoInsertSignature setSignatureAsync error:", asyncResult.error);
          }
          event.completed();
        }
      );
    })
    .catch(function (err) {
      console.error("Auto insert signature error:", err);
      event.completed();
    });
}

// Register functions with Office
Office.actions.associate("refreshSignature", refreshSignature);
Office.actions.associate("autoInsertSignature", autoInsertSignature);
