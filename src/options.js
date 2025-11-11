// --- START OF FILE options.js ---
document.addEventListener('DOMContentLoaded', function() {
  const groupForm = document.getElementById('groupForm');
  const groupTable = document.getElementById('groupTable');
  const addRowButton = document.getElementById('addRowButton');
  const saveButton = document.getElementById('saveButton');
  const visibleSaveButton = document.getElementById('visibleSaveButton'); // Visible button (type="button")

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
  function reloadTableFromArray(groupsArray) {
      groupTableBody.innerHTML = ''; // Clear existing rows
      currentGroups = groupsArray || []; // Update the tracked array
      if (currentGroups.length > 0) {
          currentGroups.forEach(group => {
            const effectiveChecked = typeof group.checked === 'boolean' ? group.checked : true;
            addGroupRow(
              group.groupName || '',
              group.groupNName || '',
              group.groupID || '',
              group.groupURL || '',
              effectiveChecked,
              group.role || 'admin'
            );
          });
          groupTableBody.querySelectorAll('tr').forEach(updateRowStyle);
      }
      initializeSortable();
      console.log(`FSA (Options): Table reloaded with ${currentGroups.length} groups.`);
  }

  // --- Load saved group settings ---
  function loadGroups() {
      chrome.storage.sync.get('groups', function(data) {
          if (chrome.runtime.lastError) {
              console.error("FSA (Options): Error loading groups:", chrome.runtime.lastError);
              alert("Error loading settings: " + chrome.runtime.lastError.message);
              reloadTableFromArray([]);
              return;
          }
          console.log("FSA (Options): Loaded groups:", data.groups);
          reloadTableFromArray(data.groups);
      });
  }

    // Link the visible save button to the hidden form submit button
    if (visibleSaveButton && saveButton) {
        visibleSaveButton.addEventListener('click', function() {
            console.log("FSA (Options): Visible Save Button clicked, triggering hidden button click.");
            saveButton.click();
        });

        // Mirror the 'yellow' (unsaved changes) class from the hidden button to the visible one
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    if (saveButton.classList.contains('yellow')) {
                        visibleSaveButton.classList.add('yellow');
                    } else {
                        visibleSaveButton.classList.remove('yellow');
                    }
                }
            });
        });
        observer.observe(saveButton, { attributes: true });

        // Apply initial state
        if (saveButton.classList.contains('yellow')) {
            visibleSaveButton.classList.add('yellow');
        }

    } else {
        console.error("FSA (Options): Critical error - Could not find #saveButton or #visibleSaveButton elements!");
    }

    // --- Event listener for adding a new row ---
    if (addRowButton && saveButton) {
         addRowButton.addEventListener('click', () => {
             addGroupRow('', '', '', '', true, 'admin');
             console.log("FSA (Options): Add Row button clicked, marking save button yellow.");
             saveButton.classList.add('yellow'); // Mark changes as unsaved
         });
     }

  // Initial Load
  loadGroups();

  // --- Event listener for form submission (saving the settings) ---
  groupForm.addEventListener('submit', function(event) {
    event.preventDefault();
    try {
       saveGroupSettings();
    } catch (error) {
       console.error("FSA (Options): Error during save process:", error);
       alert("An error occurred while trying to save. Please check console for details.");
    }
  });

  // --- Function to save settings ---
  function saveGroupSettings() {
    console.log("FSA (Options): Saving settings...");
    const groupsToSave = [];
    const rows = groupTableBody.querySelectorAll('tr');
    let validationFailedOverall = false;

    rows.forEach((row, index) => {
        const includeCheckbox = row.querySelector('.includeCheckbox');
        const nameInput = row.querySelector('.nameInput');
        const nicknameInput = row.querySelector('.nicknameInput');
        const groupIDInput = row.querySelector('.groupIDInput');
        const groupURLInput = row.querySelector('.groupURLInput');
        const roleSelect = row.querySelector('.roleSelect');

        if (!includeCheckbox || !nameInput || !groupIDInput || !roleSelect) {
            console.error(`FSA (Options): Row ${index} is missing required input elements. Skipping.`);
            validationFailedOverall = true; return;
        }

        let rowIsValid = !(!nameInput.value.trim() || !groupIDInput.value.trim() || !/^\d+$/.test(groupIDInput.value.trim()));
        updateRowStyle(row); // Update style based on current validity

        if (!rowIsValid) {
             validationFailedOverall = true;
        }

        const group = {
            groupName: nameInput.value.trim(),
            groupNName: nicknameInput.value.trim(),
            groupID: groupIDInput.value.trim(),
            groupURL: groupURLInput.value.trim(),
            checked: includeCheckbox.checked,
            role: roleSelect.value
        };
        groupsToSave.push(group);
    });

    if (validationFailedOverall) {
         alert("Some rows have missing or invalid data (highlighted in red). Please correct them before saving.");
         return; // Prevent saving if any row is invalid
    }

    console.log("FSA (Options): Final groups array to save:", groupsToSave);

     chrome.storage.sync.set({ groups: groupsToSave }, function() {
      if (chrome.runtime.lastError) {
          console.error("FSA (Options): Error saving groups:", chrome.runtime.lastError);
          alert('Error saving settings: ' + chrome.runtime.lastError.message);
      } else {
          console.log("FSA (Options): Settings saved successfully!");
          currentGroups = groupsToSave;
          saveButton.classList.remove('yellow');
          chrome.runtime.sendMessage({ action: 'refreshPopup' }).catch(e => {});
      }
    });
  }


  // --- Function to add a new group row dynamically ---
