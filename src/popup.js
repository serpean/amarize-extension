import { marked } from 'marked';

let scrapedReviews = [];

// document.addEventListener('DOMContentLoaded', function () {
//   const apiKeyInput = document.getElementById('apiKeyInput');
//   const saveApiKeyButton = document.getElementById('saveApiKey');
//   const scrapeButton = document.getElementById('scrapeButton');

//   // Cargar la API key guardada (si existe)
//   chrome.storage.sync.get(['openaiApiKey'], function (result) {
//     if (result.openaiApiKey) {
//       apiKeyInput.value = result.openaiApiKey;
//     }
//   });

//   saveApiKeyButton.addEventListener('click', saveApiKey);
//   scrapeButton.addEventListener('click', startScraping);
// });

document.addEventListener('DOMContentLoaded', function () {
  const settingsIcon = document.getElementById('settingsIcon');
  const apiKeyConfig = document.getElementById('apiKeyConfig');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const scrapeButton = document.getElementById('scrapeButton');

  // Comprobar si la API key está configurada
  chrome.storage.sync.get(['openaiApiKey'], function (result) {
    if (!result.openaiApiKey) {
      apiKeyConfig.style.display = 'block';
      scrapeButton.style.display = 'none';
    } else {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  settingsIcon.addEventListener('click', function () {
    apiKeyConfig.style.display = apiKeyConfig.style.display === 'block' ? 'none' : 'block';
    scrapeButton.style.display = scrapeButton.style.display === 'none' ? 'block' : 'none';
  });

  saveApiKeyButton.addEventListener('click', function () {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ openaiApiKey: apiKey }, function () {
          showErrorMessage('API Key saved successfully', 'green');
          apiKeyConfig.style.display = 'none';
          scrapeButton.style.display = 'block';
        });
      } else {
        // Fallback para desarrollo local
        localStorage.setItem('openaiApiKey', apiKey);
        showErrorMessage('API Key saved successfully (local storage)', 'green');
        apiKeyConfig.style.display = 'none';
        scrapeButton.style.display = 'block';
      }
    } else {
      showErrorMessage('Please enter a valid API Key');
    }
  });

  scrapeButton.addEventListener('click', startScraping);
});


function showErrorMessage(message, color = 'red') {
  const errorMessageDiv = document.getElementById('errorMessage');
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.color = color;
  errorMessageDiv.style.display = 'block';
  setTimeout(() => {
    errorMessageDiv.style.display = 'none';
  }, 3000);
}

function startScraping() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  if (!apiKey) {
    showErrorMessage('Please enter an API Key before summarizing');
    return;
  }
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = `Getting reviews...`;
  resultDiv.style.display = 'block';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const originalProductUrl = tabs[0].url;
    const reviewsUrl = originalProductUrl.replace(/\/dp\//, '/product-reviews/') + '?reviewerType=all_reviews';

    chrome.tabs.update(tabs[0].id, { url: reviewsUrl }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tabId, { action: "scrapeAllReviews", originalUrl: originalProductUrl });
        }
      });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewsScraped") {
    scrapedReviews = request.reviews;
    document.getElementById('result').textContent = `Scraped ${request.reviews.length} reviews. Summarizing...`;
    summarizeReviewsWithAI(scrapedReviews);
  }
});

async function summarizeReviewsWithAI(reviews) {
  chrome.storage.sync.get(['openaiApiKey'], function (result) {
    if (result.openaiApiKey) {
      const resultDiv = document.getElementById('result');

      chrome.runtime.sendMessage(
        {
          action: "summarizeReviews",
          reviews: reviews,
          apiKey: result.openaiApiKey
        }
      );

      chrome.runtime.onConnect.addListener(function (port) {
        console.log("port", port);
        if (port.name === "summarizeStream") {
          let summary = '';
          port.onMessage.addListener(function (msg) {
            if (msg.chunk) {
              summary += msg.chunk;
              resultDiv.innerHTML = marked.parse(summary);
              resultDiv.scrollTop = resultDiv.scrollHeight;
            }
          });
        }
      });
    } else {
      document.getElementById('result').textContent = 'Please save your Perplexity API Key first.';
    }
  });
}