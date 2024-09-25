let uploadedFiles = {}; // To store multiple CSV files
let headers = [];
let combinedData = []; // To hold data from all files combined
let editRowIndex = null; // To track if we are editing a row

// Hardcoded credentials (for demo purposes)
const validUsername = "admin";
const validPassword = "password123";

// On page load, display the login modal
document.addEventListener('DOMContentLoaded', function () {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'block'; // Show login modal

    loadFromLocalStorage(); // Load uploaded files from localStorage when page loads
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const dataTable = document.getElementById('dataTable'); 
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    // Simple login validation
    if (username === validUsername && password === validPassword) {
        // Hide login modal and show CSV manager
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('csvManager').style.display = 'block';
        displayTable(combinedData); 
        dataTable.style.display = 'none';
        // Ensure table is displayed after login
    } else {
        // Show error message
        loginError.style.display = 'block';
    }
});

// Load CSV files from localStorage
// Load CSV files and any added rows from localStorage
function loadFromLocalStorage() {
    const dataTable = document.getElementById('dataTable'); 
    const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || {};
    uploadedFiles = savedFiles;

    const savedCombinedData = JSON.parse(localStorage.getItem('combinedData')) || [];
    combinedData = savedCombinedData.length > 0 ? savedCombinedData : mergeDataFromFiles();

    if (Object.keys(uploadedFiles).length > 0 || savedCombinedData.length > 0) {
        headers = mergeHeadersFromFiles();
        updateFileList(); // Update file list in the sidebar
        updateFileSelector(); // Update file selector dropdown
        displayTable(combinedData); 
        dataTable.style.display = 'none';
        // Display all data initially
    }
}


// Save the current state of uploadedFiles to localStorage
function saveToLocalStorage() {
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    localStorage.setItem('combinedData', JSON.stringify(combinedData));
}

// Handle CSV Upload
document.getElementById('csvFileInput').addEventListener('change', function (e) {
    const dataTable = document.getElementById('dataTable'); 
    const files = e.target.files;
    Array.from(files).forEach(file => {
        Papa.parse(file, {
            complete: function (results) {
                uploadedFiles[file.name] = results.data; // Store the parsed CSV in uploadedFiles
                headers = mergeHeadersFromFiles();
                combinedData = mergeDataFromFiles();
                updateFileSelector();
                updateFileList();
                saveToLocalStorage(); // Save to localStorage after file is uploaded
                displayTable(combinedData); 
                dataTable.style.display = 'none';
                // Display all data after upload
            }
        });
    });
});

// Merge headers from all files
function mergeHeadersFromFiles() {
    let allHeaders = new Set();
    Object.values(uploadedFiles).forEach(fileData => {
        fileData[0].forEach(header => allHeaders.add(header));
    });
    return Array.from(allHeaders);
}

// Merge data from all files
// Merge data from all files and remove duplicate links per username
function mergeDataFromFiles() {
    let mergedData = [];
    const uniqueLinksMap = {}; // To track unique links per username

    Object.values(uploadedFiles).forEach(fileData => {
        for (let i = 1; i < fileData.length; i++) {
            let row = new Array(headers.length).fill('');
            const username = fileData[i][0];
            const links = fileData[i].slice(2); // Links start from the third column

            // Initialize an empty set for unique links if not already present for the username
            if (!uniqueLinksMap[username]) {
                uniqueLinksMap[username] = new Set();
            }

            // Filter out duplicate links by adding only unique links to the merged data
            const uniqueLinks = links.filter(link => {
                if (link && !uniqueLinksMap[username].has(link)) {
                    uniqueLinksMap[username].add(link); // Add the unique link to the set
                    return true;
                }
                return false; // Exclude duplicate links
            });

            // Construct the row with the username, user ID, and unique links
            row[0] = username;
            row[1] = fileData[i][1]; // Assuming user ID is in the second column
            uniqueLinks.forEach((link, index) => {
                row[index + 2] = link; // Fill the row starting from the third column
            });

            mergedData.push(row);
        }
    });

    return mergedData;
}


// Function to remove empty records
function removeEmptyRecords() {
    combinedData = combinedData.filter(row => {
        const username = row[0]?.trim(); // Username in the first column
        const userId = row[1]?.trim(); // User ID in the second column
        const links = row.slice(2).filter(link => link?.trim()); // Links start from the third column

        // Check if username, userId, or any links are present
        return username && userId && links.length > 0;
    });
}

