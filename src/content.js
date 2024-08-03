let originalUrl = '';
let totalReviews = 0;
let reviewsWithText = 0;
let productId = '';

// Crear e insertar el modal en la página
function createModal() {
    const modalHTML = `
        <div id="reviewScraperModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.4);">
            <div style="background-color:#fefefe; margin:15% auto; padding:20px; border:1px solid #888; width:80%; max-width:500px;">
                <h2>Getting reviews...</h2>
                <p id="modalMessage"></p>
                <div id="progressBarContainer" style="width:100%; background-color:#f0f2f2; padding:0px; border-radius:4px;">
                    <div id="progressBar" style="width:0%; height:20px; background-color:#ffa41c; border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <p id="progressText">Progress: 0 / 0 (with text)</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showModal() {
    document.getElementById('reviewScraperModal').style.display = 'block';
}

function hideModal() {
    document.getElementById('reviewScraperModal').style.display = 'none';
}

function updateModalProgress(scrapedReviews, totalReviews) {
    const maxReviews = Math.min(totalReviews, 100);
    const percentage = (scrapedReviews / maxReviews) * 100;
    document.getElementById('progressBar').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `Reviews: ${scrapedReviews} / ${maxReviews}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeAllReviews") {
        originalUrl = request.originalUrl;
        productId = request.productId;
        createModal();
        showModal();
        scrapeAllReviews();
    }
});

async function scrapeAllReviews() {
    let allReviews = [];
    let hasNextPage = true;

    const reviewInfoElement = document.querySelector('[data-hook="cr-filter-info-review-rating-count"]');
    if (reviewInfoElement) {
        const reviewInfoText = reviewInfoElement.textContent.trim();
        const match = reviewInfoText.match(/(\d{1,3}(?:[.,]\d{3})*|\d+).*?(\d{1,3}(?:[.,]\d{3})*|\d+)/);
        if (match) {
            totalReviews = parseInt(match[1].replace(/[,.]/g, ''));
            reviewsWithText = parseInt(match[2].replace(/[,.]/g, ''));
        }
    }

    if (totalReviews === 0 || reviewsWithText === 0) {
        document.getElementById('modalMessage').textContent = "Error: I cannot find the number of reviews on this page.";
        document.getElementById('progressText').textContent = "";
        chrome.runtime.sendMessage({action: "noReviews"});
        setTimeout(() => {
            hideModal();
            window.location.href = originalUrl;
        }, 3000);
        return;
    }

    if (reviewsWithText > 100) {
      document.getElementById('modalMessage').innerHTML = "<div style='color:#ffa41c;'>Warning: This product has more than 100 reviews with text.<br/> Only the first 100 will be analyzed.</div>";
    }

    while (hasNextPage && allReviews.length < reviewsWithText) {
        const reviews = scrapeCurrentPage();
        allReviews = allReviews.concat(reviews);

        updateModalProgress(allReviews.length, reviewsWithText);

        hasNextPage = await goToNextPage();
    }

    document.getElementById('modalMessage').textContent = `Retrieved ${allReviews.length} reviews with text.`;
    chrome.runtime.sendMessage({action: "reviewsScraped", reviews: allReviews, productId: productId});

    setTimeout(() => {
        hideModal();
        window.location.href = originalUrl;
    }, 3000);
}

function scrapeCurrentPage() {
  const reviews = [];
  const reviewElements = document.querySelectorAll('[data-hook="review"]');
  
  reviewElements.forEach(review => {
    const titleElement = review.querySelector('[data-hook="review-title"]');
    const textElement = review.querySelector('[data-hook="review-body"]');
    const ratingElement = review.querySelector('[data-hook="cmps-review-star-rating"]');
    const reviewStartRating = review.querySelector('[data-hook="review-star-rating"]');
    
    if (titleElement && textElement && (ratingElement || reviewStartRating)) {
      const title = titleElement.textContent.trim();
      const text = textElement.textContent.trim();
      const rating = ratingElement?.textContent?.trim() || reviewStartRating?.textContent?.trim();

      reviews.push({ title, text, rating });
    }
  });

  return reviews;
}

function goToNextPage() {
  return new Promise((resolve) => {
    const nextButton = document.querySelector('li.a-last a');
    if (nextButton) {
      nextButton.click();
      setTimeout(() => {
        resolve(true);
      }, 2000);
    } else {
      resolve(false);
    }
  });
}