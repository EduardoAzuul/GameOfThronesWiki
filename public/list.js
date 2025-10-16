async function loadCharacters() {
    try {
        const response = await fetch('/api/characters');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to load characters');
        }

        allCharacters = data.data;
        document.getElementById('totalCharacters').textContent = 
            `Total Characters: ${data.totalCharacters}`;

        displayPage(1);
        updatePagination();
    } catch (error) {
        console.error('Error loading characters:', error);
        document.getElementById('characterList').innerHTML = 
            '<div class="error">Error loading characters. Please try again later.</div>';
    }
}