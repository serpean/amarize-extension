import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewsScraped") {
    chrome.runtime.sendMessage({ action: "displayReviews", reviews: request.reviews });
  }
  if (request.action === "summarizeReviews") {
    summarizeReviews(request.productId, request.reviews, request.apiConfig)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (request.action === "getCachedSummary") {
    getCachedSummary(request.productId)
      .then(cachedSummary => {
        sendResponse({ summary: cachedSummary });
      });
    return true;
  }
});

async function summarizeReviews(productId, reviews, apiConfig) {
  let ai;
  let model;

  switch (apiConfig.apiType) {
    case 'perplexity':
      ai = createOpenAI({
        apiKey: apiConfig.apiKey,
        baseURL: 'https://api.perplexity.ai/',
      });
      model = ai(apiConfig.model);
      break;
    case 'openai':
      ai = createOpenAI({
        apiKey: apiConfig.apiKey,
      });
      model = ai(apiConfig.model);
      break;
    case 'custom':
      ai = createOpenAI({
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.customUrl,
      });
      model = ai(apiConfig.customModel);
      break;
    default:
      throw new Error('Invalid API type');
  }

  const reviewTexts = reviews.map(review => review.text).join('\n\n');

  try {
    const result = await streamText({
      model: model,
      maxTokens: 1024,
      system: 'You are a helpful assistant that summarizes product reviews.',
      messages: [
        {
          role: 'user',
          content: `Summarize these product reviews:\n\n${reviewTexts}`
        }
      ],
    });

    const port = chrome.runtime.connect({ name: "summarizeStream" });
    let fullSummary = '';

    for await (const textPart of result.textStream) {
      port.postMessage({ chunk: textPart });
      fullSummary += textPart;
    }

    port.disconnect();

    cacheSummary(productId, fullSummary);
  } catch (error) {
    console.error('Error summarizing reviews:', error);
    throw error;
  }
}

function cacheSummary(productId, summary) {
  const now = new Date().getTime();
  const cacheItem = {
    summary: summary,
    timestamp: now
  };
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [productId]: cacheItem }, function () {
      console.log('Summary cached for product:', productId);
    });
  } else {
    console.log('(local) Summary cached for product:', productId)
    localStorage.setItem(productId, JSON.stringify(cacheItem));
  }
}

async function getCachedSummary(productId) {
  return new Promise((resolve) => {
    chrome.storage.local.get(productId, function (result) {
      if (result[productId]) {
        const cacheItem = result[productId];
        const now = new Date().getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        if (now - cacheItem.timestamp < oneDayInMs) {
          resolve(cacheItem.summary);
        } else {
          chrome.storage.local.remove(productId);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}