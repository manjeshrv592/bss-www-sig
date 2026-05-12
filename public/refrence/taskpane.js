/* global Office */

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    console.log("Task pane loaded successfully!");
  }
});
