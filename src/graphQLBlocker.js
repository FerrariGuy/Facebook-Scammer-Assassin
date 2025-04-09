// --- START OF FILE graphQLBlocker.js --- 
// --- Injectable GraphQL Function ---
// NOTE: This runs in the page's context, not the extension's context.
// It cannot directly access variables from the outer scope unless passed as args.
function executeGraphQLBlock(scammerUserID, groupID, fb_dtsg, jazoest, lsd, adminUserId) {
    console.log("FSA (Injected): executeGraphQLBlock called with:",
      { scammerUserID, groupID, fb_dtsg: fb_dtsg ? '******' : 'Not Found', jazoest, lsd: lsd ? '******' : 'Not Found', adminUserId } // Mask tokens in log
    );

    // Basic validation of inputs received from the popup
    if (!scammerUserID || scammerUserID === 'Not Found' ||
        !groupID ||
        !fb_dtsg || fb_dtsg === 'Not Found' ||
       // !jazoest || // Jazoest might be less critical, allow 'Not Found' initially
       // !lsd || // Often same as fb_dtsg
        !adminUserId || adminUserId === 'Not Found') {
      const errorMsg = "FSA (Injected): Missing critical data for blocking.";
      console.error(errorMsg, { scammerUserID, groupID, fb_dtsg_found: !!fb_dtsg, jazoest_found: !!jazoest, lsd_found: !!lsd, adminUserId });
      // Send failure message back to popup
      chrome.runtime.sendMessage({
          action: 'blockResult',
          success: false,
          groupId: groupID, // Include groupID to identify the button
          userId: scammerUserID,
          error: errorMsg
      }).catch(e => console.error("FSA (Injected): Error sending message back to popup:", e));
      return Promise.reject(errorMsg); // Reject the promise returned by executeScript
    }

    const variables = {
      "groupID": groupID,
      "input": {
        "actor_id": adminUserId,
        "group_id": groupID, // Yes, often repeated
        "user_id": scammerUserID,
        "action_source": "MEMBER_LIST", // Or maybe "PROFILE_BLOCK_BUTTON"? Start with "MEMBER_LIST".
        "client_mutation_id": "1", // Can likely be static
        // --- Optional flags (can be controlled by checkboxes in options later) ---
        "should_apply_block_to_later_created_accounts": true,
        "should_delete_comments": true,
        "should_delete_posts": true
        // "should_decline_all_pending_posts": true, // Requires different permissions?
        // "should_remove_all_content_in_group": true // Potentially dangerous, use with caution
      },
      "memberID": scammerUserID, // Often repeated outside input
      "scale": 1
    };

    const bodyParams = {
       "av": adminUserId,
       "__user": adminUserId,
       "__a": "1", // Minimal necessary?
       "__req": "a", // Minimal necessary? May need 'g', 'h', etc. Requires testing. Start simple.
      // "__hs": "", // Often required but dynamic, try without first
       "dpr": window.devicePixelRatio || 1, // Get device pixel ratio
      // "__ccg": "GOOD", // Common value
      // "__rev": "", // Dynamic, try without
      // "__s": "", // Dynamic, try without
      // "__hsi": "", // Dynamic, try without
      // "__dyn": "", // Very dynamic/complex, definitely try without first
      // "__csr": "", // Dynamic, try without
       "__comet_req": "15", // Common value, test if needed
       "fb_dtsg": fb_dtsg,
       "jazoest": jazoest || '', // Send empty if not found/needed initially
       "lsd": lsd || fb_dtsg, // Use fb_dtsg as fallback for lsd
      // "__spin_r": "", // Dynamic, try without
      // "__spin_b": "trunk", // Often static
      // "__spin_t": "", // Dynamic, try without
       "fb_api_caller_class": "RelayModern", // Seems common
       "fb_api_req_friendly_name": "useGroupsCometBlockUserMutation", // Specific to the action
       "variables": JSON.stringify(variables),
       "server_timestamps": "true", // Often true
       "doc_id": "28758548190457960" // The critical ID for this specific mutation
    };

    const formData = new FormData();
    for (const key in bodyParams) {
        // Only append if the value is not explicitly undefined or null. Allow empty strings for now.
        if (bodyParams.hasOwnProperty(key) && bodyParams[key] !== undefined && bodyParams[key] !== null) {
             formData.append(key, bodyParams[key]);
        }
    }


    console.log("FSA (Injected): Sending GraphQL block request with form data:", /*formData // Can't directly log FormData contents easily*/ bodyParams); // Log the params object instead for inspection

    return fetch('/api/graphql/', { // Use relative path
      method: 'POST',
      body: formData,
      credentials: 'include', // Crucial: Include cookies for authentication
      headers: {
        // 'Content-Type' is set automatically by fetch for FormData to multipart/form-data
        'Sec-Fetch-Site': 'same-origin', // Good practice security header
         'X-FB-LSD': lsd || fb_dtsg // Required header
        // Add other minimal headers like 'Accept-Language' etc. ONLY if testing reveals they are needed
      }
    })
    .then(response => {
      console.log("FSA (Injected): Received response status:", response.status, response.statusText);
      if (!response.ok) {
        console.error("FSA (Injected): Network response was not ok.", response);
        // Attempt to get more info from the response body if possible
        return response.text().then(text => {
            console.error("FSA (Injected): Error response body:", text.substring(0, 500)); // Log beginning of error text
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`); // Include start of text
        });
      }
      // Try to parse as JSON, but handle cases where it might not be
      return response.text().then(text => {
          // Facebook often wraps JSON in a for loop for security reasons
          const jsonPrefix = 'for (;;);';
          let jsonData = null;
          let parseError = null;
          if (text.startsWith(jsonPrefix)) {
              text = text.substring(jsonPrefix.length);
          }
           try {
               jsonData = JSON.parse(text);
           } catch(e) {
               console.warn("FSA (Injected): Response was not valid JSON after potential prefix removal. Text:", text.substring(0, 500)); // Log more text
               parseError = e;
               // Even if parsing fails, check for plain text success/error indicators if FB changes format
               if (text.includes("errorSummary") || text.includes("error_msg")) { // Example check
                   throw new Error(`Facebook returned an error page/text: ${text.substring(0,150)}`);
               }
               // Assume failure if parsing fails and no clear text indicator found
                throw new Error(`Failed to parse response: ${e.message}`);
           }
          return jsonData; // Return parsed JSON
      });
    })
    .then(data => {
      console.log("FSA (Injected): Parsed GraphQL response data:", data);
      // Analyze the 'data' object structure to determine success.
      let isSuccess = false;
      let errorMessage = 'Block failed, unknown response structure.';

      if (data && data.errors && data.errors.length > 0) {
            console.error("FSA (Injected): GraphQL operation returned errors:", data.errors);
            errorMessage = data.errors[0]?.message || JSON.stringify(data.errors);
            isSuccess = false;
      } else if (data && data.data /* && check specific success field if known, e.g., data.data.group_block_member */ ) {
          console.log("FSA (Injected): Block successful (no errors found in response).");
          isSuccess = true;
      } else if (data && Object.keys(data).length === 0 && !data.errors) {
           console.log("FSA (Injected): Block successful (empty data object and no errors).");
           isSuccess = true;
      } else {
           console.warn("FSA (Injected): Block response structure unclear, assuming failure.", data);
           errorMessage = `Block response structure unclear: ${JSON.stringify(data).substring(0,100)}`;
           isSuccess = false;
      }

      // Send message back to popup
      chrome.runtime.sendMessage({
          action: 'blockResult',
          success: isSuccess,
          groupId: groupID,
          userId: scammerUserID,
          error: isSuccess ? null : errorMessage,
          responseData: data
      }).catch(e => console.error("FSA (Injected): Error sending success/failure message back:", e));

      return { success: isSuccess, error: isSuccess ? null : errorMessage };

    })
    .catch(error => {
      console.error('FSA (Injected): Error during block fetch or processing:', error);
      chrome.runtime.sendMessage({
          action: 'blockResult',
          success: false,
          groupId: groupID,
          userId: scammerUserID,
          error: error.message || "Unknown fetch error"
      }).catch(e => console.error("FSA (Injected): Error sending error message back:", e));
       return Promise.reject({ success: false, error: error.message || "Unknown fetch error" });
    });
  }
// --- End of Injectable Function ---