// Call this function wherever you display the table or modify the data
// Function to display the table with data and ensure no duplicate links
function displayTable(data) {
    removeEmptyRecords(); // Remove empty records before displaying the table

    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable'); // Get the dataTable element
    tableBody.innerHTML = ''; // Clear existing contents

    if (!data || data.length === 0) {
        dataTable.style.display = 'none'; // Hide table if no data
        return; // Return if no data
    }

    // Show the table if data exists
    dataTable.style.display = 'table'; // Display the table

    const groupedData = {};

    data.forEach(row => {
        const username = row[0]; // Assuming username is in the first column
        const userId = row[1]; // Assuming user ID is in the second column
        const links = row.slice(2); // The rest are links

        // Initialize the grouped data if the username doesn't exist
        if (!groupedData[username]) {
            groupedData[username] = {
                userId: userId,
                links: new Set() // Use Set to avoid duplicate links
            };
        }

        // Add non-empty links and automatically filter out duplicates using the Set
        links.forEach(link => {
            if (link) {
                groupedData[username].links.add(link.trim()); // Trim to remove extra spaces
            }
        });
    });

    // Populate the table with grouped data
    for (const username in groupedData) {
        const userData = groupedData[username];
        const userId = userData.userId;
        const links = Array.from(userData.links); // Convert the Set back to an array

        // Create a new row for username
        const userRow = document.createElement('tr');
        const usernameCell = document.createElement('td');
        usernameCell.textContent = username;
        usernameCell.rowSpan = 2; // Span two rows for username
        userRow.appendChild(usernameCell);

        const userIdCell = document.createElement('td');
        userIdCell.textContent = userId;
        userRow.appendChild(userIdCell);
        tableBody.appendChild(userRow);

        // Create a new row for links
        const linksRow = document.createElement('tr');
        const linksCell = document.createElement('td');

        // Create columns for each link
        links.forEach((link) => {
            const linkCol = document.createElement('div');
            linkCol.style.display = 'flex'; // Flexbox for link and button alignment

            // Add link text
            const linkText = document.createElement('span');
            linkText.textContent = link;
            linkCol.appendChild(linkText);

            // Add delete button for each link
            const deleteLinkBtn = document.createElement('button');
            deleteLinkBtn.textContent = 'Delete Link';
            deleteLinkBtn.classList.add('btn-delete');
            deleteLinkBtn.style.marginLeft = '10px';
            deleteLinkBtn.onclick = function () {
                deleteLink(username, link); // Pass username and the actual link value to delete
            };

            linkCol.appendChild(deleteLinkBtn); // Append delete button to link column
            linksCell.appendChild(linkCol); // Append the column to the row
        });

        linksRow.appendChild(linksCell);
        tableBody.appendChild(linksRow);
    }
}

// Function to delete a specific link by matching the exact link
function deleteLink(username, linkToDelete) {
    // Flag to track whether any link was deleted
    let linkDeleted = false;

    // Loop through each file in the uploadedFiles object
    Object.keys(uploadedFiles).forEach(fileName => {
        const fileData = uploadedFiles[fileName];

        // Loop through each row of data in the file, starting from the second row (first row is headers)
        for (let i = 1; i < fileData.length; i++) {
            if (fileData[i][0] === username) { // If the row belongs to the specified username

                // Loop through the links in the current row (skip the first two columns: username and userId)
                for (let j = 2; j < fileData[i].length; j++) {
                    if (fileData[i][j].trim() === linkToDelete.trim()) { // Trim both for comparison
                        // If the link matches, remove it
                        fileData[i].splice(j, 1);
                        j--; // Decrement j to account for the shift in indices after splice
                        linkDeleted = true;
                    }
                }

                // If the row has only username and userId left, remove the entire row (no links left)
                if (fileData[i].length === 2) {
                    fileData.splice(i, 1);
                    i--; // Decrement i to account for the shift in indices after splice
                }
            }
        }
    });

    if (linkDeleted) {
        // After modifying the data, update the combinedData and the table
        combinedData = mergeDataFromFiles(); // Re-merge data from files
        displayTable(combinedData); // Refresh the table

        // Save the updated data back to localStorage
        saveToLocalStorage();
    } else {
        console.log("No matching link found for deletion.");
    }
}



// Function to delete the entire record (username, userId, and all links)
function deleteRecord(username) {
    // Find the user's data and remove the entire record
    Object.keys(uploadedFiles).forEach(fileName => {
        const fileData = uploadedFiles[fileName];
        // Use a filter function to create a new array without the deleted record
        const newFileData = fileData.filter(row => row[0] !== username); // Filter out rows that match the username

        // Update the uploadedFiles with the new data (without the deleted record)
        uploadedFiles[fileName] = newFileData;
    });

    // After modifying the data, update the table and save the changes
    combinedData = mergeDataFromFiles(); // Re-merge data from files
    displayTable(combinedData); // Refresh the table
    saveToLocalStorage(); // Save updated data to localStorage
}


