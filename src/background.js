import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewsScraped") {
    chrome.runtime.sendMessage({ action: "displayReviews", reviews: request.reviews });
  }
  if (request.action === "summarizeReviews") {
    summarizeReviews(request.reviews, request.apiConfig)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function summarizeReviews(reviews, apiConfig) {
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
    
    for await (const textPart of result.textStream) {
      port.postMessage({ chunk: textPart });
    }
    
    port.disconnect();
  } catch (error) {
    console.error('Error summarizing reviews:', error);
    throw error;
  }
}