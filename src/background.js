import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewsScraped") {
    chrome.runtime.sendMessage({ action: "displayReviews", reviews: request.reviews });
  }
  if (request.action === "summarizeReviews") {
    summarizeReviews(request.reviews, request.apiKey)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function summarizeReviews(reviews, apiKey) {
  console.log('Summarizing reviews with Perplexity API');
  const perplexity = createOpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.perplexity.ai/',
  });

  const reviewTexts = reviews.map(review => review.text).join('\n\n');

  try {
    const result = await streamText({
      model: perplexity('llama-3-sonar-large-32k-online'),
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