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

    // Add event listener for date filter
    const applyDateFilterBtn = document.getElementById('applyDateFilter');
    applyDateFilterBtn.addEventListener('click', filterDataByDate);
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

// Load CSV files and combined data from localStorage
function loadFromLocalStorage() {
    const dataTable = document.getElementById('dataTable'); 
    const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || {};
    uploadedFiles = savedFiles;

    // Load combinedData from localStorage or merge new data if combinedData is empty
    const savedCombinedData = JSON.parse(localStorage.getItem('combinedData')) || [];
    combinedData = savedCombinedData.length > 0 ? savedCombinedData : mergeDataFromFiles();

    // Check if there's data to display, and if so, set up the table
    if (Object.keys(uploadedFiles).length > 0 || combinedData.length > 0) {
        headers = mergeHeadersFromFiles();
        updateFileList();     // Update file list in the sidebar
        updateFileSelector(); // Update file selector dropdown
        displayTable(combinedData);  // Display table with loaded data
    } else {
        dataTable.style.display = 'none'; // Hide table if there's no data
    }
}

// Save the current state of uploadedFiles and combinedData to localStorage
function saveToLocalStorage() {
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    localStorage.setItem('combinedData', JSON.stringify(combinedData));
}

// Handle CSV Upload
document.getElementById('csvFileInput').addEventListener('change', function (e) {
    const files = e.target.files;
    Array.from(files).forEach(file => {
        Papa.parse(file, {
            complete: function (results) {
                // Extract necessary columns from the CSV (A, D, G, I)
                const filteredData = results.data.map(row => [row[0], row[3], row[6], row[8]]); // Extract Sl No, Date, User ID, URLs
                uploadedFiles[file.name] = filteredData; // Store only the filtered data in uploadedFiles

                combinedData = mergeDataFromFiles(); // Merge data from all uploaded files
                saveToLocalStorage(); // Save to localStorage after file is uploaded
                displayTable(combinedData); // Display the filtered data in the table
                loadFromLocalStorage();
            }
        });
    });
});

// Merge headers from all files (Only for specific columns)
function mergeHeadersFromFiles() {
    return ["Sl No", "Date", "User ID", "URL"];
}

