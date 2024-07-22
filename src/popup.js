let scrapedReviews = [];

document.getElementById('scrapeButton').addEventListener('click', startScraping);
document.getElementById('exportButton').addEventListener('click', () => exportReviewsCSV(scrapedReviews));

function startScraping() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const originalProductUrl = tabs[0].url;
        const reviewsUrl = originalProductUrl.replace(/\/dp\//, '/product-reviews/') + '?reviewerType=all_reviews';
        
        chrome.tabs.update(tabs[0].id, { url: reviewsUrl }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (info.status === 'complete' && tabId === tab.id) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.sendMessage(tabId, {action: "scrapeAllReviews", originalUrl: originalProductUrl});
                }
            });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reviewsScraped") {
        scrapedReviews = request.reviews;
        document.getElementById('result').textContent = `Scraped ${request.reviews.length} reviews with text.`;
        document.getElementById('exportButton').disabled = false;
    }
});

function exportReviewsCSV(reviews) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Title,Text,Rating\n";

    reviews.forEach(review => {
        let row = `"${review.title.replace(/"/g, '""')}","${review.text.replace(/"/g, '""')}","${review.rating}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "amazon_reviews.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}