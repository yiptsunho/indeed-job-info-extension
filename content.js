console.log("Content script loaded on page:", window.location.href, "at:", new Date().toISOString());

// Prevent multiple injections
let hasInjected = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received in content script:", request, "from sender:", sender);
    if (request.action === "processJobInfo") {
        // hasInjected = true;
        try {
            const data = request.data;
            console.log("Processing job info data:", JSON.stringify(data, null, 2));
            const hiringInsights = data.body?.hiringInsightsModel || {};
            const jobData = data.body?.hostQueryExecutionResult?.data?.jobData?.results[0]?.job || {};

            console.log("Extracted hiringInsights:", hiringInsights);
            console.log("Extracted jobData:", jobData);

            // Extract existing fields
            const age = hiringInsights.age || "Not available";
            const dateOnIndeed = jobData.dateOnIndeed ? new Date(jobData.dateOnIndeed).toLocaleString() : "Not available";
            const datePublished = jobData.datePublished ? new Date(jobData.datePublished).toLocaleString() : "Not available";
            const daysSincePosted = jobData.datePublished
                ? Math.floor((Date.now() - jobData.datePublished) / (1000 * 60 * 60 * 24))
                : "Unknown";

            // Format all hiringInsightsModel fields
            const formatValue = (value) => {
                if (value === null || value === undefined) return "Not available";
                if (typeof value === "object") return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
                return String(value);
            };
            const hiringInsightsHtml = Object.entries(hiringInsights)
                .map(([key, value]) => `<p><strong>${key}:</strong> ${formatValue(value)}</p>`)
                .join("");

            console.log("Calculated values:", { age, dateOnIndeed, datePublished, daysSincePosted });
            console.log("Formatted hiringInsights HTML:", hiringInsightsHtml);

            // Create UI element to display info
            const infoDiv = document.createElement("div");
            infoDiv.id = "job-posting-info";
            infoDiv.innerHTML = `
        <h3>Job Posting Information</h3>
        <h4>Basic Info</h4>
        <p><strong>Age:</strong> ${age}</p>
        <p><strong>Date on Indeed:</strong> ${dateOnIndeed}</p>
        <p><strong>Date Published:</strong> ${datePublished}</p>
        <p><strong>Days Since Posted:</strong> ${daysSincePosted} days</p>
        <h4>Hiring Insights (All Fields)</h4>
        ${hiringInsightsHtml || "<p>No additional hiring insights available</p>"}
      `;

            // Try multiple selectors for job description
            const selectors = [
                "div.jobsearch-JobComponent-description",
                "div#jobDescriptionText",
                "div.jobsearch-jobDescriptionText"
            ];
            let jobDescription = null;
            for (const selector of selectors) {
                jobDescription = document.querySelector(selector);
                if (jobDescription) {
                    console.log(`Found job description with selector: ${selector}`);
                    break;
                }
            }

            if (jobDescription) {
                console.log("Injecting infoDiv before job description");
                jobDescription.prepend(infoDiv);
            } else {
                console.log("Job description not found, injecting into body");
                document.body.prepend(infoDiv);
            }
            sendResponse({ status: "success" });
        } catch (error) {
            console.error("Error processing job info:", error.message);
            const errorDiv = document.createElement("div");
            errorDiv.id = "job-posting-info";
            errorDiv.className = "error";
            errorDiv.innerHTML = `<p>Error processing job posting information: ${error.message}</p>`;
            document.body.prepend(errorDiv);
            sendResponse({ status: "error", message: error.message });
        }
        return true; // Keep the message channel open for async response
    // } else if (hasInjected) {
    //     console.log("Skipping processing, UI already injected");
    //     sendResponse({ status: "skipped", message: "UI already injected" });
    }
});

// Manual trigger for testing, runs only once
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded, checking URL:", window.location.href);
    if (window.location.href.includes("viewjob") && !hasInjected) {
        console.log("Manual trigger: Injecting test div to confirm content script execution");
        const testDiv = document.createElement("div");
        testDiv.id = "job-posting-test";
        testDiv.innerHTML = "<p>Content script is running! Waiting for job data...</p>";
        testDiv.style.backgroundColor = "#ffcccc";
        testDiv.style.padding = "10px";
        testDiv.style.margin = "10px 0";
        document.body.prepend(testDiv);
    }
}, { once: true }); // Run only once