// Merge data from all uploaded files (Only A, D, G, I columns)
function mergeDataFromFiles() {
    let mergedData = [];
    const uniqueLinksMap = {}; // To track unique links per user ID

    Object.values(uploadedFiles).forEach(fileData => {
        for (let i = 1; i < fileData.length; i++) { // Start from the second row to skip headers
            let row = new Array(4).fill(''); // Only 4 columns for Sl No, Date, User ID, URLs
            const userId = fileData[i][2]; // User ID is in the third column of the filtered data
            const links = fileData[i][3]; // URLs are in the fourth column of the filtered data

            // Initialize unique links set if not present for user ID
            if (!uniqueLinksMap[userId]) {
                uniqueLinksMap[userId] = new Set();
            }

            // Add only unique URLs for this user ID
            if (links && !uniqueLinksMap[userId].has(links)) {
                uniqueLinksMap[userId].add(links);
                row[0] = fileData[i][0]; // Sl No
                row[1] = fileData[i][1]; // Date
                row[2] = userId; // User ID
                row[3] = links; // URLs
                mergedData.push(row); // Add this row to the merged data
            }
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

// Function to filter data by selected date
function filterDataByDate(selectedDate, data) {
    if (!selectedDate) {
        return data; // If no date is selected, return all data
    }

    return data.filter(row => {
        const rowDate = row[2]; // Assuming date is in the third column
        return rowDate === selectedDate; // Match the date exactly
    });
}

function processCSV(file, callback) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const contents = e.target.result;
        const rows = contents.split('\n'); // Split the CSV into rows

        const data = [];
        
        rows.forEach((row, index) => {
            const columns = row.split(','); // Split each row into columns
            
            // Skip if the row doesn't have enough columns (minimum 9 columns: A, D, G, I)
            if (columns.length < 9) return;
            
            // Extract the necessary columns (assuming 0-based index for A, D, G, I):
            const slNo = columns[0].trim(); // Column A: Sl No
            const date = columns[3].trim(); // Column D: Date (Date Receipt)
            const userId = columns[6].trim(); // Column G: User ID
            const url = columns[8].trim(); // Column I: URL Links
            
            // Skip empty rows or rows with no userId or URL
            if (!slNo || !date || !userId || !url) return;

            // Add a new field for status with the default value "unblocked"
            data.push([slNo, date, userId, url, "unblocked"]);
        });

        // Call the callback function with processed data
        callback(data);
    };

    reader.readAsText(file); // Read the file as text
}




function displayTable(data) {
    removeEmptyRecords();

    const selectedDate = document.getElementById('dateFilter').value;
    const filteredData = filterDataByDate(selectedDate, data);

    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    tableBody.innerHTML = '';

    if (!filteredData || filteredData.length === 0) {
        dataTable.style.display = 'none';
        return;
    }

    dataTable.style.display = 'table';
    const groupedData = {};

    // Group data by userId and store URLs with their status
    filteredData.forEach(row => {
        const slNo = row[0];
        const date = row[1];
        const userId = row[2];
        const url = row[3];
        const status = row[4]; // "unblocked" or "blocked"

        if (!groupedData[userId]) {
            groupedData[userId] = {
                slNo: slNo,
                date: date,
                urls: {}
            };
        }

        // Store each URL with its status ("unblocked" by default)
        groupedData[userId].urls[url] = { status: status };
    });

    // Render the table rows
    for (const userId in groupedData) {
        const userData = groupedData[userId];
        const slNo = userData.slNo;
        const date = userData.date;
        const urls = userData.urls;

        const userRow = document.createElement('tr');

        const slNoCell = document.createElement('td');
        slNoCell.textContent = slNo;
        userRow.appendChild(slNoCell);

        const userIdCell = document.createElement('td');
        userIdCell.textContent = userId;
        userRow.appendChild(userIdCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = date;
        userRow.appendChild(dateCell);

        tableBody.appendChild(userRow);

        const urlsRow = document.createElement('tr');
        const urlsCell = document.createElement('td');
        urlsCell.colSpan = 3;

        // Display each URL with its block/unblock button
        Object.keys(urls).forEach(url => {
            const urlCol = document.createElement('div');
            urlCol.style.display = 'flex';

            const urlText = document.createElement('a');
            urlText.textContent = url;
            urlText.href = url;
            urlText.target = '_blank';
            urlText.rel = 'noopener noreferrer';
            urlCol.appendChild(urlText);

            const urlData = urls[url];
            urlText.style.color = urlData.status === "blocked" ? 'gray' : '';

            // Block/Unblock button
            const blockUnblockBtn = document.createElement('button');
            blockUnblockBtn.textContent = urlData.status === "blocked" ? 'Unblock' : 'Block';
            blockUnblockBtn.style.marginLeft = '10px';

            // Toggle the status on button click
            blockUnblockBtn.onclick = function () {
                // Toggle status
                urlData.status = urlData.status === "blocked" ? "unblocked" : "blocked";
                blockUnblockBtn.textContent = urlData.status === "blocked" ? 'Unblock' : 'Block';
                urlText.style.color = urlData.status === "blocked" ? 'gray' : '';

                // Update the main data array to reflect the new status
                const dataIndex = data.findIndex(item => item[2] === userId && item[3].trim() === url);
                if (dataIndex !== -1) {
                    data[dataIndex][4] = urlData.status; // Update status in main data array
                }

                saveToLocalStorage(); // Save updated data to localStorage
            };
            urlCol.appendChild(blockUnblockBtn);

            // Copy URL button
            const copyUrlBtn = document.createElement('button');
            copyUrlBtn.textContent = 'Copy URL';
            copyUrlBtn.classList.add('btn-copy');
            copyUrlBtn.style.marginLeft = '10px';
            copyUrlBtn.style.display = urlData.status === "blocked" ? 'none' : 'inline';
            copyUrlBtn.onclick = function () {
                copyToClipboard(url);
            };
            urlCol.appendChild(copyUrlBtn);

            urlsCell.appendChild(urlCol);
        });

        urlsRow.appendChild(urlsCell);
        tableBody.appendChild(urlsRow);
    }
}






// Function to filter data by selected date in "M/D/YY" format
function filterDataByDate(selectedDate, data) {
    if (!selectedDate) return data; // If no date is selected, return the original data

    const filteredData = [];

    // Convert the selected date from "YYYY-MM-DD" to a comparable Date object
    const [year, month, day] = selectedDate.split('-');
    const filterDate = new Date(year, month - 1, day).setHours(0, 0, 0, 0); // Create a Date object from the selected date

    // Filter the data by comparing the dates
    data.forEach(row => {
        const rowDate = new Date(row[1]).setHours(0, 0, 0, 0); // Column D (index 1) contains the date in "M/D/YY" format
        if (rowDate === filterDate) {
            filteredData.push(row); // If the row's date matches the filter, add it to the filteredData
        }
    });

    return filteredData;
}





// Event listener for applying the date filter
document.getElementById('applyDateFilter').addEventListener('click', function () {
    const selectedDate = document.getElementById('dateFilter').value; // Get the selected date from input
    const filteredData = filterDataByDate(selectedDate, combinedData); // Filter data based on selected date
    displayTable(filteredData); // Display the filtered data in the table
});




// Function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard: ' + text); // Optional feedback
    }).catch(err => {
        console.error('Could not copy text: ', err); // Error handling
    });
}


