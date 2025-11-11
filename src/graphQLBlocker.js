// --- START OF FILE graphQLBlocker.js ---
// --- Injectable GraphQL Function ---
// NOTE: This runs in the page's context, not the extension's context.

function executeGraphQLBlock(scammerUserID, groupID, fb_dtsg, jazoest, lsd, adminUserId) {

    // --- START: Configuration Constants ---
    // These values are prone to change when Facebook updates its API.
    // By defining them here, we can update them easily in one place.
    const BLOCK_DOC_ID = "25160809070205097"; // As of Nov 2025, for useGroupsCometBlockUserMutation.
    const FRIENDLY_NAME = "useGroupsCometBlockUserMutation";
    const ACTION_SOURCE = "MEMBER_LIST"; // The context from which the block action is initiated.
    // --- END: Configuration Constants ---

    /**
     * Helper function to construct and send the actual fetch request to Facebook's GraphQL API.
     * @param {boolean} isAggressiveBlock - If true, enables all flags for deleting content and blocking future accounts.
     * @returns {Promise<Response>} The fetch promise.
     */
    const performBlockRequest = (isAggressiveBlock) => {
        console.log(`FSA (Injected): Performing block request (Aggressive: ${isAggressiveBlock})`);

        // The 'variables' object contains the specific data for the mutation.
        const variables = {
            "groupID": groupID,
            "input": {
                "actor_id": adminUserId,
                "group_id": groupID,
                "user_id": scammerUserID,
                "action_source": ACTION_SOURCE,
                "client_mutation_id": isAggressiveBlock ? "1" : "2", // Differentiate aggressive vs. simple block calls

                // These flags are for the "aggressive" block. They are set to false for the "simple" block.
                "apply_to_later_created_accounts": isAggressiveBlock,
                "delete_recent_comments": isAggressiveBlock,
                "delete_recent_posts": isAggressiveBlock,
                "apply_to_other_groups_you_manage": false, // This feature is unreliable and kept off.
                "delete_recent_invites": isAggressiveBlock,
                "delete_recent_poll_options": isAggressiveBlock,
                "delete_recent_reactions": isAggressiveBlock,
                "delete_recent_story_threads": isAggressiveBlock,
            },
            "memberID": scammerUserID,
            "scale": 1,
        };

        // These are the main form-data parameters for the GraphQL endpoint.
        const bodyParams = {
           "av": adminUserId,
           "__user": adminUserId,
           "__a": "1",
           "__req": "a",
           "dpr": window.devicePixelRatio || 1,
           "__comet_req": "15",
           "fb_dtsg": fb_dtsg,
           "jazoest": jazoest || '',
           "lsd": lsd || fb_dtsg,
           "fb_api_caller_class": "RelayModern",
           "fb_api_req_friendly_name": FRIENDLY_NAME,
           "variables": JSON.stringify(variables),
           "server_timestamps": "true",
           "doc_id": BLOCK_DOC_ID
        };

        const formData = new FormData();
        for (const key in bodyParams) {
            if (bodyParams.hasOwnProperty(key) && bodyParams[key] !== undefined && bodyParams[key] !== null) {
                formData.append(key, bodyParams[key]);
            }
        }

        console.log("FSA (Injected): Sending GraphQL request with params:", bodyParams);

        return fetch('/api/graphql/', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Sec-Fetch-Site': 'same-origin',
                'X-FB-LSD': lsd || fb_dtsg
            }
        });
    }; // --- End of performBlockRequest helper function ---

    // --- Main Logic Flow ---
    console.log("FSA (Injected): Starting block process for:", { scammerUserID, groupID });

    if (!scammerUserID || !groupID || !fb_dtsg || !adminUserId) {
        const errorMessage = "FSA (Injected): Validation failed. Missing one or more required IDs for blocking.";
        console.error(errorMessage, { scammerUserID, groupID, fb_dtsg, adminUserId });
        return Promise.reject(errorMessage);
    }

    // --- Primary Strategy: Try Aggressive Block First, then Fallback to Simple Block ---
    // This handles cases where the target is a Facebook Page, which cannot have "future accounts" blocked.
    return performBlockRequest(true)
        .then(response => {
            if (!response.ok) {
                // Try to get more info from the response body before throwing.
                return response.text().then(text => { throw new Error(`HTTP error! status: ${response.status} - ${text.substring(0, 100)}`); });
            }
            return response.text();
        })
        .then(text => {
            // Facebook's JSON responses are often prefixed with this string, which needs to be removed.
            const jsonPrefix = 'for (;;);';
            let jsonData = {};
            try {
                jsonData = JSON.parse(text.startsWith(jsonPrefix) ? text.substring(jsonPrefix.length) : text);
            } catch (e) {
                console.error("FSA (Injected): Failed to parse JSON response.", e, text.substring(0, 500));
                throw new Error("Failed to parse server response.");
            }

            console.log("FSA (Injected): Parsed response from AGGRESSIVE block:", jsonData);

            const isSuccess = jsonData.data?.group_block_user && !jsonData.errors;
            // A "retryable" error is one where Facebook rejects the aggressive flags (e.g., for a Page).
            const isRetryableError = (jsonData.data?.group_block_user === null && jsonData.errors) || jsonData.errors?.some(e => e.message?.includes('field_exception') || e.code === 1357006);

            if (isSuccess) {
                console.log("FSA (Injected): Aggressive block successful.");
                return { success: true, responseData: jsonData };
            }

            if (!isRetryableError) {
                console.error("FSA (Injected): Aggressive block failed with a non-retryable error.");
                throw new Error(jsonData.errors?.[0]?.message || "Aggressive block failed.");
            }

            // --- Fallback Step: Retry with a Simple Block ---
            console.warn("FSA (Injected): Aggressive block failed, likely due to flags (e.g., for a Page). Retrying with a simple block.");
            return performBlockRequest(false)
                .then(retryResponse => {
                    if (!retryResponse.ok) {
                         return retryResponse.text().then(text => { throw new Error(`HTTP error on RETRY! status: ${retryResponse.status} - ${text.substring(0, 100)}`); });
                    }
                    return retryResponse.text();
                })
                .then(retryText => {
                     let retryJsonData = {};
                      try {
                         retryJsonData = JSON.parse(retryText.startsWith(jsonPrefix) ? retryText.substring(jsonPrefix.length) : retryText);
                      } catch (e) {
                         console.error("FSA (Injected): Failed to parse JSON on retry.", e, retryText.substring(0, 500));
                         throw new Error("Failed to parse server response on retry.");
                      }

                     console.log("FSA (Injected): Parsed response from SIMPLE block retry:", retryJsonData);

                     if (retryJsonData.data?.group_block_user && !retryJsonData.errors) {
                         console.log("FSA (Injected): Simple block retry successful.");
                         return { success: true, responseData: retryJsonData, retried: true };
                     } else {
                         console.error("FSA (Injected): Simple block retry also failed.");
                         throw new Error(retryJsonData.errors?.[0]?.message || "Simple block retry failed.");
                     }
                });
        })
        .then(({ success, responseData, retried = false }) => {
            // --- Final Success Handler ---
            // This block runs after either the aggressive or simple block succeeds.
            console.log(`FSA (Injected): Block process finished. Success: ${success}. Retried: ${retried}`);
            chrome.runtime.sendMessage({
                action: 'blockResult',
                success: true,
                groupId: groupID,
                userId: scammerUserID,
                error: null,
                responseData: responseData
            }).catch(e => console.error("FSA (Injected): Error sending success message:", e));
        })
        .catch(error => {
            // --- Final Catch-All Error Handler ---
            // This catches errors from validation, network issues, or failed block attempts.
            console.error('FSA (Injected): Error during block process:', error);
            chrome.runtime.sendMessage({
                action: 'blockResult',
                success: false,
                groupId: groupID,
                userId: scammerUserID,
                error: error.message || "Unknown fetch error"
            }).catch(e => console.error("FSA (Injected): Error sending final failure message:", e));
        });
}
// --- End of Injectable Function ---
// --- END OF FILE graphQLBlocker.js ---