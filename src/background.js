chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewsScraped") {
    chrome.runtime.sendMessage({action: "displayReviews", reviews: request.reviews});
  }
});