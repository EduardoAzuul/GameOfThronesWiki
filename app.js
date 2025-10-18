// --- Module Imports ---
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

// --- API Constants ---
const URL_THRONES = "https://thronesapi.com/api/v2/Characters";
const URL_ICE_FIRE = "https://www.anapioficeandfire.com/api/characters";

const app = express();

// --- Express Configuration (Middleware) ---
app.use(cors());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "views");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- Character Cache ---
// This will store the merged character data to avoid repeated API calls
let cachedCharacters = null;


//************************* RENDERING ROUTES    ***********************


// MAIN ROUTE (/): Displays the complete gallery or a character's detail
app.get("/", async (req, res) => {
    try {
        const characters = await getMergedCharacters();
        res.render("index", {
            character: null,
            allCharacters: characters,
            error: null,
            totalCharacters: characters.length
        });
    } catch (error) {
        res.render("index", {
            character: null,
            allCharacters: [],
            error: "Could not load character data.",
            totalCharacters: 0
        });
    }
});

// SEARCH ROUTE (/search): Now with flexible search
app.get("/search", async (req, res) => {
    try {
        // 1. Prepare the search term: convert to lowercase and trim spaces
        const searchTerm = req.query.name.toLowerCase().trim();
        const allCharacters = await getMergedCharacters();

        // 2. Use .filter() instead of .find()
        //    .filter() returns an ARRAY with ALL matches, not just the first one
        //    The condition now uses .includes(), which searches for text anywhere in the name
        const foundCharacters = allCharacters.filter(
            (char) => char.fullName.toLowerCase().includes(searchTerm)
        );

        // 3. Evaluate the results to give the best response to the user
        if (foundCharacters.length > 1) {
            // -- MULTIPLE RESULTS: Show a gallery with only the found characters
            res.render("index", {
                character: null,
                allCharacters: foundCharacters, // Pass only the filter results!
                totalCharacters: allCharacters.length,
                error: `Found ${foundCharacters.length} characters for "${req.query.name}"`, // Informative message
            });
        } else if (foundCharacters.length === 1) {
            // -- SINGLE RESULT: Take the user directly to the detail card
            res.render("index", {
                character: foundCharacters[0],
                allCharacters: null,
                totalCharacters: allCharacters.length,
                error: null,
            });
        } else {
            // -- ZERO RESULTS: Show the complete gallery again with a clear error
            res.render("index", {
                character: null,
                allCharacters: allCharacters, // Pass all so the page doesn't stay empty
                totalCharacters: allCharacters.length,
                error: `No character found matching "${req.query.name}".`,
            });
        }
    } catch (error) {
        // -- SERVER ERROR: Handle any other possible failure
        console.error("Error in flexible search route:", error);
        res.render("index", {
            character: null,
            allCharacters: [],
            totalCharacters: 0,
            error: "A server error occurred during the search.",
        });
    }
});

// CHARACTER BY ID ROUTE (/character/:id):
app.get("/character/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const characters = await getMergedCharacters();
        const foundCharacter = characters.find((char) => char.id === id);

        if (foundCharacter) {
            res.render("index", {
                character: foundCharacter,
                allCharacters: null,
                totalCharacters: characters.length,
                error: null,
            });
        } else {
            res.render("index", {
                character: null,
                allCharacters: characters,
                totalCharacters: characters.length,
                error: `Character with ID "${id}" not found.`,
            });
        }
    } catch (error) {
        res.render("index", {
            character: null,
            allCharacters: [],
            totalCharacters: 0,
            error: "Server error while searching for the character.",
        });
    }
});


// =================================================================
// API ROUTE (Only for navigation)
// =================================================================

