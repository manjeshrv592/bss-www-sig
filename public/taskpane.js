/* global Office */

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

function hidePicker() {
  document.getElementById("pickerSection").style.display = "none";
  document.getElementById("pickerList").innerHTML = "";
}

var SKIP_AUTH = false;

/**
 * Everything we insert is wrapped in an element carrying this as both id and
 * class, so a second visit can find the previous signature and take it out
 * rather than stacking another one underneath.
 *
 * Both, because Outlook rewrites message HTML on the way through: Outlook on
 * the web prefixes ids with "x_" (again on every round trip), and other clients
 * drop id or class outright. Matching on either, by suffix, survives that.
 */
var SIGNATURE_MARKER = "bss-signature-block";

/**
 * Where the quoted thread starts in a reply or forward, or null for a fresh
 * message. Anything from here down belongs to the message being answered.
 *
 * Outlook's own markers are matched first, earliest in the document winning:
 * a long thread quotes earlier replies that carry the same markers ("x_"
 * prefixed by Outlook on the web), and the topmost one is the current reply's.
 * Generic quote markers are a fallback for clients that write none of these.
 */
var QUOTE_MARKERS = [
  '[id$="appendonsend"]',                          // Outlook on the web, new Outlook
  '[id$="mail-editor-reference-message-container"]',
  '[id$="divRplyFwdMsg"]',
  '[id$="OLK_SRC_BODY_SECTION"]',                  // Outlook for Mac
  'a[name="_MailEndCompose"]',                     // classic Outlook
  'div[style*="border-top:solid"][style*="padding:3.0pt"]',
];
var GENERIC_QUOTE_MARKERS = [".gmail_quote", "blockquote"];

function findQuoteBoundary(doc) {
  function earliest(selectors) {
    var best = null;
    selectors.forEach(function (selector) {
      var el = doc.body.querySelector(selector);
      if (!el) return;
      if (!best || best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) {
        best = el;
      }
    });
    return best;
  }

  var boundary = earliest(QUOTE_MARKERS) || earliest(GENERIC_QUOTE_MARKERS);
  if (!boundary) return null;

  // Outlook draws a rule above the quoted header -- keep the signature above it.
  var previous = boundary.previousElementSibling;
  if (previous && previous.tagName === "HR") return previous;
  return boundary;
}

/** True when `el` sits in the part being written, not in the quoted thread. */
function isAboveBoundary(el, boundary) {
  if (!boundary) return true;
  if (el === boundary || el.contains(boundary) || boundary.contains(el)) return false;
  return Boolean(boundary.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
}

/**
 * Every signature block we have previously inserted, outermost first. Returns
 * more than one only if an earlier bug stacked them -- taking all of them out
 * is what un-stacks an already-broken draft.
 */
function findSignatureBlocks(doc) {
  var found = [];
  var selectors = [
    '[id$="' + SIGNATURE_MARKER + '"]',
    '[class*="' + SIGNATURE_MARKER + '"]',
  ];

  selectors.forEach(function (selector) {
    Array.prototype.forEach.call(doc.querySelectorAll(selector), function (el) {
      if (found.indexOf(el) === -1) found.push(el);
    });
  });

  // Drop anything nested inside another match; removing the outer one takes
  // the inner with it.
  return found.filter(function (el) {
    return !found.some(function (other) {
      return other !== el && other.contains(el);
    });
  });
}

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

    var signatureHtml = await response.text();
    var appliedFor = response.headers.get("X-Signature-User") || fromEmail;

    hidePicker();

    // Nothing left to decide once we know whose signature it is: put it in and
    // close. Reopening the pane is how you correct a wrong pick.
    applySignature(signatureHtml, appliedFor);
  } catch (err) {
    console.error("Fetch signature error:", err);
    setStatus("error", err.message || "Unknown error occurred");
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
 * Read the current message body as HTML.
 */
function getBodyHtml() {
  return new Promise(function (resolve, reject) {
    Office.context.mailbox.item.body.getAsync(
      Office.CoercionType.Html,
      function (result) {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value || "");
        } else {
          reject(new Error(result.error && result.error.message));
        }
      }
    );
  });
}

function setBodyHtml(html) {
  return new Promise(function (resolve, reject) {
    Office.context.mailbox.item.body.setAsync(
      html,
      { coercionType: Office.CoercionType.Html },
      function (result) {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error(result.error && result.error.message));
        }
      }
    );
  });
}

/**
 * Put the signature in the message, replacing one we put there earlier.
 *
 * This reads the body, edits it, and writes the whole thing back, rather than
 * inserting at the cursor. The pane has focus while the picker is open, so
 * there is no cursor in the message to insert at -- setSelectedDataAsync
 * reported success and the signature went nowhere visible. Rewriting the body
 * does not depend on where focus is.
 *
 * setSignatureAsync would handle replacement natively, but Office caps its
 * data at 30,000 characters and a signature carrying base64 images runs
 * several times that, so it is not available to us. The marked wrapper is what
 * makes a second pick replace the first instead of stacking under it.
 */
async function putSignature(html) {
  var doc = new DOMParser().parseFromString(await getBodyHtml(), "text/html");
  var boundary = findQuoteBoundary(doc);

  // Only signatures in the part being written count as ours to replace. One in
  // the quoted thread is the signature of whoever sent that message -- a
  // colleague also using this add-in -- and must be left as it is.
  var previous = findSignatureBlocks(doc).filter(function (el) {
    return isAboveBoundary(el, boundary);
  });

  var block = doc.createElement("div");
  block.id = SIGNATURE_MARKER;
  block.className = SIGNATURE_MARKER;
  block.innerHTML = html;

  // A replacement goes where the old one was; a first signature goes directly
  // above the quoted thread, or at the end of a message that has none.
  if (previous.length > 0) {
    previous[0].parentNode.insertBefore(block, previous[0]);
  } else if (boundary) {
    boundary.parentNode.insertBefore(block, boundary);
  } else {
    doc.body.appendChild(block);
  }

  // Remove every earlier copy, which also un-stacks a draft an older version
  // of this add-in left with several.
  previous.forEach(function (el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  });

  // Serialise the whole document, not doc.body.innerHTML: Outlook returns the
  // body wrapped in <html><head><style>, and dropping that head strips the
  // message its own formatting.
  await setBodyHtml(doc.documentElement.outerHTML);
}

/**
 * Close the pane. Outlook exposes two different calls depending on host and
 * version, and neither is guaranteed, so try both and let the status message
 * stand in where neither works.
 */
function closePane() {
  try {
    if (Office.context.ui && typeof Office.context.ui.closeContainer === "function") {
      Office.context.ui.closeContainer();
      return;
    }
    if (Office.addin && typeof Office.addin.hide === "function") {
      var hidden = Office.addin.hide();
      if (hidden && typeof hidden.catch === "function") {
        hidden.catch(function (e) {
          console.log("Taskpane close rejected:", e);
        });
      }
    }
  } catch (e) {
    console.log("Taskpane close unsupported here:", e);
  }
}

async function applySignature(html, appliedFor) {
  setStatus("loading", "Applying signature...");

  try {
    await putSignature(html);
    setStatus("success", "Signature applied for " + appliedFor + ".");
    // Closing tears down this runtime, so give Outlook a moment to finish
    // committing the write and leave the confirmation on screen long enough
    // to register.
    setTimeout(closePane, 600);
  } catch (err) {
    console.error("Signature insert error:", err);
    setStatus("error", "Failed to apply: " + (err.message || "Unknown error"));
  }
}