// Search functionality
// Search functionality with enhanced username matching, trimming, and consistency improvements
document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase().trim(); // Trim any spaces from the search term
    const dataTable = document.getElementById('dataTable');
    // If the search box is empty, display all combined data
    if (searchTerm === '') {
        // displayTable(combinedData);
        dataTable.style.display = 'none';
    } else {
        dataTable.style.display = 'table';
        const matchedUsernames = new Set();

        // First pass: Identify all usernames where the search term exists in any field
        combinedData.forEach(row => {
            const username = row[0].trim(); // Assuming username is in the first column, trimming spaces
            const userId = row[1].trim(); // Assuming user ID is in the second column, trimming spaces
            const restOfFields = row.slice(2); // Rest are considered links or other data

            // Normalize all fields to ensure proper matching (avoiding undefined/null/empty values)
            const normalizedRow = [username, userId, ...restOfFields].filter(Boolean); // Filter out empty/null cells

            // Search for the term in the row (username, userId, or any other field)
            if (normalizedRow.some(field => field.toString().toLowerCase().includes(searchTerm))) {
                matchedUsernames.add(username); // If found, add the username (trimmed) to the set
            }
        });

        // Second pass: Filter all records that have usernames from the matchedUsernames set
        const filteredData = combinedData.filter(row => matchedUsernames.has(row[0].trim())); // Trim username in filter too

        // Display the filtered data (all records with matching usernames)
        displayTable(filteredData);
    }
});



// Export all data as one CSV file
document.getElementById('exportBtn').addEventListener('click', function () {
    let csvContent = headers.join(',') + '\n';
    combinedData.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'combined_data.csv';
    link.click();
});


// Update file list in the sidebar
// Update file list in the sidebar
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    Object.keys(uploadedFiles).forEach(fileName => {
        const li = document.createElement('li');
        li.textContent = fileName;

        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✖'; // Cross button
        deleteBtn.onclick = () => deleteFile(fileName); // Call deleteFile function on click

        li.appendChild(deleteBtn); // Append delete button to the list item
        fileList.appendChild(li);
    });
}

// Delete a file from uploadedFiles and localStorage
function deleteFile(fileName) {
    delete uploadedFiles[fileName]; // Remove the file from uploadedFiles
    saveToLocalStorage(); // Update localStorage
    updateFileList(); // Refresh the file list
    combinedData = mergeDataFromFiles(); // Recalculate combinedData
    displayTable(combinedData); // Refresh the table
}


// Update file selector for adding new rows
function updateFileSelector() {
    const fileSelector = document.getElementById('fileSelector');
    fileSelector.innerHTML = '';

    Object.keys(uploadedFiles).forEach(fileName => {
        const option = document.createElement('option');
        option.value = fileName;
        option.textContent = fileName;
        fileSelector.appendChild(option);
    });
}

// Open modal for editing/adding a row
function openModal(rowIndex = null) {
    const modal = document.getElementById('addRowModal');
    const form = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    
    form.innerHTML = ''; // Clear existing form inputs
    editRowIndex = rowIndex;

    // If editing a row, pre-fill form with existing row data
    if (rowIndex !== null) {
        modalTitle.textContent = 'Edit Row';
        headers.forEach((header, index) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = header;
            input.value = combinedData[rowIndex][index];
            form.appendChild(input);
        });
    } else {
        // Reset the form for adding a new row
        modalTitle.textContent = 'Add New Row';
        headers.forEach(header => {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = header;
            input.placeholder = `Enter ${header}`;
            form.appendChild(input);
        });
    }

    modal.style.display = 'block'; // Show the modal
}

// Save the new or edited row
// Save the new or edited row
document.getElementById('saveRow').addEventListener('click', function () {
    const form = document.getElementById('modalForm');
    const newRow = [];

    headers.forEach(header => {
        const input = form.querySelector(`input[name="${header}"]`);
        newRow.push(input.value);
    });

    if (editRowIndex !== null) {
        // Edit the existing row
        combinedData[editRowIndex] = newRow;
    } else {
        // Add a new row
        combinedData.push(newRow);
    }

    displayTable(combinedData); // Refresh table
    saveToLocalStorage(); // Save updated data to localStorage
    document.getElementById('addRowModal').style.display = 'none'; // Close modal
});


// Close modal functionality
document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('addRowModal').style.display = 'none'; // Hide the modal
});
// Open modal for adding a new row (no rowIndex means adding a new row)
document.getElementById('addRow').addEventListener('click', function () {
    openModal(); // This will open the modal without pre-filling data
});

// Open modal for editing/adding a row
function openModal(rowIndex = null) {
    const modal = document.getElementById('addRowModal');
    const form = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    
    form.innerHTML = ''; // Clear existing form inputs
    editRowIndex = rowIndex;

    // If editing a row, pre-fill form with existing row data
    if (rowIndex !== null) {
        modalTitle.textContent = 'Edit Row';
        headers.forEach((header, index) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = header;
            input.value = combinedData[rowIndex][index];
            form.appendChild(input);
        });
    } else {
        // Reset the form for adding a new row
        modalTitle.textContent = 'Add New Row';
        headers.forEach(header => {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = header;
            input.placeholder = `Enter ${header}`;
            form.appendChild(input);
        });
    }

    modal.style.display = 'block'; // Show the modal
}

// Delete a row
function deleteRow(rowIndex) {
    combinedData.splice(rowIndex, 1); // Remove the row from data
    displayTable(combinedData); // Refresh the table
    saveToLocalStorage(); // Save updated data to localStorage
}
