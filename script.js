let uploadedFiles = {}; // To store multiple CSV files
let headers = [];
let combinedData = []; // To hold data from all files combined
let editRowIndex = null; // To track if we are editing a row

// Hardcoded credentials (for demo purposes)
const validUsername = "admin";
const validPassword = "password123";

// On page load, display the login modal
// On page load, display the login modal
document.addEventListener('DOMContentLoaded', function () {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'block'; // Show login modal
    loadFromLocalStorage(); // Load uploaded files from localStorage when page loads

    // Add event listener for date filter
    const applyDateFilterBtn = document.getElementById('applyDateFilter');
    applyDateFilterBtn.addEventListener('click', handleDateFilter); // Ensure this references the newly defined function
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

document.getElementById('csvFileInput').addEventListener('change', function(event) {
    const files = event.target.files; // Get the selected files
    const promises = []; // Array to hold promises for each file processing

    for (const file of files) {
        const fileExtension = file.name.split('.').pop().toLowerCase(); // Get the file extension

        // Create a promise for each file to handle processing
        const fileProcessingPromise = new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function(e) {
                const fileContent = e.target.result; // Read the file content

                if (fileExtension === 'csv') {
                    // Process CSV file
                    const csvData = processCSV(fileContent);
                    resolve(csvData);
                } else if (fileExtension === 'xlsx') {
                    // Process XLSX file
                    processXLSX(file).then(resolve).catch(reject);
                } else {
                    reject(new Error('Unsupported file type'));
                }
            };

            // Read the file based on its type
            if (fileExtension === 'csv') {
                reader.readAsText(file); // Read CSV file as text
            } else if (fileExtension === 'xlsx') {
                reader.readAsArrayBuffer(file); // Read XLSX file as binary
            }
        });

        promises.push(fileProcessingPromise); // Add the promise to the array
    }

    // Process all file promises
    Promise.all(promises)
        .then(dataArrays => {
            const combinedDataFromFiles = [].concat(...dataArrays);
            combinedData = combinedDataFromFiles;  // Update the global combinedData array

            // Add files to uploadedFiles and save to localStorage
            for (const file of files) {
                uploadedFiles[file.name] = file;
            }
            saveToLocalStorage();  // Save updated file list and data to local storage
            updateFileList();      // Update the displayed file list

            displayTable(combinedData);  // Display combined data in the table
        })
        .catch(error => {
            console.error('Error processing files:', error);
        });
});

// Save the current state of uploadedFiles to localStorage
function saveToLocalStorage() {
    localStorage.setItem('uploadedFiles', JSON.stringify(Object.keys(uploadedFiles)));
    localStorage.setItem('combinedData', JSON.stringify(combinedData));
}


// Function to process CSV content
function processCSV(content) {
    const rows = content.split('\n').map(row => row.split(',')); // Split into rows and cells
    return rows; // Return the processed CSV data
}

// Function to process XLSX content
function processXLSX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' }); // Use the XLSX library to read the workbook
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }); // Convert to JSON
            resolve(jsonData); // Resolve with the XLSX data
        };

        reader.onerror = function(error) {
            reject(error); // Reject the promise on error
        };

        reader.readAsArrayBuffer(file); // Read XLSX file as binary
    });
}


// Merge headers from all files
function mergeHeadersFromFiles() {
    let allHeaders = new Set();
    Object.values(uploadedFiles).forEach(fileData => {
        if (Array.isArray(fileData) && Array.isArray(fileData[0])) {
            fileData[0].forEach(header => allHeaders.add(header));
        } else {
            console.warn("Unexpected data structure in uploadedFiles:", fileData);
        }
    });
    return Array.from(allHeaders);
}


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

