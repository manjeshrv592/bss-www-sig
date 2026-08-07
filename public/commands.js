/* global Office */

Office.onReady(function (info) {
  console.log("=== commands.js loaded ===");
  console.log("Host:", info.host, "Platform:", info.platform);
});

var API_BASE = "https://bss-www-sig.vercel.app";
if (typeof self !== "undefined" && self.location && self.location.origin) {
  API_BASE = self.location.origin;
}
var API_URL = API_BASE + "/api/signature";

var SKIP_AUTH = false;

/**
 * Try to get the Office SSO token, which names the person signed in to Outlook.
 * A shared mailbox has sign-in blocked and can never produce one, so a token is
 * always a real human — that is how we tell shared-mailbox senders apart.
 *
 * Auto-insert runs on a launch event where interactive prompts aren't allowed,
 * so `allowPrompt` is false there. Never rejects: no token simply means we may
 * have to fall back to manual selection.
 */
function getSsoToken(allowPrompt, callback) {
  if (SKIP_AUTH || !Office.auth || !Office.auth.getAccessToken) {
    callback(null);
    return;
  }

  try {
    Office.auth
      .getAccessToken({
        allowSignInPrompt: !!allowPrompt,
        allowConsentPrompt: !!allowPrompt,
      })
      .then(function (token) {
        callback(token || null);
      })
      .catch(function (err) {
        console.log("SSO unavailable:", err && err.code, err && err.message);
        callback(null);
      });
  } catch (e) {
    console.log("SSO threw:", e);
    callback(null);
  }
}

/**
 * callback(err, html, meta)
 * meta.needsSelection === true when the sender is a shared mailbox we couldn't
 * identify — the caller must not guess a signature in that case.
 */
function fetchSignatureHtml(email, token, callback) {
  var url = API_URL + "?email=" + encodeURIComponent(email);

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "text/html");
  if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;

    if (xhr.status === 200) {
      callback(null, xhr.responseText, { needsSelection: false });
      return;
    }

    if (xhr.status === 409) {
      var payload = {};
      try { payload = JSON.parse(xhr.responseText); } catch (e) { /* ignore */ }
      callback(null, null, { needsSelection: true, sharedMailbox: payload.sharedMailbox });
      return;
    }

    callback(new Error("Signature API returned status " + xhr.status));
  };

  xhr.onerror = function () {
    callback(new Error("Network error calling signature API"));
  };

  xhr.send();
}

function notify(item, key, message) {
  item.notificationMessages.addAsync(key, {
    type: "informationalMessage",
    message: message,
    icon: "icon16",
    persistent: false,
  });
}

function notifyError(item, key, message) {
  item.notificationMessages.addAsync(key, {
    type: "errorMessage",
    message: message,
    persistent: false,
  });
}

function insertSignatureLogic(event, isAuto) {
  var item = Office.context.mailbox.item;

  item.from.getAsync(function (result) {
    var email;
    if (
      result.status === Office.AsyncResultStatus.Succeeded &&
      result.value &&
      result.value.emailAddress
    ) {
      email = result.value.emailAddress;
      console.log("Sending from:", email);
    } else {
      email = Office.context.mailbox.userProfile.emailAddress;
      console.log("Sending from (userProfile fallback):", email);
    }

    // Interactive prompts are only allowed off a launch event.
    getSsoToken(!isAuto, function (token) {
      continueWithEmail(email, token, item, event, isAuto);
    });
  });
}

