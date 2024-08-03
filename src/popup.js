import { marked } from 'marked';

let scrapedReviews = [];

const perplexityModels = [
  { value: 'llama-3.1-sonar-small-128k-chat', label: 'llama-3.1-sonar-small-128k-chat' },
  { value: 'llama-3.1-sonar-large-128k-chat', label: 'llama-3.1-sonar-large-128k-chat' },
  { value: 'llama-3.1-8b-instruct', label: 'llama-3.1-8b-instruct' },
  { value: 'llama-3.1-70b-instruct', label: 'llama-3.1-70b-instruct' }
];

const openaiModels = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

document.addEventListener('DOMContentLoaded', function () {
  const settingsIcon = document.getElementById('settingsIcon');
  const apiKeyConfig = document.getElementById('apiKeyConfig');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const scrapeButton = document.getElementById('scrapeButton');
  const apiSelect = document.getElementById('apiSelect');
  const modelSelect = document.getElementById('modelSelect');
  const customUrlInput = document.getElementById('customUrlInput');
  const customModelInput = document.getElementById('customModelInput');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const originalProductUrl = tabs[0].url;
    const isAmazonSite = originalProductUrl.match(/^https?:\/\/(.+\.)?amazon\.(com|co\.uk|de|fr|it|es|ca|com\.mx|com\.br|com\.au)\//);
    if (!isAmazonSite) {
      scrapeButton.textContent = 'This extension only works on Amazon product pages.';
      scrapeButton.disabled = true;
      scrapeButton.style.backgroundColor = '#ccc';
      scrapeButton.style.cursor = 'not-allowed';
      return;
    }

    const productId = getProductIdFromUrl(originalProductUrl);
    checkForCachedSummary(productId);
  });

  // Comprobar si la API key está configurada
  chrome.storage.sync.get(['apiConfig'], function (result) {
    if (result.apiConfig) {
      const config = result.apiConfig;
      apiKeyInput.value = config.apiKey;
      apiSelect.value = config.apiType;
      updateModelSelect(config.apiType);
      if (config.apiType === 'custom') {
        customUrlInput.value = config.customUrl || '';
        customModelInput.value = config.customModel || '';
      } else {
        modelSelect.value = config.model || '';
      }
    } else {
      apiKeyConfig.style.display = 'block';
      scrapeButton.style.display = 'none';
    }
  });

  settingsIcon.addEventListener('click', function () {
    apiKeyConfig.style.display = apiKeyConfig.style.display === 'block' ? 'none' : 'block';
    scrapeButton.style.display = scrapeButton.style.display === 'none' ? 'block' : 'none';
  });


  saveApiKeyButton.addEventListener('click', function () {
    const apiKey = apiKeyInput.value.trim();
    const apiType = apiSelect.value;
    if (apiKey) {
      const config = {
        apiKey: apiKey,
        apiType: apiType,
        model: apiType === 'custom' ? null : modelSelect.value,
        customUrl: apiType === 'custom' ? customUrlInput.value.trim() : null,
        customModel: apiType === 'custom' ? customModelInput.value.trim() : null
      };
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ apiConfig: config }, function () {
          showErrorMessage('Configuration saved successfully', 'green');
          apiKeyConfig.style.display = 'none';
          scrapeButton.style.display = 'block';
        });
      } else {
        // Fallback local dev
        localStorage.setItem('apiConfig', JSON.stringify(config));
        showErrorMessage('Configuration saved successfully (local storage)', 'green');
        apiKeyConfig.style.display = 'none';
        scrapeButton.style.display = 'block';
      }
    } else {
      showErrorMessage('Please enter a valid API Key');
    }
  });

  updateModelSelect('perplexity');
  apiSelect.addEventListener('change', function() {
    updateModelSelect(this.value);
  });

  scrapeButton.addEventListener('click', startScraping);
});

function updateModelSelect(apiType) {
  const modelSelect = document.getElementById('modelSelect');
  const customModelConfig = document.getElementById('customModelConfig');

  modelSelect.innerHTML = '';
  
  switch (apiType) {
    case 'perplexity':
      populateModelSelect(perplexityModels);
      customModelConfig.style.display = 'none';
      modelSelect.style.display = 'block';
      break;
    case 'openai':
      populateModelSelect(openaiModels);
      customModelConfig.style.display = 'none';
      modelSelect.style.display = 'block';
      break;
    case 'custom':
      modelSelect.style.display = 'none';
      customModelConfig.style.display = 'block';
      break;
  }
}

function populateModelSelect(models) {
  const modelSelect = document.getElementById('modelSelect');
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });
}

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
    const isAmazonSite = originalProductUrl.match(/^https?:\/\/(.+\.)?amazon\.(com|co\.uk|de|fr|it|es|ca|com\.mx|com\.br|com\.au)\//);
    if (!isAmazonSite) {
      resultDiv.textContent = 'This extension only works on Amazon product pages.';
      return;
    }
    const productId = getProductIdFromUrl(originalProductUrl);
    const reviewsUrl = originalProductUrl.replace(/\/dp\//, '/product-reviews/') + '?reviewerType=all_reviews&sortBy=recent';

    chrome.tabs.update(tabs[0].id, { url: reviewsUrl }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tabId, { action: "scrapeAllReviews", originalUrl: originalProductUrl, productId: productId});
        }
      });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "noReviews") {
    document.getElementById('result').textContent = 'No reviews found on this page.';
  }
  if (request.action === "reviewsScraped") {
    scrapedReviews = request.reviews;
    document.getElementById('result').textContent = `Retrieved ${request.reviews.length} reviews. Summarizing...`;
    summarizeReviewsWithAI(scrapedReviews, request.productId);
  }
});

async function summarizeReviewsWithAI(reviews, productId) {
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['apiConfig'], function (result) {
      if (result.apiConfig && result.apiConfig.apiKey) {
        const resultDiv = document.getElementById('result');
        const config = result.apiConfig;

        chrome.runtime.sendMessage(
          {
            action: "summarizeReviews",
            productId: productId,
            reviews: reviews,
            apiConfig: config
          }
        );

        chrome.runtime.onConnect.addListener(function (port) {
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
        document.getElementById('result').textContent = 'Please save your configuration first.';
      }
    });
  } else {
    // Fallback local dev
    const config = JSON.parse(localStorage.getItem('apiConfig'));
    if (config && config.apiKey) {
      const resultDiv = document.getElementById('result');
      chrome.runtime.sendMessage(
        {
          action: "summarizeReviews",
          productId: productId,
          reviews: reviews,
          apiConfig: config
        }
      );

      chrome.runtime.onConnect.addListener(function (port) {
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
      document.getElementById('result').textContent = 'Please save your configuration first.';
    }
  }
}

function getProductIdFromUrl(url) {
  const match = url.match(/\/dp\/([A-Z0-9]+)/);
  return match ? match[1] : null;
}
function displaySummary(summary) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = marked.parse(summary);
  resultDiv.style.display = 'block';
  document.getElementById('scrapeButton').textContent = 'Refresh Summary';
}

function checkForCachedSummary(productId) {
  chrome.runtime.sendMessage(
    { action: "getCachedSummary", productId: productId },
    function(response) {
      if (response && response.summary) {
        displaySummary(response.summary);
      }
    }
  );
}