// Define the handleDateFilter function
function handleDateFilter() {
    const selectedDate = document.getElementById('dateFilter').value; // Get the selected date
    console.log(`Selected Date: ${selectedDate}`); // Debug: log selected date

    // Validate the date format (DD-MM-YYYY)
    if (!validateDate(selectedDate)) {
        console.log("Invalid date format. Please use DD-MM-YYYY.");
        return; // Exit if the date is invalid
    }

    // If date is valid, display the table with filtered data
    displayTable(combinedData); 
}

// Helper function to validate the date format (DD-MM-YYYY)
function validateDate(dateStr) {
    const regex = /^\d{2}-\d{2}-\d{4}$/; // Matches DD-MM-YYYY
    const isValid = regex.test(dateStr); // Check if date format is valid

    // Additional debug log to show validation result
    console.log(`Is date valid: ${isValid}`);
    return isValid; // Return true if valid
}


let currentPage = 1;
const rowsPerPage = 100; // Set how many rows to show per page

function displayTable(data) {
    removeEmptyRecords(); // Remove empty records before displaying the table

    const selectedDate = document.getElementById('dateFilter').value; // Get the selected date from the input
    const filteredData = filterDataByDate(selectedDate, data); // Filter data by selected date

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = filteredData.slice(start, end); // Paginate data

    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    tableBody.innerHTML = ''; // Clear existing contents

    if (!paginatedData || paginatedData.length === 0) {
        dataTable.style.display = 'none'; // Hide table if no data
        return;
    }

    // Show the table if data exists
    dataTable.style.display = 'table'; // Display the table

    const groupedData = {};

    // Group and process data
    paginatedData.forEach(row => {
        const slNo = row[0]; // Sl No. from column A
        const date = row[3]; // Date (Date Receipt) from column D
        const accountId = row[6]; // Account ID from column G
        const url = row[8]; // URL from column I

        // Initialize the grouped data if the accountId doesn't exist
        if (!groupedData[accountId]) {
            groupedData[accountId] = {
                slNo: slNo,
                date: date,
                urls: new Set() // Use Set to avoid duplicate URLs
            };
        }

        // Add non-empty URLs and automatically filter out duplicates using the Set
        if (url) {
            groupedData[accountId].urls.add(url.trim()); // Trim to remove extra spaces
        }
    });

    // Populate the table with grouped data
    for (const accountId in groupedData) {
        const userData = groupedData[accountId];
        const slNo = userData.slNo;
        const date = userData.date;
        const urls = Array.from(userData.urls); // Convert the Set back to an array

        // Create a new row for account ID
        const userRow = document.createElement('tr');
        
        // Sl No. Cell
        const slNoCell = document.createElement('td');
        slNoCell.textContent = slNo;
        slNoCell.classList.add('sl-no'); // Add the sl-no class
        userRow.appendChild(slNoCell);

        // Account ID Cell
        const accountIdCell = document.createElement('td');
        accountIdCell.textContent = accountId;
        accountIdCell.classList.add('account-id'); // Add the account-id class
        userRow.appendChild(accountIdCell);

        // Date Cell
        const dateCell = document.createElement('td');
        dateCell.textContent = date; // Display the date in a new column
        dateCell.classList.add('date'); // Add the date class
        userRow.appendChild(dateCell);

        // Add copy button for account ID
        const copyAccountIdBtn = document.createElement('button');
        copyAccountIdBtn.textContent = 'Copy Account ID';
        copyAccountIdBtn.classList.add('btn-copy');
        copyAccountIdBtn.onclick = function () {
            copyToClipboard(accountId); // Function to copy account ID to clipboard
        };
        accountIdCell.appendChild(copyAccountIdBtn); // Add the copy button to the account ID cell

        // Add "Delete Record" button
        const deleteRecordCell = document.createElement('td');
        const deleteRecordBtn = document.createElement('button');
        deleteRecordBtn.textContent = 'Delete Record';
        deleteRecordBtn.classList.add('btn-delete');
        deleteRecordBtn.onclick = function () {
            deleteRecord(accountId); // Pass account ID to delete the entire record
        };
        deleteRecordCell.appendChild(deleteRecordBtn); // Add the delete record button to the row
        userRow.appendChild(deleteRecordCell); // Append delete button cell to the row

        tableBody.appendChild(userRow); // Add the account ID row to the table body

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
                deleteLink(accountId, url); // Pass account ID and the actual URL value to delete
            };

            urlCol.appendChild(deleteUrlBtn); // Append delete button to URL column
            urlsCell.appendChild(urlCol); // Append the column to the row
        });

        urlsRow.appendChild(urlsCell); // Append URLs cell to URLs row
        tableBody.appendChild(urlsRow); // Add the URLs row to the table body
    }

    // Update pagination controls after displaying the data
    updatePaginationControls(filteredData.length);
}

