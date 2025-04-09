import { initializeConnect, getAgentArn } from './services/agentService';
import './styles/styles.css';

//  Constants
const API_URL = 'your-api-url-here'; 

const INACTIVITY_TIMEOUT_DURATION = 120000; // 2 minutes
const AUTO_REFRESH_INTERVAL = 7000; // 7 seconds

// State variables
let refreshInterval;
let inactivityTimeout;
let isModalOpen = false;
let selectedContacts = new Set();

// Error handling
window.onerror = (msg, url, lineNo, columnNo, error) => {
    console.error('Error:', { message: msg, url, line: lineNo, column: columnNo, error });
    return false;
};

// Initialization
async function initialize() {
    try {
        await initializeConnect();
        startAutoRefresh();
        resetInactivityTimeout();
    } catch (error) {
        console.error('Failed to initialize Connect:', error);
    }
}

async function fetchData() {
    try {
        // OPTIONAL: Fetch data only if agent is logged in
        // const { agentArn } = await getAgentArn();

        // if (!agentArn) {
        //     showConfirmModal("You need to be logged into CCP to see the data!");
        //     return;
        // }

        // Check if modal is open
        if (isModalOpen) {
            return;
        }

        // Show loading state
        setButtonLoading(true);

        // Fetch data
        const response = await fetch(API_URL);
        
        // Check if response is ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Process data
        const data = await response.json();
        const sortedData = data.sort((a, b) => a.startTimeRAW - b.startTimeRAW);
        const filteredData = applyFilters(sortedData);

        // Update table
        populateTable(filteredData);

    } catch (error) {
        console.error('Error fetching data:', error);
        // Handle the error message
        const errorMessage = error.message || 'An unexpected error occurred';
        showConfirmModal(errorMessage);
    } finally {
        // hide loading state
        setButtonLoading(false);
    }
}

function applyFilters(data) {
    const queueFilter = document.getElementById('queue-filter').value.toLowerCase();
    const noAgentFilter = document.getElementById('no-agent-filter').checked;

    return data.filter(item => {
        const matchesQueue = !queueFilter || item.Queue?.toLowerCase().includes(queueFilter);
        const matchesNoAgent = !noAgentFilter || !item.Agent;
        const hasANIorDNIS = (item.ANI?.trim() || item.DNIS?.trim());
        return matchesQueue && matchesNoAgent && hasANIorDNIS;
    });
}

// function to manage refresh button state
function setButtonLoading(isLoading) {
    const button = document.getElementById('refresh-button');
    
    if (isLoading) {
        button.classList.add('loading');
        button.textContent = 'Refreshing...';
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.textContent = 'Refresh the page';
        button.disabled = false;
    }
}

// Table manipulation
function populateTable(data) {
    const tableBody = document.querySelector('#queue-table tbody');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = createTableRow(item);
        tableBody.appendChild(row);
        
        // Restore checkbox state
        const checkbox = row.querySelector('.select-contact');
        if (checkbox && selectedContacts.has(item.ContactID)) {
            checkbox.checked = true;
            const pickButton = row.querySelector('.pick-btn');
            if (pickButton) {
                pickButton.style.display = 'inline-block';
            }
        }
    });

    addCheckboxEventListeners();
}

function createTableRow(item) {
    const row = document.createElement('tr');
    const isPickEnabled = !item.Agent;

    row.innerHTML = `
        <td><a href="${item.ContactDetails}" target="_blank">${item.ContactID}</a></td>
        <td>${item.ANI || ''}</td>
        <td>${item.Queue || ''}</td>
        <td>${item.startTime || ''}</td>
         <td>${item.Agent || ''}</td>
        <td><input type="checkbox" class="select-contact" data-contact-id="${item.ContactID}"></td>
        <td>
            <button class="pick-btn ${isPickEnabled ? '' : 'disabled'}"
                    data-contact-id="${item.ContactID}"
                    ${isPickEnabled ? '' : 'disabled'}>
                Pick
            </button>
        </td>
    `;

    const pickButton = row.querySelector('.pick-btn');
    if (pickButton) {
        pickButton.addEventListener('click', handlePick);
    }

    return row;
}

function addCheckboxEventListeners() {
    document.querySelectorAll('.select-contact').forEach(checkbox => {
        checkbox.addEventListener('change', togglePickButton);
    });
}

function togglePickButton(event) {
    const contactId = event.target.getAttribute('data-contact-id');
    const pickButton = document.querySelector(`button[data-contact-id="${contactId}"]`);

    if (pickButton) {
        if (event.target.checked) {
            selectedContacts.add(contactId); // Add to selected contacts
            pickButton.style.display = 'inline-block';
        } else {
            selectedContacts.delete(contactId); // Remove from selected contacts
            pickButton.style.display = 'none';
        }
    }
}

function clearSelections() {
    selectedContacts.clear();
}

async function handlePick(event) {
    if (event.target.disabled) {
        showConfirmModal("Contacts with agents cannot be picked");
        return;
    }

    try {
        // Show loader and overlay
        document.getElementById('loader-container').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        const contactId = event.target.getAttribute('data-contact-id');
        const { agentArn, agentName } = await getAgentArn();
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({ ContactID: contactId, AgentARN: agentArn, AgentName: agentName })
        });

        if (response.ok) {
            selectedContacts.delete(contactId); // Clear the selection for this contact
            showConfirmModal("Contact picked successfully!");
            fetchData();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error picking contact:', error);
        showConfirmModal("Oh No! There was an error picking the contact.");
    }finally {
        // Hide loader and overlay
        document.getElementById('loader-container').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }
}

// Modal handling
function showConfirmModal(message) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').style.display = 'block';
    isModalOpen = true;
}

function showInactivityModal() {
    document.getElementById('inactivity-modal').style.display = 'block';
    isModalOpen = true;
    clearInterval(refreshInterval);
}

function hideInactivityModal() {
    document.getElementById('inactivity-modal').style.display = 'none';
    isModalOpen = false;
    startAutoRefresh();
}

// Timer functions
function startAutoRefresh() {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
}

function resetInactivityTimeout() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(showInactivityModal, INACTIVITY_TIMEOUT_DURATION);
}

// Event listeners
document.addEventListener('DOMContentLoaded', initialize);
document.addEventListener('mousemove', resetInactivityTimeout);
document.addEventListener('keypress', resetInactivityTimeout);
window.addEventListener('beforeunload', () => {
    clearSelections();
});

// Window functions
window.hideIConfirmModal = () => {
    document.getElementById('confirm-modal').style.display = 'none';
    isModalOpen = false;
    fetchData();
};

window.refresh = function() {
    fetchData();
}

window.exitPage = () => {
    hideInactivityModal();
    window.location.href = 'logout.html' //REDIRECT_URL;
};

window.resumeSession = () => {
    hideInactivityModal();
};