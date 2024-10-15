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
    // const applyDateFilterBtn = document.getElementById('applyDateFilter');
    // applyDateFilterBtn.addEventListener('click', handleDateFilter);
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
            const slNo = columns[0]; // Column A: Sl No
            const date = columns[3]; // Column D: Date (Date Receipt)
            const userId = columns[6]; // Column G: User ID
            const url = columns[8]; // Column I: URL Links
            
            // Skip empty rows or rows with no userId or URL
            if (!slNo || !date || !userId || !url) return;

            // Push the selected data (Sl No, Date, User ID, URL) into the data array
            data.push([slNo, date, userId, url]);
        });

        // Once the data is processed, call the callback function with the filtered data
        callback(data);
    };

    reader.readAsText(file); // Read the file as text
}

// Call this function wherever you display the table or modify the data
function displayTable(data) {
    removeEmptyRecords(); // Remove empty records before displaying the table

    const selectedDate = document.getElementById('dateFilter').value; // Get the selected date from the input
    const filteredData = filterDataByDate(selectedDate, data); // Filter data by the selected date

    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    tableBody.innerHTML = ''; // Clear existing contents

    if (!filteredData || filteredData.length === 0) {
        dataTable.style.display = 'none'; // Hide table if no data
        return;
    }

    // Show the table if data exists
    dataTable.style.display = 'table'; // Display the table

    const groupedData = {};

    // Group and process data
    filteredData.forEach(row => {
        const slNo = row[0]; // Sl No. from column A
        const date = row[1]; // Date (Date Receipt) from column D
        const userId = row[2]; // User ID from column G
        const url = row[3]; // URL from column I

        // Initialize the grouped data if the userId doesn't exist
        if (!groupedData[userId]) {
            groupedData[userId] = {
                slNo: slNo,
                date: date,
                urls: new Set() // Use Set to avoid duplicate URLs
            };
        }

        // Add non-empty URLs and automatically filter out duplicates using the Set
        if (url) {
            groupedData[userId].urls.add(url.trim()); // Trim to remove extra spaces
        }
    });

    // Populate the table with grouped data
    for (const userId in groupedData) {
        const userData = groupedData[userId];
        const slNo = userData.slNo;
        const date = userData.date;
        const urls = Array.from(userData.urls); // Convert the Set back to an array

        // Create a new row for user ID
        const userRow = document.createElement('tr');
        
        // Sl No. Cell
        const slNoCell = document.createElement('td');
        slNoCell.textContent = slNo;
        slNoCell.classList.add('sl-no'); // Add the sl-no class
        userRow.appendChild(slNoCell);

        // User ID Cell
        const userIdCell = document.createElement('td');
        userIdCell.textContent = userId;
        userIdCell.classList.add('user-id'); // Add the user-id class
        userRow.appendChild(userIdCell);

        // Date Cell
        const dateCell = document.createElement('td');
        dateCell.textContent = date; // Display the date in a new column
        dateCell.classList.add('date'); // Add the date class
        userRow.appendChild(dateCell);

        // Add copy button for user ID
        const copyUserIdBtn = document.createElement('button');
        copyUserIdBtn.textContent = 'Copy User ID';
        copyUserIdBtn.classList.add('btn-copy');
        copyUserIdBtn.onclick = function () {
            copyToClipboard(userId); // Function to copy user ID to clipboard
        };
        userIdCell.appendChild(copyUserIdBtn); // Add the copy button to the user ID cell

        // Add "Delete Record" button
        const deleteRecordCell = document.createElement('td');
        const deleteRecordBtn = document.createElement('button');
        deleteRecordBtn.textContent = 'Delete Record';
        deleteRecordBtn.classList.add('btn-delete');
        deleteRecordBtn.onclick = function () {
            deleteRecord(userId); // Pass user ID to delete the entire record
        };
        deleteRecordCell.appendChild(deleteRecordBtn); // Add the delete record button to the row
        userRow.appendChild(deleteRecordCell); // Append delete button cell to the row

        tableBody.appendChild(userRow); // Add the user ID row to the table body
   
        // Create a new row for URLs
        const urlsRow = document.createElement('tr');
        const urlsCell = document.createElement('td');
        urlsCell.classList.add('urls'); // Add the urls class
        urlsCell.colSpan = 3; // Span the cell across the required columns

        // Create columns for each URL
        urls.forEach((url) => {
            const urlCol = document.createElement('div');
            urlCol.style.display = 'flex'; // Flexbox for URL and button alignment

            // Add clickable URL
            const urlText = document.createElement('a');
            urlText.textContent = url;
            urlText.href = url; // Set the href attribute for the URL
            urlText.target = '_blank'; // Open in a new tab
            urlText.rel = 'noopener noreferrer'; // Security improvement

            urlCol.appendChild(urlText); // Append URL text

            // Add copy button for each URL
            const copyUrlBtn = document.createElement('button');
            copyUrlBtn.textContent = 'Copy URL';
            copyUrlBtn.classList.add('btn-copy');
            copyUrlBtn.style.marginLeft = '10px';
            copyUrlBtn.onclick = function () {
                copyToClipboard(url); // Pass the URL to copy
            };

            urlCol.appendChild(copyUrlBtn); // Append copy button to URL column

            // Add delete button for each URL
            const deleteUrlBtn = document.createElement('button');
            deleteUrlBtn.textContent = 'Delete URL';
            deleteUrlBtn.classList.add('btn-delete');
            deleteUrlBtn.style.marginLeft = '10px';
            deleteUrlBtn.onclick = function () {
                deleteLink(userId, url); // Pass user ID and the actual URL value to delete
            };

            urlCol.appendChild(deleteUrlBtn); // Append delete button to URL column
            urlsCell.appendChild(urlCol); // Append the column to the row
        });

        urlsRow.appendChild(urlsCell); // Append URLs cell to URLs row
        tableBody.appendChild(urlsRow); // Add the URLs row to the table body
    }
}