// // Function to delete a specific link by matching the exact link
// function deleteLink(username, linkToDelete) {
//     let linkDeleted = false;

//     // Loop through each file in the uploadedFiles object
//     Object.keys(uploadedFiles).forEach(fileName => {
//         const fileData = uploadedFiles[fileName];

//         // Loop through each row of data in the file
//         for (let i = 1; i < fileData.length; i++) {
//             if (fileData[i][0] === username) { // If the row belongs to the specified username

//                 // Loop through the links in the current row (skip first two columns: username and userId)
//                 for (let j = 2; j < fileData[i].length; j++) {
//                     if (fileData[i][j].trim() === linkToDelete.trim()) { // Match and trim both for comparison
//                         // Remove the matching link
//                         fileData[i].splice(j, 1);
//                         j--; // Adjust index after splice
//                         linkDeleted = true;
//                     }
//                 }

//                 // If the row has only username and userId left (no links), remove the entire row
//                 if (fileData[i].length === 2) {
//                     fileData.splice(i, 1);
//                     i--; // Adjust index after removing the row
//                 }
//             }
//         }
//     });

//     if (linkDeleted) {
//         // Rebuild combinedData from uploadedFiles and refresh the table
//         combinedData = mergeDataFromFiles(); // Re-merge data from files
//         displayTable(combinedData); // Refresh the table display
//         saveToLocalStorage(); // Save updated data to localStorage
//     } else {
//         console.log("No matching link found for deletion.");
//     }
// }


// Function to delete the entire record (username, userId, and all links)
// Delete a record based on userId
function deleteRecord(userId) {
    const dataTable = document.getElementById('dataTable'); 
    combinedData = combinedData.filter(row => row[2] !== userId); // Remove rows where userId matches
    saveToLocalStorage(); // Save updated data to localStorage
    displayTable(combinedData); // Refresh the table after deletion
    dataTable.style.display = 'none';
}

// Delete a specific URL for a given userId
function deleteLink(userId, urlToDelete) {
    const dataTable = document.getElementById('dataTable');
    combinedData.forEach(row => {
        if (row[2] === userId) {
            const urls = row[3].split(','); // Assuming URLs are stored as a comma-separated string
            const updatedUrls = urls.filter(url => url.trim() !== urlToDelete); // Remove the matching URL
            row[3] = updatedUrls.join(','); // Update the row with the remaining URLs
        }
    });
    saveToLocalStorage(); // Save updated data to localStorage
    displayTable(combinedData); // Refresh the table after deletion
    dataTable.style.display = 'none';
}




