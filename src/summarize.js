import { StreamingTextResponse, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

export async function summarizeReviews(reviews, apiKey) {
    console.log('Summarizing reviews with OpenAI API');
    const perplexity = createOpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.perplexity.ai/',
    });

    const reviewTexts = reviews.map(review => review.text).join('\n\n');

    const stream = await streamText({
        model: perplexity('llama-3-sonar-large-32k-online'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
        messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes product reviews.' },
            { role: 'user', content: `Summarize these product reviews:\n\n${reviewTexts}` }
        ]
    });

    return new StreamingTextResponse(stream)
}