function addGroupRow(groupName, groupNName, groupID, groupURL, initialCheckedState, role) {
    const newRow = document.createElement('tr');
    const actualCheckedState = typeof initialCheckedState === 'boolean' ? initialCheckedState : true;
    const statusText = actualCheckedState ? 'Included' : 'Excluded';
    const checkedAttribute = actualCheckedState ? 'checked' : '';

    newRow.innerHTML = `
      <td class="drag-handle" title="Drag to reorder">::</td>
      <td class="includeStatus">${statusText}</td>
      <td class="includeCheckboxCell"><input type="checkbox" class="includeCheckbox" ${checkedAttribute}></td>
      <td><input type="text" class="nameInput" value="${groupName || ''}" required placeholder="Group Name"></td>
      <td><input type="text" class="nicknameInput" value="${groupNName || ''}" placeholder="Nickname (Optional)"></td>
      <td><input type="text" class="groupIDInput" value="${groupID || ''}" required pattern="\\d+" title="Must be numbers only" placeholder="Group ID (Numbers only)"></td>
      <td>
          <select class="roleSelect" title="Your role in this group">
              <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderator</option>
          </select>
      </td>
      <td><input type="text" class="groupURLInput" value="${groupURL || ''}" placeholder="Group URL (Optional)"></td>
      <td class="deleteRow"><button type="button" class="deleteButton">Delete</button></td>
    `;

    groupTableBody.appendChild(newRow);
    updateRowStyle(newRow); // Set initial style

    // --- Event Listeners for the new row ---
    const includeCheckbox = newRow.querySelector('.includeCheckbox');
    const includeStatus = newRow.querySelector('.includeStatus');
    const deleteButton = newRow.querySelector('.deleteButton');
    const roleSelect = newRow.querySelector('.roleSelect');
    const inputs = newRow.querySelectorAll('input[type="text"], input[type="checkbox"], select');

    const markUnsaved = () => {
        saveButton.classList.add('yellow');
        updateRowStyle(newRow);
    };

    includeCheckbox.addEventListener('change', function() {
        includeStatus.textContent = this.checked ? 'Included' : 'Excluded';
        markUnsaved();
    });

    deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this group row?')) {
            newRow.remove();
            markUnsaved();
        }
    });

    roleSelect.addEventListener('change', () => {
        markUnsaved();
    });

    inputs.forEach(input => {
        // Use 'input' for text fields for immediate feedback, 'change' for others
        const eventType = (input.type === 'text' || input.tagName === 'TEXTAREA') ? 'input' : 'change';
        if (input !== includeCheckbox && input !== roleSelect) { // Avoid double-adding listeners
             input.addEventListener(eventType, markUnsaved);
        }
    });
}

   // --- Initialize SortableJS for drag-and-drop reordering ---
   function initializeSortable() {
       if (sortableInstance) sortableInstance.destroy();

       if (typeof Sortable !== 'undefined' && groupTableBody) {
           sortableInstance = new Sortable(groupTableBody, {
               animation: 150,
               handle: '.drag-handle',
               onEnd: function(evt) {
                   saveButton.classList.add('yellow');
                   console.log("FSA (Options): Row reordered, marking unsaved.");
               }
           });
           console.log("FSA (Options): SortableJS initialized.");
       } else {
           console.error("FSA (Options): SortableJS library not found or tbody is missing.");
       }
   }


  // --- Export Functionality ---
  exportButton.addEventListener('click', function() {
      chrome.storage.sync.get('groups', function(data) {
          if (chrome.runtime.lastError || !data.groups || data.groups.length === 0) {
              alert('Could not load groups to export or no groups are configured.');
              console.error("FSA (Options): Export Error:", chrome.runtime.lastError || "No groups data found");
              return;
          }
          try {
              const jsonString = JSON.stringify(data.groups, null, 2);
              const blob = new Blob([jsonString], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `fsa_groups_backup_${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              console.log("FSA (Options): Export successful.");
          } catch (error) {
              console.error("FSA (Options): Error during export process:", error);
              alert("An error occurred during export.");
          }
      });
  });


  // --- Import Functionality ---
  importButton.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
          let importedGroups;
          try {
              importedGroups = JSON.parse(e.target.result);
              if (!Array.isArray(importedGroups) || !importedGroups.every(item => 'groupID' in item && 'groupName' in item)) {
                  throw new Error("Imported file is not a valid group array or contains invalid objects.");
              }
          } catch (error) {
              console.error("FSA (Options): Error parsing or validating import file:", error);
              alert(`Import failed: ${error.message}`);
              importFileInput.value = '';
              return;
          }

          chrome.storage.sync.get('groups', function(data) {
              if (chrome.runtime.lastError) {
                  alert("Could not load current groups to merge import data.");
                  return;
              }
              const existingGroups = data.groups || [];
              const existingGroupIDs = new Set(existingGroups.map(g => g.groupID));
              let addedCount = 0;
              let skippedCount = 0;

              importedGroups.forEach(importedGroup => {
                  const cleanGroupID = (importedGroup.groupID || '').trim();
                  if (cleanGroupID && !existingGroupIDs.has(cleanGroupID)) {
                      existingGroups.push({
                          groupName: (importedGroup.groupName || '').trim(),
                          groupNName: (importedGroup.groupNName || '').trim(),
                          groupID: cleanGroupID,
                          groupURL: (importedGroup.groupURL || '').trim(),
                          checked: typeof importedGroup.checked === 'boolean' ? importedGroup.checked : true,
                          role: importedGroup.role === 'moderator' ? 'moderator' : 'admin'
                      });
                      existingGroupIDs.add(cleanGroupID);
                      addedCount++;
                  } else {
                      skippedCount++;
                  }
              });

              console.log(`FSA (Options): Import merge results: Added ${addedCount}, Skipped ${skippedCount}`);
              chrome.storage.sync.set({ groups: existingGroups }, function() {
                  if (chrome.runtime.lastError) {
                      alert('Error saving imported groups: ' + chrome.runtime.lastError.message);
                  } else {
                      alert(`Import successful!\nAdded: ${addedCount} group(s)\nSkipped: ${skippedCount} duplicate/invalid group(s)`);
                      saveButton.classList.remove('yellow');
                      loadGroups(); // Reload the table UI from storage
                  }
                  importFileInput.value = '';
              });
          });
      };
      reader.readAsText(file);
  });
});
// --- END OF FILE options.js ---```
