console.log("Background script loaded at:", new Date().toISOString());

// Debounce function to limit request handling
let lastProcessed = 0;
const DEBOUNCE_MS = 2000; // Process requests at most every 2 seconds

chrome.webRequest.onCompleted.addListener(
    function(details) {
        const now = Date.now();
        if (now - lastProcessed < DEBOUNCE_MS) {
            console.log("Debounced /viewjob request for URL:", details.url);
            return;
        }
        lastProcessed = now;
        console.log("webRequest.onCompleted triggered for URL:", details.url, "at:", new Date().toISOString());
        if (details.url.includes("viewjob")) {
            console.log("Detected /viewjob request, querying active tab");
            // Fetch the response body (requires webRequestBlocking permission)
            fetch(details.url, { method: "GET" })
                .then(response => {
                    console.log("Intercepted response status:", response.status, "for URL:", details.url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text().then(text => ({ text, response }));
                })
                .then(({ text, response }) => {
                    let data;
                    try {
                        data = JSON.parse(text);
                        console.log("Intercepted JSON data:", JSON.stringify(data, null, 2));
                    } catch (error) {
                        console.error("Failed to parse intercepted JSON:", error.message, "Raw response:", text);
                        throw new Error("Invalid JSON response");
                    }
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        if (tabs[0]) {
                            console.log("Sending message to tab ID:", tabs[0].id, "for URL:", details.url);
                            chrome.tabs.sendMessage(tabs[0].id, { action: "processJobInfo", data: data }, function(response) {
                                if (chrome.runtime.lastError) {
                                    console.error("Message sending error:", chrome.runtime.lastError.message, "for tab ID:", tabs[0].id);
                                    return;
                                }
                                console.log("Message response:", response || "No response");
                            });
                        } else {
                            console.error("No active tab found for URL:", details.url);
                        }
                    });
                })
                .catch(error => {
                    console.error("Error intercepting /viewjob response:", error.message, "for URL:", details.url);
                });
        } else {
            console.log("URL does not match /viewjob:", details.url);
        }
    },
    { urls: ["https://*.indeed.com/*viewjob*hostid=homepage*"] },
    ["responseHeaders"]
);