function updatePaginationControls(totalRows) {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const paginationContainer = document.getElementById('pagination');

    if (!paginationContainer) {
        console.error("Pagination container not found");
        return; // Exit if the element is not found
    }

    paginationContainer.innerHTML = ''; // Clear old pagination buttons

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.onclick = () => {
            currentPage = i;
            displayTable(combinedData); // Update the displayed table based on the new page
        };

        if (i === currentPage) {
            pageButton.classList.add('active');
        }

        paginationContainer.appendChild(pageButton);
    }
}





// Update your filter logic to compare correctly
function filterDataByDate(selectedDate, data) {
    if (!selectedDate) {
        console.log("No valid date selected, returning all data."); // Debug log
        return data; // Return all data if no valid date is selected
    }

    // Debug log to see the selected date being compared
    console.log(`Filtering data for selected date: ${selectedDate}`);

    return data.filter(row => {
        const recordDate = row[2]; // Assuming the date is in the third column
        // Debug log to see the record dates
        console.log(`Comparing recordDate: ${recordDate} with selectedDate: ${selectedDate}`);
        return recordDate === selectedDate; // Direct comparison in DD-MM-YYYY format
    });
}

// Event listener for applying the date filter
document.getElementById('applyDateFilter').addEventListener('click', function () {
    handleDateFilter(); // Call handleDateFilter to validate and apply the filter
    console.log("Combined Data: ", combinedData); // Log the combined data
});





// Function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard: ' + text); // Optional feedback
    }).catch(err => {
        console.error('Could not copy text: ', err); // Error handling
    });
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
        const newFileData = fileData.filter(row => row[1] !== username); // Assuming username is in the second column (index 1)

        // Update the uploadedFiles with the new data (without the deleted record)
        uploadedFiles[fileName] = newFileData;
    });

    // After modifying the data, update the table and save the changes
    combinedData = mergeDataFromFiles(); // Re-merge data from files
    displayTable(combinedData); // Refresh the table
    saveToLocalStorage(); // Save updated data to localStorage
}



// Search functionality
document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase().trim(); // Trim spaces from search term
    const dataTable = document.getElementById('dataTable');
    
    // If the search box is empty, show all data
    if (searchTerm === '') {
        displayTable(combinedData); // Display the full table
    } else {
        dataTable.style.display = 'table'; // Make sure the table is visible

        // Initialize an empty array to store matched rows
        const matchedRecords = [];
        
        // Implement BFS-like search
        for (let i = 0; i < combinedData.length; i++) {
            let queue = [combinedData[i]]; // Initialize the queue with the current row
            
            // Process each row
            while (queue.length > 0) {
                let currentRow = queue.shift(); // Dequeue the first element

                // Check each cell in the current row
                for (let j = 0; j < currentRow.length; j++) {
                    const cellValue = currentRow[j];

                    // If the cell contains the search term, mark the row
                    if (typeof cellValue === 'string' && cellValue.toLowerCase().includes(searchTerm)) {
                        matchedRecords.push(combinedData[i]); // Add the entire row to the result
                        break; // No need to check further cells if the row matches
                    }
                }
            }
        }

        // Display the matched records
        displayTable(matchedRecords); // Show filtered data
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
