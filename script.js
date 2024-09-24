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
    const tableHeaders = document.getElementById('tableHeaders');
    const tableBody = document.getElementById('tableBody');

    // Clear existing contents
    tableHeaders.innerHTML = '';
    tableBody.innerHTML = '';

    if (!data) return;

    // Create table headers
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        tableHeaders.appendChild(th);
    });

    // Add extra header for actions (Edit/Delete)
    const actionTh = document.createElement('th');
    actionTh.textContent = 'Actions';
    tableHeaders.appendChild(actionTh);

    // Populate table rows
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        headers.forEach((header, headerIndex) => {
            const cell = document.createElement('td');
            cell.textContent = row[headerIndex];
            tr.appendChild(cell);
        });

        // Add action buttons
        const actionsCell = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openModal(index); // Call openModal on click
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteRow(index); // Call deleteRow on click

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        tr.appendChild(actionsCell);

        tableBody.appendChild(tr);
    });
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
            row.some(cell => cell.toLowerCase().includes(searchTerm))
        );
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
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    Object.keys(uploadedFiles).forEach(fileName => {
        const li = document.createElement('li');
        li.textContent = fileName;
        fileList.appendChild(li);
    });
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