// Function to filter data by selected date in "DD-MM-YYYY" format
function filterDataByDate(selectedDate, data) {
    if (!selectedDate) return data; // If no date is selected, return the original data

    const filteredData = [];

    // Convert the selected date from "DD-MM-YYYY" to "YYYY-MM-DD" (or another comparable format)
    const [day, month, year] = selectedDate.split('-');
    const filterDate = new Date(`${year}-${month}-${day}`).setHours(0, 0, 0, 0);

    // Filter the data by comparing the dates
    data.forEach(row => {
        const rowDate = new Date(row[1]).setHours(0, 0, 0, 0); // Column D (index 1) contains the date
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
    combinedData = combinedData.filter(row => row[2] !== userId); // Remove rows where userId matches
    saveToLocalStorage(); // Save updated data to localStorage
    displayTable(combinedData); // Refresh the table after deletion
}

// Delete a specific URL for a given userId
function deleteLink(userId, urlToDelete) {
    combinedData.forEach(row => {
        if (row[2] === userId) {
            const urls = row[3].split(','); // Assuming URLs are stored as a comma-separated string
            const updatedUrls = urls.filter(url => url.trim() !== urlToDelete); // Remove the matching URL
            row[3] = updatedUrls.join(','); // Update the row with the remaining URLs
        }
    });
    saveToLocalStorage(); // Save updated data to localStorage
    displayTable(combinedData); // Refresh the table after deletion
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
    let csvContent = 'Username,UserId,Links\n'; // Set CSV headers with just "Links" without platform-specific names

    combinedData.forEach(row => {
        const username = row[0]; // Assuming username is in the first column
        const userId = row[1];   // Assuming user ID is in the second column
        const links = row.slice(2).filter(link => link); // Get links and filter out empty ones

        // Create separate arrays for each platform
        let facebookLinks = [];
        let instagramLinks = [];
        let twitterLinks = [];
        let youtubeLinks = [];

        // Sort links into the appropriate platform arrays
        links.forEach(link => {
            if (link.includes('facebook.com')) {
                facebookLinks.push(link);
            } else if (link.includes('instagram.com')) {
                instagramLinks.push(link);
            } else if (link.includes('twitter.com')) {
                twitterLinks.push(link);
            } else if (link.includes('youtube.com')) {
                youtubeLinks.push(link);
            }
        });

        // Prepare the row for CSV
        const csvRow = [];
        csvRow.push(username); // Add username to the row
        csvRow.push(userId);   // Add user ID to the row

        // Combine all sorted platform links into a single array
        const sortedLinks = [...facebookLinks, ...instagramLinks, ...twitterLinks, ...youtubeLinks];

        // Add sorted links to the row, and ensure each link is in its own column
        addPlatformLinks(csvRow, sortedLinks, sortedLinks.length);

        // Join the row and add to CSV content
        csvContent += csvRow.join(',') + '\n'; // Join the row and add a new line
    });

    // Download the CSV file
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