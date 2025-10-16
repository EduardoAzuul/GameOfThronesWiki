// Importing required modules
const express = require("express");         // Framework for creating web servers
const bodyParser = require("body-parser");  // Middleware to parse incoming request bodies
const axios = require("axios");             // HTTP client to make API requests
const cors = require("cors");               // Middleware to enable Cross-Origin Resource Sharing

// URLs for the APIs
const URLTHRONES = "https://thronesapi.com/api/v2/Characters";
const URLICE = "https://api.iceandfire.com/characters";

// Middleware setup
app.use(cors()); // Allow requests from other origins
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(bodyParser.json()); //Used to recive JSON data
app.use(express.static("public"));// Serve static files from 'public' folder
app.set("view engine", "ejs");// Set EJS as the templating engine

const app = express();

//Route 1: Base page
app.get("/", (req, res) => {
    // Render the index page with initial null values for characters and error
    res.render("index", { characters: null, error: null });
});

// Route 2: Get a single character by ID
app.get("/api/characters/:id", async (req, res) => {
    const id = req.params.id; // Get the character ID from the route parameter
    try {
        const characters = await getAllCharacters(); // Fetch all characters
        // Find the character with matching ID (converted to string for comparison)
        const character = characters.find(char => String(char.id) === id);
        
        // If found, return JSON with character info and total count
        if (character) {
            res.json({
                success: true,
                data: character,
                totalCharacters: characters.length
            });
        } else {
             // If not found, return 404 error
            res.status(404).json({
                success: false,
                error: "Character not found"
            });
        }
    } catch (error) {
        // Catch any server or API errors
        res.status(500).json({ error: "Error fetching character data" });
    }
});

// Route 3: Get count of all characters
app.get("/api/characters/count", async (req, res) => {
    try {
        const characters = await getAllCharacters(); // Fetch all characters
        res.json({
            success: true,
            count: characters.length // Return total number of characters
        });
    } catch (error) {
        // Handle server error
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

// Function: Fetch Thrones characters
async function getThronesCharacters() {
    try {
        const response = await axios.get(URLTHRONES);   // Call Thrones API
        return response.data.map(char => ({ //Map API data filtered to only get the necessary data
            id: char.id,
            image: char.imageUrl || char.image || null,
            firstName: char.firstName || "Unknown",
            lastName: char.lastName || "",
            fullName: char.fullName || `${char.firstName} ${char.lastName}`,
            born: char.born || "Unknown",
            died: char.died || "N/A",
            titles: Array.isArray(char.title) ? char.title.join(", ") : (char.title || "No title"),
            aliases: char.aliases || "No aliases",
            family: char.family || "Unknown",
            familyCrest: char.imageUrl || null, 
            source: "thrones"
        }));
    } catch (error) {
        console.error("Error fetching Thrones API:", error);
        return [];  // Return empty array if error
    }
}

//Using the API of Ice and Fire to get all characters
async function getIceAndFireCharacters(page = 1, pageSize = 50) {
    try {
        let allChars = [];  // Array to store all characters

    // Loop through pages to fetch characters
    for (let page = 1; page <= pages; page++) {
            const response = await axios.get(`${URLICE}?page=${page}&pageSize=50`);
            allChars = [...allChars, ...response.data]; // Append fetched characters
        }
        
        return allChars
            .filter(char => char.name && char.name !== "") //Only characters with names
            .map(char => {
                const id = char.url.split('/').pop(); // Extract ID from URL    
                const nameParts = char.name.split(' '); // Split name into first and last
                
                return {    //Return only necesary data
                    id: parseInt(id),
                    image: null, // Ice & Fire doens't have images
                    firstName: nameParts[0] || "Unknown",
                    lastName: nameParts.slice(1).join(' ') || "",
                    fullName: char.name,
                    born: char.born || "Unknown",
                    died: char.died || "N/A",
                    titles: char.titles.filter(t => t !== "").join(", ") || "No title",
                    aliases: char.aliases.filter(a => a !== "").join(", ") || "No aliases",
                    family: char.allegiances.length > 0 ? "See allegiances" : "Unknown",
                    familyCrest: null, //Doesn't have family crests
                    source: "iceandfire"
                };
            });
    } catch (error) {
        console.error("Error fetching Ice & Fire API:", error);
        return [];
    }
}

// Function: Merge characters from both APIs
async function getMergedCharacters() {
    if (mergedCharacters) { //Singleton design pattern
        return mergedCharacters; // Return cached result if available
    }

    console.log("Fetching characters from both APIs...");

    const thronesChars = await getThronesCharacters();      // Thrones characters
    const iceChars = await getIceAndFireCharacters(10);     // Ice & Fire characters (fetching first 10 pages, 50 each)

    console.log(`Thrones API: ${thronesChars.length} characters`);
    console.log(`Ice & Fire API: ${iceChars.length} characters`);

    //Creating a set of full names from Thrones characters for quick lookup
    const thronesNames = new Set(
        thronesChars.map(c => c.fullName.toLowerCase().trim())
    );

    //Filtering Ice & Fire characters to remove duplicates based on full name
    const uniqueIceChars = iceChars.filter(
        char => !thronesNames.has(char.fullName.toLowerCase().trim())
    );

    //merge both lists
    mergedCharacters = [...thronesChars, ...uniqueIceChars];
    
    //Re index the IDs
    mergedCharacters = mergedCharacters.map((char, index) => ({
        ...char,
        id: index + 1
    }));

    console.log(`Total characters: ${mergedCharacters.length}`);
    
    return mergedCharacters;
}

// Route 4: Navigation between characters
app.get("/api/character/navigate/:direction/:currentId", async (req, res) => {
    try {
        const currentId = parseInt(req.params.currentId);   // Current character ID 
        const direction = req.params.direction;             // Direction: next or prev
        const characters = await getMergedCharacters();     // Get merged list
        
        const currentIndex = characters.findIndex(char => char.id === currentId); // Find current index
        
        if (currentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Current character not found"
            });
        }
        
        let newIndex;
        
        // Determine new index based on direction
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % characters.length;
        } else if (direction === 'prev') {
            newIndex = currentIndex === 0 ? characters.length - 1 : currentIndex - 1;
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid direction. Use 'next' or 'prev'"
            });
        }
        
        const character = characters[newIndex];     // Get the new character
        
        // Return JSON with new character data
        res.json({
            success: true,
            data: {
                id: character.id,
                image: character.image,
                firstName: character.firstName,
                lastName: character.lastName,
                fullName: character.fullName,
                born: character.born,
                died: character.died,
                titles: character.titles,
                aliases: character.aliases,
                family: character.family,
                familyCrest: character.familyCrest
            },
            totalCharacters: characters.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

// Start the server (keep at the end)
app.listen(3000, () => {
    console.log("Listening to port 3000");
});

