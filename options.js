// --- START OF FILE options.js ---
document.addEventListener('DOMContentLoaded', function() {
  const groupForm = document.getElementById('groupForm');
  const groupTable = document.getElementById('groupTable');
  const addRowButton = document.getElementById('addRowButton');
  const saveButton = document.getElementById('saveButton');
  
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const importFileInput = document.getElementById('importFile');
  
  let groupTableBody = groupTable.querySelector('tbody');
  if (!groupTableBody) {
       groupTableBody = document.createElement('tbody');
       groupTable.appendChild(groupTableBody);
  }

  let sortableInstance = null;
  let currentGroups = []; // Keep track of currently loaded groups

  // --- Function to update row style based on role and validity ---
  function updateRowStyle(rowElement) {
      const roleSelect = rowElement.querySelector('.roleSelect');
      const nameInput = rowElement.querySelector('.nameInput');
      const groupIDInput = rowElement.querySelector('.groupIDInput');

      rowElement.classList.remove('admin-row', 'moderator-row', 'invalid-row');

      let isValid = true;
      if (!nameInput?.value?.trim() || !groupIDInput?.value?.trim()) {
          isValid = false;
      } else if (!/^\d+$/.test(groupIDInput.value.trim())) {
          isValid = false;
      }

      if (!isValid) {
          rowElement.classList.add('invalid-row');
      } else if (roleSelect) {
          if (roleSelect.value === 'moderator') {
              rowElement.classList.add('moderator-row');
          } else {
              rowElement.classList.add('admin-row');
          }
      }
  }

   // --- Function to RELOAD the entire table from an array ---
  // Useful after import or initial load
  function reloadTableFromArray(groupsArray) {
      groupTableBody.innerHTML = ''; // Clear existing rows
      currentGroups = groupsArray || []; // Update the tracked array
      if (currentGroups.length > 0) {
          currentGroups.forEach(group => {
            const effectiveChecked = (group.role === 'moderator') ? false : (typeof group.checked === 'boolean' ? group.checked : true);
            addGroupRow(
              group.groupName || '',
              group.groupNName || '',
              group.groupID || '',
              group.groupURL || '',
              effectiveChecked,
              group.role || 'admin'
            );
          });
          groupTableBody.querySelectorAll('tr').forEach(updateRowStyle); // Update styles for all rows
      }
      initializeSortable(); // Re-initialize sortable after table reload
      console.log(`Table reloaded with ${currentGroups.length} groups.`);
  }

  // --- Load saved group settings ---
  function loadGroups() {
      chrome.storage.sync.get('groups', function(data) {
          if (chrome.runtime.lastError) {
              console.error("Error loading groups:", chrome.runtime.lastError);
              alert("Error loading settings: " + chrome.runtime.lastError.message);
              reloadTableFromArray([]); // Load empty on error
              return;
          }
          console.log("Loaded groups:", data.groups);
          reloadTableFromArray(data.groups); // Use the reload function
      });
  }

  // Initial Load
  loadGroups();
  
  // --- Event listener for adding a new group row ---
  addRowButton.addEventListener('click', function() {
    addGroupRow('', '', '', '', true, 'admin'); // New rows default to Admin, checked=true
    saveButton.classList.add('yellow');
  });

  // --- Event listener for form submission (saving the settings) ---
  groupForm.addEventListener('submit', function(event) {
    event.preventDefault();
    try {
       saveGroupSettings();
    } catch (error) {
       console.error("Error during save process:", error);
       alert("An error occurred while trying to save. Please check console for details.");
    }
  });

  // --- Function to save settings ---
  function saveGroupSettings() {
    console.log("Saving settings...");
    const groupsToSave = []; 
    const rows = groupTableBody.querySelectorAll('tr');
    let validationFailedOverall = false;

    console.log(`Found ${rows.length} rows in tbody to process.`);

    rows.forEach((row, index) => {
        console.log(`Processing row ${index}`);
        const includeCheckbox = row.querySelector('.includeCheckbox');
        const nameInput = row.querySelector('.nameInput');
        const nicknameInput = row.querySelector('.nicknameInput');
        const groupIDInput = row.querySelector('.groupIDInput');
        const groupURLInput = row.querySelector('.groupURLInput');
        const roleSelect = row.querySelector('.roleSelect');
        // ... validation checks ...
        if (!includeCheckbox || !nameInput || !groupIDInput || !roleSelect) {
            console.error(`Row ${index} is missing required input elements. Skipping.`);
            updateRowStyle(row); // Mark visually by calling updateRowStyle
            validationFailedOverall = true;
            return;
        }

        let rowIsValid = true;
        if (!nameInput.value.trim() || !groupIDInput.value.trim()) {
            console.warn(`Row ${index} is missing Group Name or Group ID.`);
            rowIsValid = false;
        } else if (!/^\d+$/.test(groupIDInput.value.trim())) {
             console.warn(`Row ${index} has invalid Group ID format (must be numbers only).`);
             rowIsValid = false;
        }

        updateRowStyle(row); // Update style based on current validity and role

        if (!rowIsValid) {
             validationFailedOverall = true;
             // return; // Optionally skip adding invalid rows to the save data
        }

        // Save the actual checked state from the checkbox (will be false if disabled)
        const group = {
            groupName: nameInput.value.trim(),
            groupNName: nicknameInput.value.trim(),
            groupID: groupIDInput.value.trim(),
            groupURL: groupURLInput.value.trim(),
            checked: includeCheckbox.checked,
            role: roleSelect.value
        };
        groupsToSave.push(group);
        console.log(`Row ${index} data:`, group);
    });

    if (validationFailedOverall) {
         alert("Some rows have missing or invalid data (highlighted in red). Please correct them before saving.");
         // return; // Uncomment to prevent saving if any row is invalid
    }

    console.log("Final groups array to save:", groupsToSave);

     chrome.storage.sync.set({ groups: groupsToSave }, function() {
      if (chrome.runtime.lastError) {
          console.error("Error saving groups:", chrome.runtime.lastError);
          alert('Error saving settings: ' + chrome.runtime.lastError.message);
      } else {
          console.log("Settings saved successfully!");
          currentGroups = groupsToSave; // --- UPDATE local state AFTER successful save ---
          alert('Settings saved successfully!');
          saveButton.classList.remove('yellow');
          ///groupTableBody.querySelectorAll('tr').forEach(updateRowStyle); // Ensure styles reflect saved state
          chrome.runtime.sendMessage({ action: 'refreshPopup' }).catch(e => {});
      }
    });
  }


  // --- Function to add a new group row dynamically ---
function addGroupRow(groupName, groupNName, groupID, groupURL, initialCheckedState, role) {
    const newRow = document.createElement('tr');
    const isModerator = role === 'moderator';
    // Determine the ACTUAL checked state based on BOTH role and stored value
    const actualCheckedState = !isModerator && initialCheckedState;
    const isDisabled = isModerator; // Checkbox is disabled if Moderator

    // Use textContent for the status display based on the actual state
    const statusText = actualCheckedState ? 'Included' : 'Excluded';

    // Use the actual state to determine if the 'checked' attribute should be present
    const checkedAttribute = actualCheckedState ? 'checked' : '';
    const disabledAttribute = isDisabled ? 'disabled' : '';

    newRow.innerHTML = `
      <td class="drag-handle" style="cursor: move; text-align: center; vertical-align: middle;" title="Drag to reorder">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16" style="vertical-align: middle;">
            <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
          </svg>
      </td>
      <td class="includeStatus">${statusText}</td>
      <td class="includeCheckboxCell"><input type="checkbox" class="includeCheckbox" ${checkedAttribute} ${disabledAttribute}></td>
      <td><input type="text" class="nameInput" value="${groupName || ''}" required placeholder="Group Name"></td>
      <td><input type="text" class="nicknameInput" value="${groupNName || ''}" placeholder="Nickname (Optional)"></td>
      <td><input type="text" class="groupIDInput" value="${groupID || ''}" required pattern="\\d+" title="Must be numbers only" placeholder="Group ID (Numbers only)"></td>
      <td> <!-- Role Dropdown Cell -->
          <select class="roleSelect" title="Your role in this group">
              <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderator</option>
          </select>
      </td>
      <td><input type="text" class="groupURLInput" value="${groupURL || ''}" placeholder="Group URL (Optional)"></td>
      <td class="deleteRow"><button type="button" class="deleteButton">Delete</button></td>
    `;

    // Ensure the rest of the function (event listeners) remains the same
    groupTableBody.appendChild(newRow);
    updateRowStyle(newRow); // Set initial style

    // --- Event Listeners for the new row ---
    const includeCheckbox = newRow.querySelector('.includeCheckbox');
    const includeStatus = newRow.querySelector('.includeStatus');
    const deleteButton = newRow.querySelector('.deleteButton');
    const roleSelect = newRow.querySelector('.roleSelect');
    const inputs = newRow.querySelectorAll('input[type="text"], input[type="checkbox"], select');

    includeCheckbox.addEventListener('change', function() {
        includeStatus.textContent = this.checked ? 'Included' : 'Excluded';
        saveButton.classList.add('yellow');
    });

    deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this group row?')) { // Added confirmation
            newRow.remove();
            saveButton.classList.add('yellow');
        }
    });

    roleSelect.addEventListener('change', function() {
        saveButton.classList.add('yellow');
        const isMod = this.value === 'moderator';
        const currentIncludeCheckbox = newRow.querySelector('.includeCheckbox');
        const currentIncludeStatus = newRow.querySelector('.includeStatus');

        currentIncludeCheckbox.disabled = isMod;
        if (isMod) {
            currentIncludeCheckbox.checked = false; // Force uncheck if mod
        }
        // Update status text based on the *current* checked state
        currentIncludeStatus.textContent = currentIncludeCheckbox.checked ? 'Included' : 'Excluded';
        updateRowStyle(newRow); // Update background color/invalid state
    });

    inputs.forEach(input => {
        const revalidateStyle = () => {
             updateRowStyle(newRow);
        };
        const markUnsaved = () => {
            saveButton.classList.add('yellow');
            revalidateStyle(); // Also revalidate on change
        };

        // Use 'input' for text fields for immediate feedback, 'change' for select/checkbox
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
             input.addEventListener('input', markUnsaved);
        } else {
             input.addEventListener('change', markUnsaved);
        }
        // Initial validation style check
        // revalidateStyle(); // Already called after appending row
    });
}

   // --- Initialize SortableJS ---
   function initializeSortable() {
       if (sortableInstance) {
           sortableInstance.destroy();
           sortableInstance = null;
           console.log("Previous SortableJS instance destroyed.");
       }

       if (typeof Sortable !== 'undefined' && groupTableBody) {
           sortableInstance = new Sortable(groupTableBody, {
               animation: 150,
               handle: '.drag-handle',
               ghostClass: 'sortable-ghost',
               chosenClass: 'sortable-chosen',
               dragClass: 'sortable-drag',
                onEnd: function(evt) {
                   saveButton.classList.add('yellow');
                   console.log("SortableJS drag ended.");
                   // Update styles based on new order
                   groupTableBody.querySelectorAll('tr').forEach(updateRowStyle);
               }
           });
           console.log("SortableJS initialized on tbody.");
       } else {
           if (typeof Sortable === 'undefined') {
                console.error("SortableJS library not found. Drag-and-drop reordering will not work.");
           }
           if (!groupTableBody) {
               console.error("Cannot initialize SortableJS: tbody element not found.");
           }
       }
   }


  // --- NEW Export Functionality ---
  exportButton.addEventListener('click', function() {
      // Use the currentGroups array which should reflect the latest saved state
      // Or fetch fresh from storage to be absolutely sure
      chrome.storage.sync.get('groups', function(data) {
          if (chrome.runtime.lastError || !data.groups) {
              alert('Could not load groups to export. Please save first.');
              console.error("Export Error:", chrome.runtime.lastError || "No groups data found");
              return;
          }

          const groupsToExport = data.groups;
          if (!Array.isArray(groupsToExport)) {
               alert('Stored group data is invalid. Cannot export.');
               console.error("Export Error: Stored data is not an array.");
               return;
          }

          if (groupsToExport.length === 0) {
              alert("There are no groups configured to export.");
              return;
          }

          try {
              const jsonString = JSON.stringify(groupsToExport, null, 2); // Pretty print JSON
              const blob = new Blob([jsonString], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
              link.href = url;
              link.download = `fsa_groups_backup_${timestamp}.json`; // Suggest filename
              document.body.appendChild(link); // Required for Firefox
              link.click();
              document.body.removeChild(link); // Clean up
              URL.revokeObjectURL(url); // Clean up blob URL
              console.log("Export successful.");
          } catch (error) {
              console.error("Error during export process:", error);
              alert("An error occurred during export. Check console for details.");
          }
      });
  }); // --- End Export ---


  // --- NEW Import Functionality ---
  importButton.addEventListener('click', function() {
      // Trigger the hidden file input
      importFileInput.click();
  });

  importFileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) {
          console.log("No file selected for import.");
          return;
      }

      console.log(`Importing file: ${file.name}`);
      const reader = new FileReader();

      reader.onload = function(e) {
          let importedGroups;
          try {
              importedGroups = JSON.parse(e.target.result);
              console.log("Parsed imported data:", importedGroups);

              if (!Array.isArray(importedGroups)) {
                  throw new Error("Imported file does not contain a valid group array.");
              }

              // Basic validation of imported objects (check for essential keys)
              const isValidStructure = importedGroups.every(item =>
                  typeof item === 'object' && item !== null && 'groupID' in item && 'groupName' in item && 'role' in item
              );
              if (!isValidStructure) {
                  throw new Error("Imported data contains objects missing required keys (groupID, groupName, role).");
              }

          } catch (error) {
              console.error("Error parsing or validating import file:", error);
              alert(`Import failed: ${error.message}`);
              importFileInput.value = ''; // Reset file input
              return;
          }

          // Merge imported groups with current groups (skip duplicates by groupID)
          chrome.storage.sync.get('groups', function(data) {
              if (chrome.runtime.lastError) {
                  alert("Could not load current groups to merge import data.");
                  console.error("Import merge error:", chrome.runtime.lastError);
                  importFileInput.value = ''; // Reset file input
                  return;
              }

              const existingGroups = data.groups || [];
              const existingGroupIDs = new Set(existingGroups.map(g => g.groupID));
              let addedCount = 0;
              let skippedCount = 0;

              importedGroups.forEach(importedGroup => {
                  // Normalize imported data slightly (trim strings, ensure boolean 'checked')
                  const cleanGroup = {
                      groupName: (importedGroup.groupName || '').trim(),
                      groupNName: (importedGroup.groupNName || '').trim(),
                      groupID: (importedGroup.groupID || '').trim(),
                      groupURL: (importedGroup.groupURL || '').trim(),
                      // Re-apply logic: moderator is always unchecked
                      checked: importedGroup.role !== 'moderator' && (typeof importedGroup.checked === 'boolean' ? importedGroup.checked : true),
                      role: importedGroup.role === 'moderator' ? 'moderator' : 'admin' // Default to admin if role invalid
                  };

                  // Skip if invalid GroupID or already exists
                  if (!cleanGroup.groupID || !/^\d+$/.test(cleanGroup.groupID) || existingGroupIDs.has(cleanGroup.groupID)) {
                      skippedCount++;
                  } else {
                      existingGroups.push(cleanGroup);
                      existingGroupIDs.add(cleanGroup.groupID); // Add to set to prevent duplicates within the import file itself
                      addedCount++;
                  }
              });

              console.log(`Import merge results: Added ${addedCount}, Skipped ${skippedCount}`);

              // Save the merged list
              chrome.storage.sync.set({ groups: existingGroups }, function() {
                  if (chrome.runtime.lastError) {
                      alert('Error saving imported groups: ' + chrome.runtime.lastError.message);
                  } else {
                      alert(`Import successful!\nAdded: ${addedCount} group(s)\nSkipped: ${skippedCount} duplicate/invalid group(s)`);
                      saveButton.classList.remove('yellow'); // Import implies save
                      loadGroups(); // Reload the table UI from storage
                      chrome.runtime.sendMessage({ action: 'refreshPopup' }).catch(e => {});
                  }
                  importFileInput.value = ''; // Reset file input regardless of save success/fail
              });
          });

      }; // End reader.onload

      reader.onerror = function(e) {
           console.error("Error reading import file:", e);
           alert("Error reading the selected file.");
           importFileInput.value = ''; // Reset file input
      };

      reader.readAsText(file); // Read the file
  }); // --- End Import ---


}); // End DOMContentLoaded
// --- END OF FILE options.js ---