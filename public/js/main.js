// --- SEARCH LOGIC ---
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector(".search-input");

if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
        // Prevents the form’s default behavior (reloading the page).
        event.preventDefault();
        
        const characterName = searchInput.value.trim();
        
        if (characterName) {
            // --- BROWSER DIAGNOSTICS ---
            console.log(`Search started for: "${characterName}"`);
            const targetUrl = `/search/${encodeURIComponent(characterName)}`;
            console.log(`Redirecting to: ${targetUrl}`);
            
            // This line changes the URL in the browser.
            window.location.href = targetUrl;
        } else {
            console.log("The search field is empty.");
        }
    });
}

// --- NAVIGATION LOGIC ---
const prevButton = document.querySelector("#prev-btn");
const nextButton = document.querySelector("#next-btn");

if (prevButton && nextButton) {
    const navigationDiv = document.querySelector('.navigation');
    const currentId = parseInt(navigationDiv.dataset.characterId);

    const navigate = (direction) => {
        fetch(`/api/character/navigate/${direction}/${currentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `/character/${data.data.id}`;
                } else {
                    console.error("Navigation error from API:", data.error);
                }
            })
            .catch(error => console.error("Connection error in fetch:", error));
    };

    prevButton.addEventListener("click", () => navigate("prev"));
    nextButton.addEventListener("click", () => navigate("next"));
}
