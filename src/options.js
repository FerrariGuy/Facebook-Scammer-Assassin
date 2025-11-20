// --- START OF FILE options.js ---

function localizeHtmlPage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const messageKey = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(messageKey);
        if (message) element.textContent = message;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    

    localizeHtmlPage();

    const groupForm = document.getElementById('groupForm');
    const groupTable = document.getElementById('groupTable');
    const addRowButton = document.getElementById('addRowButton');
    const saveButton = document.getElementById('saveButton');
    const visibleSaveButton = document.getElementById('visibleSaveButton');
    const exportButton = document.getElementById('exportButton');
    const importButton = document.getElementById('importButton');
    const importFileInput = document.getElementById('importFile');
    let groupTableBody = groupTable.querySelector('tbody');
    let sortableInstance = null;

    function updateRowStyle(rowElement) {
        rowElement.classList.remove('admin-row', 'moderator-row', 'invalid-row');
        const nameInput = rowElement.querySelector('.nameInput');
        const groupIDInput = rowElement.querySelector('.groupIDInput');
        if (!nameInput?.value?.trim() || !groupIDInput?.value?.trim() || !/^\d+$/.test(groupIDInput.value.trim())) {
            rowElement.classList.add('invalid-row');
        } else if (rowElement.querySelector('.roleSelect')?.value === 'moderator') {
            rowElement.classList.add('moderator-row');
        } else {
            rowElement.classList.add('admin-row');
        }
    }

    function reloadTableFromArray(groupsArray) {
        groupTableBody.innerHTML = '';
        (groupsArray || []).forEach(group => {
            const checked = typeof group.checked === 'boolean' ? group.checked : true;
            addGroupRow(group.groupName, group.groupNName, group.groupID, group.groupURL, checked, group.role);
        });
        initializeSortable();
    }

    function loadGroups() {
        chrome.storage.sync.get({ groups: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error("FSA (Options): Error loading groups:", chrome.runtime.lastError);
            } else {
                reloadTableFromArray(data.groups);
            }
        });
    }

    visibleSaveButton.addEventListener('click', () => saveButton.click());
    new MutationObserver(() => {
        visibleSaveButton.classList.toggle('yellow', saveButton.classList.contains('yellow'));
    }).observe(saveButton, { attributes: true, attributeFilter: ['class'] });

    addRowButton.addEventListener('click', () => {
        addGroupRow('', '', '', '', true, 'admin');
        saveButton.classList.add('yellow');
    });

    loadGroups();

    groupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        saveGroupSettings();
    });

    function saveGroupSettings() {
        const groupsToSave = [];
        let isInvalid = false;
        groupTableBody.querySelectorAll('tr').forEach(row => {
            const nameInput = row.querySelector('.nameInput');
            const groupIDInput = row.querySelector('.groupIDInput');
            if (!nameInput.value.trim() || !groupIDInput.value.trim() || !/^\d+$/.test(groupIDInput.value.trim())) {
                isInvalid = true;
            }
            updateRowStyle(row);
            groupsToSave.push({
                groupName: nameInput.value.trim(),
                groupNName: row.querySelector('.nicknameInput').value.trim(),
                groupID: groupIDInput.value.trim(),
                groupURL: row.querySelector('.groupURLInput').value.trim(),
                checked: row.querySelector('.includeCheckbox').checked,
                role: row.querySelector('.roleSelect').value
            });
        });

        if (isInvalid) {
            alert(chrome.i18n.getMessage("alertInvalidRows"));
            return;
        }

        chrome.storage.sync.set({ groups: groupsToSave }, () => {
            if (!chrome.runtime.lastError) saveButton.classList.remove('yellow');
        });
    }

    function addGroupRow(groupName = '', groupNName = '', groupID = '', groupURL = '', checked = true, role = 'admin') {
        const newRow = document.createElement('tr');
        const statusText = checked ? chrome.i18n.getMessage("statusIncluded") : chrome.i18n.getMessage("statusExcluded");
        // ** FIXED **
        newRow.innerHTML = `
            <td class="drag-handle" title="Drag to reorder">::</td>
            <td class="includeStatus">${statusText}</td>
            <td class="includeCheckboxCell"><input type="checkbox" class="includeCheckbox" ${checked ? 'checked' : ''}></td>
            <td><input type="text" class="nameInput" value="${groupName}" placeholder="${chrome.i18n.getMessage('thGroupName')}"></td>
            <td><input type="text" class="nicknameInput" value="${groupNName}" placeholder="${chrome.i18n.getMessage('thNickname')} (Optional)"></td>
            <td><input type="text" class="groupIDInput" value="${groupID}" pattern="\\d+" title="Must be numbers only" placeholder="${chrome.i18n.getMessage('thGroupID')}"></td>
            <td>
                <select class="roleSelect">
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>${chrome.i18n.getMessage('roleAdmin')}</option>
                    <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>${chrome.i18n.getMessage('roleModerator')}</option>
                </select>
            </td>
            <td><input type="text" class="groupURLInput" value="${groupURL}" placeholder="${chrome.i18n.getMessage('thGroupURL')} (Optional)"></td>
            <td class="deleteRow"><button type="button" class="deleteButton">${chrome.i18n.getMessage('deleteButtonText')}</button></td>
        `;
        groupTableBody.appendChild(newRow);
        updateRowStyle(newRow);

        const markUnsaved = () => { saveButton.classList.add('yellow'); updateRowStyle(newRow); };
        newRow.querySelector('.includeCheckbox').addEventListener('change', function() {
            newRow.querySelector('.includeStatus').textContent = this.checked ? chrome.i18n.getMessage("statusIncluded") : chrome.i18n.getMessage("statusExcluded");
            markUnsaved();
        });
        newRow.querySelector('.deleteButton').addEventListener('click', () => {
            if (confirm(chrome.i18n.getMessage("alertConfirmDelete"))) { newRow.remove(); markUnsaved(); }
        });
        newRow.querySelectorAll('input, select').forEach(input => input.addEventListener('input', markUnsaved));
    }

    function initializeSortable() {
        if (sortableInstance) sortableInstance.destroy();
        if (typeof Sortable !== 'undefined') {
            sortableInstance = new Sortable(groupTableBody, { animation: 150, handle: '.drag-handle', onEnd: () => saveButton.classList.add('yellow') });
        }
    }

    // ** FIXED **
    exportButton.addEventListener('click', () => {
        chrome.storage.sync.get({ groups: [] }, (data) => {
            if (!data.groups.length) { alert('No groups to export.'); return; }
            const jsonString = JSON.stringify(data.groups, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fsa_groups_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    importButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            let importedGroups;
            try {
                importedGroups = JSON.parse(e.target.result);
                if (!Array.isArray(importedGroups)) throw new Error("Invalid format");
            } catch (error) { alert(`Import failed: ${error.message}`); return; }
            chrome.storage.sync.get({ groups: [] }, (data) => {
                const existingGroupIDs = new Set(data.groups.map(g => g.groupID));
                let addedCount = 0, skippedCount = 0;
                importedGroups.forEach(group => {
                    if (group.groupID && !existingGroupIDs.has(group.groupID)) {
                        data.groups.push(group); addedCount++;
                    } else { skippedCount++; }
                });
                alert(chrome.i18n.getMessage("alertImportSuccess", [addedCount, skippedCount]));
                chrome.storage.sync.set({ groups: data.groups }, loadGroups);
            });
        };
        reader.readAsText(file);
    });
});
// --- END OF FILE options.js ---