// Search functionality
document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase().trim();
    const dataTable = document.getElementById('dataTable');

    if (searchTerm === '') {
        dataTable.style.display = 'none'; // Hide table when search is cleared
    } else {
        dataTable.style.display = 'table';
        const matchedUsernames = new Set();
        const relevantRecords = new Set();

        // First pass: Identify all usernames where the search term exists in any field
        combinedData.forEach(row => {
            const slNo = row[0].trim();
            const date = row[1].trim();
            const username = row[2].trim();
            const userId = row[3].trim();
            const links = row.slice(4, -1).filter(Boolean); // Get the links (before the blocked status)
            const blockedStatus = row[4] ? 'Blocked' : 'Unblocked';

            const normalizedRow = [slNo, date, username, userId, ...links, blockedStatus].filter(Boolean);

            const isMatching = normalizedRow.some(field => field.toString().toLowerCase().includes(searchTerm));

            if (isMatching) {
                matchedUsernames.add(username);
                relevantRecords.add(row);
            }
        });

        // Second pass: Find rows that share similarities with matched usernames
        combinedData.forEach(row => {
            const slNo = row[0].trim();
            const date = row[1].trim();
            const username = row[2].trim();
            const userId = row[3].trim();
            const links = row.slice(4, -1).filter(Boolean);
            const blockedStatus = row[4] ? 'Blocked' : 'Unblocked';

            // If this row has a matching username or has data similar to the matched results, include it
            if (matchedUsernames.has(username)) {
                relevantRecords.add(row);
            } else {
                const normalizedRow = [username, userId, ...links, blockedStatus].filter(Boolean);
                const hasSimilarData = [...matchedUsernames].some(matchedUsername => {
                    return normalizedRow.some(field => field.toString().toLowerCase().includes(matchedUsername.toLowerCase()));
                });

                if (hasSimilarData) {
                    relevantRecords.add(row);
                }
            }
        });

        // Exclude rows that only match Sl. No. or Date without other similarities
        const filteredData = Array.from(relevantRecords).filter(row => {
            const slNo = row[0].trim();
            const date = row[1].trim();
            const username = row[2].trim();
            const userId = row[3].trim();
            const links = row.slice(4, -1).filter(Boolean);

            return !(
                (slNo.toLowerCase().includes(searchTerm) || date.toLowerCase().includes(searchTerm)) &&
                !username.toLowerCase().includes(searchTerm) &&
                !userId.toLowerCase().includes(searchTerm) &&
                !links.some(link => link.toLowerCase().includes(searchTerm))
            );
        });

        // Display the filtered data with displayTable
        displayTable(filteredData);
    }
});



document.getElementById('exportBtn').addEventListener('click', function () {
    loadFromLocalStorage();

    let csvContent = 'Username,Date,URLs,Status\n';
    const mergedData = {};

    combinedData.forEach(row => {
        const username = row[2];
        const date = row[1];
        const url = row[3];
        const blockedStatus = row[4]? "blocked": "unblocked";

        if (!mergedData[username]) {
            mergedData[username] = {
                date: date,
                urls: []
            };
        }

        if (url && !mergedData[username].urls.find(u => u.url === url)) {
            mergedData[username].urls.push({ url: url, status: blockedStatus });
        }
    });

    for (const username in mergedData) {
        const { date, urls } = mergedData[username];
        const csvRow = [];
        csvRow.push(username);
        csvRow.push(date);

        urls.forEach(({ url, status }) => {
            csvRow.push(url);
            csvRow.push(status);
        });

        const maxUrlColumns = 10;
        for (let i = urls.length; i < maxUrlColumns; i++) {
            csvRow.push('');
            csvRow.push('');
        }

        csvContent += csvRow.join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'combined_data.csv';
    link.click();
});





// Helper function to add platform-specific links to the CSV row
function addPlatformLinks(csvRow, platformLinks, maxLinks) {
    let initialLength = csvRow.length;

    // Add links to the row (up to the max number of links allowed)
    platformLinks.forEach((link, index) => {
        if (index < maxLinks) {
            csvRow.push(link);
        }
    });

    // Add empty strings to fill in remaining empty columns if needed
    while (csvRow.length < initialLength + maxLinks) {
        csvRow.push('');
    }
}




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
    const dataTable = document.getElementById('dataTable');
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
    dataTable.style.display = 'none';
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
    const dataTable = document.getElementById('dataTable');
    combinedData.splice(rowIndex, 1); // Remove the row from data
    displayTable(combinedData); // Refresh the table
    saveToLocalStorage(); // Save updated data to localStorage
    dataTable.style.display = 'none';
}