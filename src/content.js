let originalUrl = '';
let totalReviews = 0;
let reviewsWithText = 0;

// Crear e insertar el modal en la página
function createModal() {
    const modalHTML = `
        <div id="reviewScraperModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.4);">
            <div style="background-color:#fefefe; margin:15% auto; padding:20px; border:1px solid #888; width:80%; max-width:500px;">
                <h2>Ama(Summa)rize Reviews</h2>
                <p id="modalMessage">Getting reviews...</p>
                <div id="progressBarContainer" style="width:100%; background-color:#f3f3f3; padding:3px; border-radius:3px;">
                    <div id="progressBar" style="width:0%; height:20px; background-color:#4CAF50; border-radius:2px; transition:width 0.5s;"></div>
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
    const percentage = (scrapedReviews / totalReviews) * 100;
    document.getElementById('progressBar').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `Reviews scraped: ${scrapedReviews} / ${totalReviews} (with text)`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeAllReviews") {
        originalUrl = request.originalUrl;
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
        const match = reviewInfoText.match(/(\d+) total ratings, (\d+) with reviews/);
        if (match) {
            totalReviews = parseInt(match[1]);
            reviewsWithText = parseInt(match[2]);
        }
    }

    if (totalReviews === 0 || reviewsWithText === 0) {
        document.getElementById('modalMessage').textContent = "Error: No se pudo obtener la información de las reseñas.";
        return;
    }

    while (hasNextPage && allReviews.length < reviewsWithText) {
        const reviews = scrapeCurrentPage();
        allReviews = allReviews.concat(reviews);

        updateModalProgress(allReviews.length, reviewsWithText);

        hasNextPage = await goToNextPage();
    }

    document.getElementById('modalMessage').textContent = `Scraped ${allReviews.length} reviews with text.`;
    chrome.runtime.sendMessage({action: "reviewsScraped", reviews: allReviews});

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
    
    if (titleElement && textElement && ratingElement) {
      const title = titleElement.textContent.trim();
      const text = textElement.textContent.trim();
      const rating = ratingElement.textContent.trim();
      
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
      }, 2000); // Espera 2 segundos para que cargue la página
    } else {
      resolve(false);
    }
  });
}