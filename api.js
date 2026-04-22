// api.js - Modular fetcher for Wikimedia
const BASE_URL = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday";

/**
 * Fetches historical data based on type and date
 * @param {string} type - 'events', 'births', 'deaths', or 'holidays'
 * @param {string} mm - Month (01-12)
 * @param {string} dd - Day (01-31)
 */
async function getEvents(type = 'events', mm, dd) {
    try {
        const response = await fetch(`${BASE_URL}/${type}/${mm}/${dd}`);

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();

        // The API returns an object where the key is the 'type' (e.g., data.births)
        // Return that specific array to app.js
        return data[type] || [];

    } catch (error) {
        console.error("Failed to fetch from Wikimedia:", error);
        return [];
    }
}