function continueWithEmail(userEmail, token, item, event, isAuto) {
  var cleanEmail = String(userEmail || "").trim().toLowerCase();

  if (!cleanEmail) {
    console.error("No email address found");
    if (!isAuto) {
      notifyError(
        item,
        "sigError",
        "Could not determine your email address. Please open the taskpane first."
      );
    }
    if (event) event.completed();
    return;
  }

  // The API now requires a verified SSO token — it is both the credential and
  // the only way to identify who is sending from a shared mailbox. Auto-insert
  // can't prompt, so consent has to be granted once from the taskpane.
  if (!token) {
    console.log("No SSO token available");
    if (!isAuto) {
      notify(
        item,
        "sigAuth",
        "BSS Signature needs permission once. Click BSS Signature to grant it."
      );
    }
    if (event) event.completed();
    return;
  }

  fetchSignatureHtml(cleanEmail, token, function (err, html, meta) {
    if (err) {
      console.error("Signature fetch error:", err.message);
      if (!isAuto) {
        notifyError(item, "sigError", "Failed to load signature: " + (err.message || "Unknown error"));
      }
      if (event) event.completed();
      return;
    }

    // Shared mailbox we couldn't attribute to a person. Inserting anything here
    // would risk sending someone else's signature, so we always defer to the
    // taskpane picker instead of guessing.
    if (meta && meta.needsSelection) {
      console.log("Shared mailbox needs manual sender selection:", meta.sharedMailbox);
      notify(
        item,
        "sigPick",
        "Couldn't tell who is sending from " +
          (meta.sharedMailbox || "this shared mailbox") +
          ". Click BSS Signature to choose."
      );
      if (event) event.completed();
      return;
    }

    setSignature(html, item, event);
  });
}

/**
 * Office caps setSignatureAsync's `data` at 30,000 characters and classic
 * Outlook throws Sys.ArgumentOutOfRangeException past it rather than failing
 * through the callback. A signature carrying base64 images runs well over.
 */
var SIGNATURE_MAX_CHARS = 30000;

/**
 * Must match SIGNATURE_MARKER in taskpane.js. Whatever we insert here is what
 * the picker has to find and replace when someone corrects the sender, and it
 * carries both id and class because Outlook rewrites one or the other on its
 * way into the message.
 */
var SIGNATURE_MARKER = "bss-signature-block";

/**
 * Append the signature by rewriting the body, for signatures too large for
 * setSignatureAsync.
 *
 * This is string surgery rather than DOM work on purpose: classic Outlook runs
 * commands.js in a JavaScript-only runtime with no document, so DOMParser --
 * which the taskpane uses for the same job -- does not exist here.
 */
function appendToBody(item, wrapped, options, done) {
  item.body.getAsync(Office.CoercionType.Html, function (result) {
    if (result.status !== Office.AsyncResultStatus.Succeeded) {
      done(result);
      return;
    }

    var body = result.value || "";
    // Replacing via a function, not a "$&" pattern: the signature is arbitrary
    // HTML and a stray $ in it would otherwise be read as a substitution.
    var merged = /<\/body\s*>/i.test(body)
      ? body.replace(/<\/body\s*>/i, function (close) {
          return wrapped + close;
        })
      : body + wrapped;

    item.body.setAsync(merged, options, done);
  });
}

function setSignature(html, item, event) {
  var wrapped =
    '<div id="' + SIGNATURE_MARKER + '" class="' + SIGNATURE_MARKER + '">' +
    html +
    "</div>";
  var options = { coercionType: Office.CoercionType.Html };

  var done = function (result) {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      console.log("Signature set successfully");
    } else {
      console.error("Signature insert error:", result.error && result.error.message);
    }
    if (event) event.completed();
  };

  // setSignatureAsync is the right call here -- it targets the signature area
  // and needs no cursor -- so use it whenever the signature fits.
  if (wrapped.length <= SIGNATURE_MAX_CHARS) {
    try {
      item.body.setSignatureAsync(wrapped, options, done);
      return;
    } catch (e) {
      console.log("setSignatureAsync threw, writing the body instead:", e);
    }
  }

  // Past the cap, write the body ourselves. Not setSelectedDataAsync: this runs
  // from a launch event, which has no compose focus and so no cursor to insert
  // at, and it fails there silently.
  appendToBody(item, wrapped, options, done);
}

function autoInsertSignature(event) {
  console.log("=== autoInsertSignature triggered ===");
  insertSignatureLogic(event, true);
}

Office.actions.associate("autoInsertSignature", autoInsertSignature);
