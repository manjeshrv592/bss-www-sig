/* global Office */

Office.onReady((info) => {
  console.log("=== Commands.js loaded ===");
  console.log("Host:", info.host);
  console.log("Platform:", info.platform);
  console.log("Mailbox diagnostics:", Office.context.mailbox.diagnostics);

  // Check if event-based activation is supported
  if (Office.context.requirements.isSetSupported("Mailbox", "1.10")) {
    console.log(
      "✅ Mailbox 1.10 is supported - event-based activation should work",
    );
  } else {
    console.log(
      "❌ Mailbox 1.10 NOT supported - event-based activation may not work",
    );
    console.log(
      "Supported version:",
      Office.context.mailbox.diagnostics.hostVersion,
    );
  }
});

// API endpoint for signatures
const API_BASE_URL = "https://sim-email-signature.vercel.app";

// Helper function to fetch signature from API
async function fetchSignature(userEmail) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/signature?email=${encodeURIComponent(userEmail)}`,
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("API Error:", errorData.error);
      return null;
    }

    const signatureHtml = await response.text();
    return signatureHtml;
  } catch (error) {
    console.error("Error fetching signature:", error);
    return null;
  }
}

// Helper function to insert signature
async function insertSignatureLogic(event, isAuto = false) {
  // Get the current email item
  const item = Office.context.mailbox.item;

  // Get user email from the From field
  return new Promise((resolve) => {
    item.from.getAsync(function (result) {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        console.error("Failed to get sender email:", result.error);

        // Fallback to userProfile email
        const fallbackEmail = Office.context.mailbox.userProfile.emailAddress;
        console.log("Using fallback email from userProfile:", fallbackEmail);
        continueWithEmail(fallbackEmail, item, event, isAuto);
        resolve();
        return;
      }

      const fromEmail = result.value.emailAddress;
      console.log("Sender email from item.from:", fromEmail);
      continueWithEmail(fromEmail, item, event, isAuto);
      resolve();
    });
  });
}

// Continue with the email insertion logic
async function continueWithEmail(userEmail, item, event, isAuto) {
  console.log("User email:", userEmail);

  // Ensure email is a string and trim whitespace
  const cleanEmail = String(userEmail || "")
    .trim()
    .toLowerCase();
  console.log("Clean email for API:", cleanEmail);

  if (!cleanEmail) {
    console.error("No email address found");
    if (!isAuto) {
      Office.context.mailbox.item.notificationMessages.addAsync(
        "signatureError",
        {
          type: "errorMessage",
          message: "Could not retrieve your email address.",
          icon: "Icon.80x80",
          persistent: false,
        },
      );
    }
    if (event) event.completed();
    return;
  }

  // Fetch signature from API
  const signatureHtml = await fetchSignature(cleanEmail);

  if (!signatureHtml) {
    console.error("Failed to fetch signature");

    if (!isAuto) {
      // Show error notification for manual clicks
      Office.context.mailbox.item.notificationMessages.addAsync(
        "signatureError",
        {
          type: "errorMessage",
          message:
            "Failed to load signature. Please try again or contact support.",
          icon: "Icon.80x80",
          persistent: false,
        },
      );
    }

    if (event) event.completed();
    return;
  }

  if (isAuto) {
    // AUTO-INSERT: Check if signature already present first
    item.body.getAsync(Office.CoercionType.Html, function (bodyResult) {
      if (
        bodyResult.status === Office.AsyncResultStatus.Succeeded &&
        bodyResult.value &&
        bodyResult.value.includes("Simtech IT Solutions Private Limited")
      ) {
        console.log("Signature already present, skipping.");
        if (event) event.completed();
        return;
      }
      setSignature(signatureHtml, item, event, isAuto);
    });
  } else {
    setSignature(signatureHtml, item, event, isAuto);
  }
}

// Set signature using setSignatureAsync (doesn't move cursor)
function setSignature(html, item, event, isAuto) {
  item.body.setSignatureAsync(
    html,
    { coercionType: Office.CoercionType.Html },
    function (result) {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        console.log("Signature set successfully");
        if (!isAuto) {
          item.notificationMessages.addAsync("signatureNotification", {
            type: "informationalMessage",
            message: "Simtech signature inserted successfully!",
            icon: "Icon.80x80",
            persistent: false,
          });
        }
      } else {
        console.error("setSignatureAsync error:", result.error.message);
        if (!isAuto) {
          item.notificationMessages.addAsync("signatureError", {
            type: "errorMessage",
            message: "Failed to apply signature: " + result.error.message,
            icon: "Icon.80x80",
            persistent: false,
          });
        }
      }
      if (event) event.completed();
    },
  );
}

// Manual button click handler
function insertSignature(event) {
  console.log("Insert Simtech button was clicked!");
  insertSignatureLogic(event, false);
}

// Automatic event handler
function autoInsertSignature(event) {
  console.log("=== AUTO-INSERT TRIGGERED ===");
  console.log("Event object:", event);
  console.log("Event type:", event ? event.type : "no event");
  console.log("Timestamp:", new Date().toISOString());
  insertSignatureLogic(event, true);
}

// Register the functions
Office.actions.associate("insertSignature", insertSignature);
Office.actions.associate("autoInsertSignature", autoInsertSignature);
