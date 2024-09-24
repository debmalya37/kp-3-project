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

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    // Simple login validation
    if (username === validUsername && password === validPassword) {
        // Hide login modal and show CSV manager
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('csvManager').style.display = 'block';
        displayTable(combinedData); // Ensure table is displayed after login
    } else {
        // Show error message
        loginError.style.display = 'block';
    }
});

// Load CSV files from localStorage
function loadFromLocalStorage() {
    const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || {};
    uploadedFiles = savedFiles;

    if (Object.keys(uploadedFiles).length > 0) {
        headers = mergeHeadersFromFiles();
        combinedData = mergeDataFromFiles();
        updateFileList(); // Update file list in the sidebar
        updateFileSelector(); // Update file selector dropdown
        displayTable(combinedData); // Display all data initially
    }
}

// Save the current state of uploadedFiles to localStorage
function saveToLocalStorage() {
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
}

// Handle CSV Upload
document.getElementById('csvFileInput').addEventListener('change', function (e) {
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
                displayTable(combinedData); // Display all data after upload
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
function mergeDataFromFiles() {
    let mergedData = [];
    Object.values(uploadedFiles).forEach(fileData => {
        for (let i = 1; i < fileData.length; i++) {
            let row = new Array(headers.length).fill('');
            fileData[0].forEach((header, index) => {
                let headerIndex = headers.indexOf(header);
                row[headerIndex] = fileData[i][index];
            });
            mergedData.push(row);
        }
    });
    return mergedData;
}

// Display table for the combined data based on search
function displayTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; // Clear existing contents

    if (!data || data.length === 0) return; // Return if no data

    // Create an object to group links by username and user ID
    const groupedData = {};

    data.forEach(row => {
        const username = row[0]; // Assuming username is in the first column
        const userId = row[1]; // Assuming user ID is in the second column
        const links = row.slice(2); // The rest are links

        if (!groupedData[username]) {
            groupedData[username] = {
                userId: userId,
                links: []
            };
        }

        groupedData[username].links.push(...links.filter(link => link)); // Add only non-empty links
    });

    // Populate the table with grouped data
    for (const username in groupedData) {
        const userData = groupedData[username];
        const userId = userData.userId;
        const links = userData.links;

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
        links.forEach(link => {
            const linkCol = document.createElement('div'); // Use divs to create columns
            linkCol.textContent = link;
            linksCell.appendChild(linkCol);
        });

        linksRow.appendChild(linksCell);
        tableBody.appendChild(linksRow);
    }
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();

    // If the search box is empty, display all combined data
    if (searchTerm === '') {
        displayTable(combinedData);
    } else {
        // Filter the data based on the search term
        const filteredData = combinedData.filter(row =>
            row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm)) // Convert cell to string
        );

        console.log('Filtered Data:', filteredData); // Debugging line
        displayTable(filteredData); // Display filtered rows
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
    document.getElementById('addRowModal').style.display = 'none'; // Close modal
    saveToLocalStorage(); // Save updated data to localStorage
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