app.get("/api/character/navigate/:direction/:currentId", async (req, res) => {
    try {
        const currentId = parseInt(req.params.currentId);
        const direction = req.params.direction;
        const characters = await getMergedCharacters();
        const currentIndex = characters.findIndex(char => char.id === currentId);

        if (currentIndex === -1) {
            return res.status(404).json({ success: false, error: "Current character not found" });
        }

        let newIndex = (direction === 'next')
            ? (currentIndex + 1) % characters.length
            : (currentIndex - 1 + characters.length) % characters.length;

        res.json({ success: true, data: characters[newIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error in navigation" });
    }
});


// =================================================================
// DATA FETCHING AND MERGING LOGIC
// =================================================================

// Function to normalize data from the Thrones API
const mapThronesCharacter = (char) => ({
    // Basic information
    id: char.id,
    firstName: char.firstName || "Unknown",
    lastName: char.lastName || "",
    fullName: char.fullName || `${char.firstName} ${char.lastName}`.trim(),
    
    // Image and heraldry
    image: char.imageUrl || null,
    
    // Vital information
    born: char.born || "Unknown",
    died: char.died || "N/A",
    
    // Titles and aliases (convert to arrays)
    titles: char.title ? [char.title] : [],
    aliases: [],
    
    // Family
    family: char.family || "Unknown house",
    allegiances: [],
    
    
    source: "ThronesAPI"
});

// Function to normalize data from the Ice & Fire API
const mapIceFireCharacter = (char) => {
    // Extract ID from character URL
    const urlParts = char.url.split('/');
    const apiId = urlParts[urlParts.length - 1];
    
    return {
        // Basic information
        id: null, // Will be assigned later
        firstName: char.name ? char.name.split(' ')[0] : "Unknown",
        lastName: char.name ? char.name.split(' ').slice(1).join(' ') : "",
        fullName: char.name || `Unknown character #${apiId}`,
        
        // Image and heraldry
        image: null, // This API doesn't provide images
        
        // Vital information
        born: char.born || "Unknown",
        died: char.died || "Alive",
        
        // Titles and aliases (complete arrays)
        titles: char.titles && char.titles.length > 0 ? char.titles.filter(t => t) : [],
        aliases: char.aliases && char.aliases.length > 0 ? char.aliases.filter(a => a) : [],
        
        // Family (extracted from allegiances if available)
        family: char.allegiances && char.allegiances.length > 0 
            ? "See allied houses" 
            : "No known house",
        allegiances: char.allegiances || [], // House URLs
        
        source: "IceAndFireAPI"
    };
};

async function getMergedCharacters() {
    if (cachedCharacters) {
        return cachedCharacters;
    }

    console.log("Fetching and merging data from both APIs...");
    try {
        // Get ALL available pages from Ice & Fire API
        const thronesResponse = await axios.get(URL_THRONES);
        
        // Ice & Fire API has multiple pages, we need to get them all
        let allIceFireChars = [];
        let page = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
            try {
                const response = await axios.get(`${URL_ICE_FIRE}?pageSize=50&page=${page}`);
                if (response.data.length > 0) {
                    allIceFireChars = allIceFireChars.concat(response.data);
                    page++;
                    console.log(`Page ${page - 1} loaded: ${response.data.length} characters`);
                } else {
                    hasMorePages = false;
                }
            } catch (error) {
                console.log(`No more pages available. Total pages: ${page - 1}`);
                hasMorePages = false;
            }
        }
        
        const thronesChars = thronesResponse.data.map(mapThronesCharacter);
        const iceFireChars = allIceFireChars.map(mapIceFireCharacter);

        // Use a Map to prioritize ThronesAPI data and avoid duplicates
        const characterMap = new Map();

        // 1. Add all from ThronesAPI first, as they are more complete
        thronesChars.forEach(char => characterMap.set(char.fullName.toLowerCase(), char));

        // 2. Add Ice&Fire characters ONLY if they don't already exist in the map
        iceFireChars.forEach(char => {
            if (!characterMap.has(char.fullName.toLowerCase())) {
                characterMap.set(char.fullName.toLowerCase(), char);
            }
        });
        
        // Convert the map back to an array and assign a sequential ID
        cachedCharacters = Array.from(characterMap.values()).map((char, index) => ({
            ...char,
            id: index + 1
        }));

        console.log(`Process complete, character count: ${cachedCharacters.length}`);
        return cachedCharacters;

    } catch (error) {
        console.error(`Critical error: ${error.message}`);
        return []; // Return an empty array in case of error
    }
}

// --- Start the Server ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    getMergedCharacters(); // Preload the data
});