// admin_booking_control.js
// Admin Booking Control functionality

// Court configurations
const COURT_CONFIG = {
    padel: [
        { id: 'padel-1', name: 'Court 1: Purple Mondo' },
        { id: 'padel-2', name: 'Court 2: Teracotta' }
    ],
    cricket: [
        { id: 'cricket-1', name: 'Court 1: 110x50ft' },
        { id: 'cricket-2', name: 'Court 2: 130x60ft (Multi-purpose)' }
    ],
    futsal: [
        { id: 'futsal-1', name: 'Court 1: 130x60ft (Multi-purpose)' }
    ],
    pickleball: [
        { id: 'pickleball-1', name: 'Court 1: Professional Setup' }
    ]
};

// Pricing configuration
const SPORT_PRICING = {
    cricket: 3000,
    futsal: 2500,
    padel: 5500,
    pickleball: 2500
};

let selectedBookings = new Set();
let currentEditBooking = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeBookingControl();
    setupEventListeners();
    
    // Check if we have a booking ID in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('booking');
    if (bookingId) {
        searchBookingById(bookingId);
        showSection('search-booking-section');
    }
});

function initializeBookingControl() {
    // Set default dates
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);
    
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today.toISOString().split('T')[0];
        }
        input.min = today.toISOString().split('T')[0];
        input.max = maxDate.toISOString().split('T')[0];
    });
    
    // Setup court dropdowns
    setupCourtDropdowns();
}

function setupEventListeners() {
    // Action cards
    document.getElementById('create-booking-card').addEventListener('click', () => showSection('create-booking-section'));
    document.getElementById('search-booking-card').addEventListener('click', () => showSection('search-booking-section'));
    document.getElementById('bulk-operations-card').addEventListener('click', () => showSection('bulk-operations-section'));
    
    // Close section buttons
    document.querySelectorAll('.close-section-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.closest('.close-section-btn').dataset.section;
            closeSection(section);
        });
    });
    
    // Create booking form
    document.getElementById('create-sport').addEventListener('change', updateCourtOptions);
    document.getElementById('create-duration').addEventListener('change', calculateAmount);
    document.getElementById('create-booking-form').addEventListener('submit', handleCreateBooking);
    
    // Search methods
    document.querySelectorAll('.search-method').forEach(method => {
        method.addEventListener('click', (e) => switchSearchMethod(e.target.closest('.search-method').dataset.method));
    });
    
    // Search forms
    document.getElementById('booking-id-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookingById();
    });
    document.getElementById('phone-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookingByPhone();
    });
    document.getElementById('name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBookingByName();
    });
    
    // Bulk operations
    document.getElementById('bulk-date-from').value = new Date().toISOString().split('T')[0];
    document.getElementById('bulk-date-to').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Modal controls
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('edit-booking-form').addEventListener('submit', handleUpdateBooking);
    document.getElementById('edit-sport').addEventListener('change', updateEditCourtOptions);
    
    // Confirmation modal
    document.getElementById('confirmation-modal-overlay').addEventListener('click', handleConfirmationOverlayClick);
}

function setupCourtDropdowns() {
    // Setup create form court dropdown
    const createCourtSelect = document.getElementById('create-court');
    const editCourtSelect = document.getElementById('edit-court');
    
    // Initially empty - will be populated when sport is selected
    createCourtSelect.innerHTML = '<option value="">Select Court</option>';
    editCourtSelect.innerHTML = '<option value="">Select Court</option>';
}

function updateCourtOptions() {
    const sport = document.getElementById('create-sport').value;
    const courtSelect = document.getElementById('create-court');
    
    courtSelect.innerHTML = '<option value="">Select Court</option>';
    
    if (sport && COURT_CONFIG[sport]) {
        COURT_CONFIG[sport].forEach(court => {
            const option = document.createElement('option');
            option.value = court.id;
            option.textContent = court.name;
            courtSelect.appendChild(option);
        });
    }
    
    calculateAmount();
}

function updateEditCourtOptions() {
    const sport = document.getElementById('edit-sport').value;
    const courtSelect = document.getElementById('edit-court');
    
    courtSelect.innerHTML = '<option value="">Select Court</option>';
    
    if (sport && COURT_CONFIG[sport]) {
        COURT_CONFIG[sport].forEach(court => {
            const option = document.createElement('option');
            option.value = court.id;
            option.textContent = court.name;
            courtSelect.appendChild(option);
        });
    }
}

function calculateAmount() {
    const sport = document.getElementById('create-sport').value;
    const duration = parseFloat(document.getElementById('create-duration').value) || 0;
    const amountInput = document.getElementById('create-amount');
    
    if (sport && duration > 0) {
        const hourlyRate = SPORT_PRICING[sport] || 2500;
        const amount = Math.round(hourlyRate * duration);
        amountInput.value = amount;
    } else {
        amountInput.value = '';
    }
}

// Section Management
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section-card').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function closeSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
        
        // Clear forms when closing
        const forms = section.querySelectorAll('form');
        forms.forEach(form => form.reset());
        
        // Clear search results
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
}

// Create Booking
async function handleCreateBooking(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const bookingData = {
            sport: document.getElementById('create-sport').value,
            court: document.getElementById('create-court').value,
            date: document.getElementById('create-date').value,
            startTime: document.getElementById('create-start-time').value,
            duration: parseFloat(document.getElementById('create-duration').value),
            playerName: document.getElementById('create-player-name').value,
            playerPhone: document.getElementById('create-player-phone').value,
            playerEmail: document.getElementById('create-player-email').value,
            playerCount: document.getElementById('create-player-count').value,
            status: document.getElementById('create-status').value,
            paymentType: document.getElementById('create-payment-type').value,
            specialRequests: document.getElementById('create-special-requests').value
        };
        
        // Validate required fields
        const requiredFields = ['sport', 'court', 'date', 'startTime', 'duration', 'playerName', 'playerPhone'];
        for (const field of requiredFields) {
            if (!bookingData[field]) {
                showErrorToast(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
                return;
            }
        }
        
        showLoadingToast('Creating booking...');
        
        const response = await fetch('/admin/api/admin-create-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast(`Booking created successfully! ID: ${result.bookingId}`);
            event.target.reset();
            calculateAmount();
        } else {
            throw new Error(result.message || 'Failed to create booking');
        }
        
    } catch (error) {
        console.error('Create booking error:', error);
        showErrorToast('Failed to create booking: ' + error.message);
    }
}

// Search Functions
function switchSearchMethod(method) {
    // Update active method
    document.querySelectorAll('.search-method').forEach(m => {
        m.classList.toggle('active', m.dataset.method === method);
    });
    
    // Show corresponding form
    document.querySelectorAll('.search-form').forEach(form => {
        form.classList.toggle('active', form.id === `search-by-${method}`);
    });
    
    // Clear previous results
    document.getElementById('search-results').style.display = 'none';
}

async function searchBookingById(bookingId = null) {
    const id = bookingId || document.getElementById('booking-id-input').value.trim();
    if (!id) {
        showErrorToast('Please enter a booking ID');
        return;
    }
    
    await performSearch('id', id);
}

async function searchBookingByPhone() {
    const phone = document.getElementById('phone-input').value.trim();
    if (!phone) {
        showErrorToast('Please enter a phone number');
        return;
    }
    
    await performSearch('phone', phone);
}

async function searchBookingByName() {
    const name = document.getElementById('name-input').value.trim();
    if (!name) {
        showErrorToast('Please enter a player name');
        return;
    }
    
    await performSearch('name', name);
}

async function searchBookingByDate() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        showErrorToast('Please select both start and end dates');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showErrorToast('Start date must be before end date');
        return;
    }
    
    await performSearch('date', null, startDate, endDate);
}

async function performSearch(method, value, startDate = null, endDate = null) {
    try {
        showLoadingToast('Searching...');
        
        const searchData = { method };
        
        if (method === 'date') {
            searchData.startDate = startDate;
            searchData.endDate = endDate;
        } else {
            searchData.value = value;
        }
        
        const response = await fetch('/admin/api/search-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            displaySearchResults(result.bookings);
            hideLoadingToast();
        } else {
            throw new Error(result.message || 'Search failed');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showErrorToast('Search failed: ' + error.message);
    }
}

function displaySearchResults(bookings) {
    const resultsContainer = document.getElementById('results-container');
    const searchResults = document.getElementById('search-results');
    
    if (bookings.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6c757d;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No bookings found matching your criteria.</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = bookings.map(booking => createResultItem(booking)).join('');
    }
    
    searchResults.style.display = 'block';
}

function createResultItem(booking) {
    const statusClass = booking.status.replace('_', '-');
    const statusText = booking.status === 'pending_payment' ? 'Pending Payment' : 
                     booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled';
    
    return `
        <div class="result-item">
            <div class="result-header">
                <div class="result-title">Booking #${booking.id}</div>
                <span class="result-status status-${statusClass}">${statusText}</span>
            </div>
            
            <div class="result-details">
                <div class="result-detail">
                    <div class="result-detail-label">Player</div>
                    <div class="result-detail-value">${booking.playerName}</div>
                </div>
                <div class="result-detail">
                    <div class="result-detail-label">Phone</div>
                    <div class="result-detail-value">${booking.playerPhone}</div>
                </div>
                <div class="result-detail">
                    <div class="result-detail-label">Sport & Court</div>
                    <div class="result-detail-value">${booking.sport.toUpperCase()} - ${booking.courtName}</div>
                </div>
                <div class="result-detail">
                    <div class="result-detail-label">Date & Time</div>
                    <div class="result-detail-value">${booking.formatted_time}</div>
                </div>
                <div class="result-detail">
                    <div class="result-detail-label">Amount</div>
                    <div class="result-detail-value">PKR ${booking.totalAmount.toLocaleString()}</div>
                </div>
                <div class="result-detail">
                    <div class="result-detail-label">Duration</div>
                    <div class="result-detail-value">${booking.duration}h</div>
                </div>
            </div>
            
            <div class="result-actions">
                <button class="result-action-btn edit-result-btn" onclick="openEditModal('${booking.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="result-action-btn delete-result-btn" onclick="deleteBooking('${booking.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                ${booking.status === 'pending_payment' ? `
                    <button class="result-action-btn confirm-result-btn" onclick="confirmBooking('${booking.id}')">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                ` : ''}
                ${booking.status === 'confirmed' ? `
                    <button class="result-action-btn cancel-result-btn" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-ban"></i> Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Edit Booking
async function openEditModal(bookingId) {
    try {
        showLoadingToast('Loading booking details...');
        
        // Search for the specific booking
        const response = await fetch('/admin/api/search-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method: 'id', value: bookingId })
        });
        
        const result = await response.json();
        
        if (result.success && result.bookings.length > 0) {
            const booking = result.bookings[0];
            populateEditForm(booking);
            document.getElementById('edit-booking-modal-overlay').classList.remove('hidden');
            hideLoadingToast();
        } else {
            throw new Error('Booking not found');
        }
        
    } catch (error) {
        console.error('Edit modal error:', error);
        showErrorToast('Failed to load booking details: ' + error.message);
    }
}

function populateEditForm(booking) {
    currentEditBooking = booking;
    
    document.getElementById('edit-booking-id').value = booking.id;
    document.getElementById('edit-sport').value = booking.sport;
    updateEditCourtOptions();
    document.getElementById('edit-court').value = booking.court;
    document.getElementById('edit-date').value = booking.date;
    document.getElementById('edit-start-time').value = booking.startTime;
    document.getElementById('edit-duration').value = booking.duration;
    document.getElementById('edit-player-name').value = booking.playerName;
    document.getElementById('edit-player-phone').value = booking.playerPhone;
    document.getElementById('edit-player-email').value = booking.playerEmail || '';
    document.getElementById('edit-player-count').value = booking.playerCount || '2';
    document.getElementById('edit-status').value = booking.status;
    document.getElementById('edit-total-amount').value = booking.totalAmount;
    document.getElementById('edit-special-requests').value = booking.specialRequests || '';
}

function closeEditModal() {
    document.getElementById('edit-booking-modal-overlay').classList.add('hidden');
    document.getElementById('edit-booking-form').reset();
    currentEditBooking = null;
}

async function handleUpdateBooking(event) {
    event.preventDefault();
    
    try {
        const bookingData = {
            bookingId: document.getElementById('edit-booking-id').value,
            sport: document.getElementById('edit-sport').value,
            court: document.getElementById('edit-court').value,
            courtName: getCourtName(document.getElementById('edit-court').value),
            date: document.getElementById('edit-date').value,
            startTime: document.getElementById('edit-start-time').value,
            duration: parseFloat(document.getElementById('edit-duration').value),
            playerName: document.getElementById('edit-player-name').value,
            playerPhone: document.getElementById('edit-player-phone').value,
            playerEmail: document.getElementById('edit-player-email').value,
            playerCount: document.getElementById('edit-player-count').value,
            status: document.getElementById('edit-status').value,
            totalAmount: parseInt(document.getElementById('edit-total-amount').value),
            specialRequests: document.getElementById('edit-special-requests').value
        };
        
        showLoadingToast('Updating booking...');
        
        const response = await fetch('/admin/api/update-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Booking updated successfully!');
            closeEditModal();
            
            // Refresh search results if they're visible
            const searchResults = document.getElementById('search-results');
            if (searchResults.style.display !== 'none') {
                // Re-run the last search
                performSearch('id', bookingData.bookingId);
            }
        } else {
            throw new Error(result.message || 'Failed to update booking');
        }
        
    } catch (error) {
        console.error('Update booking error:', error);
        showErrorToast('Failed to update booking: ' + error.message);
    }
}

// Booking Actions
async function confirmBooking(bookingId) {
    await performBookingAction(bookingId, 'confirm', 'confirm this booking');
}

async function cancelBooking(bookingId) {
    await performBookingAction(bookingId, 'cancel', 'cancel this booking');
}

async function deleteBooking(bookingId) {
    showConfirmationModal(
        'Delete Booking',
        'Are you sure you want to delete this booking? This action cannot be undone.',
        () => performDeleteBooking(bookingId)
    );
}

async function performBookingAction(bookingId, action, confirmText) {
    const confirmed = confirm(`Are you sure you want to ${confirmText}?`);
    if (!confirmed) return;
    
    try {
        showLoadingToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing booking...`);
        
        const response = await fetch('/admin/api/admin-booking-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookingId: bookingId,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast(`Booking ${action}ed successfully!`);
            
            // Refresh search results
            const searchResults = document.getElementById('search-results');
            if (searchResults.style.display !== 'none') {
                performSearch('id', bookingId);
            }
        } else {
            throw new Error(result.message || `Failed to ${action} booking`);
        }
        
    } catch (error) {
        console.error(`${action} booking error:`, error);
        showErrorToast(`Failed to ${action} booking: ` + error.message);
    }
}

async function performDeleteBooking(bookingId) {
    try {
        showLoadingToast('Deleting booking...');
        
        const response = await fetch('/admin/api/delete-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookingId: bookingId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Booking deleted successfully!');
            
            // Remove from results
            const resultItems = document.querySelectorAll('.result-item');
            resultItems.forEach(item => {
                if (item.innerHTML.includes(`Booking #${bookingId}`)) {
                    item.remove();
                }
            });
            
            // Check if no results left
            const remainingResults = document.querySelectorAll('.result-item');
            if (remainingResults.length === 0) {
                document.getElementById('results-container').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #6c757d;">
                        <p>No bookings found.</p>
                    </div>
                `;
            }
        } else {
            throw new Error(result.message || 'Failed to delete booking');
        }
        
    } catch (error) {
        console.error('Delete booking error:', error);
        showErrorToast('Failed to delete booking: ' + error.message);
    }
}

// Bulk Operations
async function loadBulkBookings() {
    try {
        const filterData = {
            status: document.getElementById('bulk-status').value,
            sport: document.getElementById('bulk-sport').value,
            dateFrom: document.getElementById('bulk-date-from').value,
            dateTo: document.getElementById('bulk-date-to').value
        };
        
        showLoadingToast('Loading bookings...');
        
        const response = await fetch('/admin/api/bulk-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filterData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayBulkResults(result.bookings);
            document.getElementById('bulk-actions').style.display = 'flex';
            hideLoadingToast();
        } else {
            throw new Error(result.message || 'Failed to load bookings');
        }
        
    } catch (error) {
        console.error('Bulk load error:', error);
        showErrorToast('Failed to load bookings: ' + error.message);
    }
}

function displayBulkResults(bookings) {
    const bulkResults = document.getElementById('bulk-results');
    
    if (bookings.length === 0) {
        bulkResults.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6c757d;">
                <p>No bookings found matching the selected criteria.</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="bulk-table">
            <thead>
                <tr>
                    <th style="width: 50px;">
                        <input type="checkbox" id="select-all-bookings" onchange="toggleSelectAll()">
                    </th>
                    <th>Booking ID</th>
                    <th>Player</th>
                    <th>Sport & Court</th>
                    <th>Date & Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => createBulkResultRow(booking)).join('')}
            </tbody>
        </table>
    `;
    
    bulkResults.innerHTML = tableHTML;
    updateSelectedCount();
}

function createBulkResultRow(booking) {
    const statusClass = booking.status.replace('_', '-');
    const statusText = booking.status === 'pending_payment' ? 'Pending Payment' : 
                     booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled';
    
    return `
        <tr>
            <td>
                <input type="checkbox" class="bulk-checkbox" value="${booking.id}" onchange="updateSelectedCount()">
            </td>
            <td><strong>${booking.id}</strong></td>
            <td>
                <div>${booking.playerName}</div>
                <div style="font-size: 0.9rem; color: #6c757d;">${booking.playerPhone}</div>
            </td>
            <td>
                <div><strong>${booking.sport.toUpperCase()}</strong></div>
                <div style="font-size: 0.9rem; color: #6c757d;">${booking.courtName}</div>
            </td>
            <td>${booking.formatted_time}</td>
            <td><strong>PKR ${booking.totalAmount.toLocaleString()}</strong></td>
            <td><span class="result-status status-${statusClass}">${statusText}</span></td>
        </tr>
    `;
}

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-bookings');
    const checkboxes = document.querySelectorAll('.bulk-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.bulk-checkbox:checked');
    const count = checkboxes.length;
    
    document.getElementById('selected-count').textContent = count;
    
    // Update selected set
    selectedBookings.clear();
    checkboxes.forEach(checkbox => {
        selectedBookings.add(checkbox.value);
    });
    
    // Enable/disable bulk action buttons
    const bulkActionButtons = document.querySelectorAll('.bulk-action-btn');
    bulkActionButtons.forEach(btn => {
        btn.disabled = count === 0;
        btn.style.opacity = count === 0 ? '0.5' : '1';
    });
}

async function bulkConfirm() {
    if (selectedBookings.size === 0) return;
    
    const confirmed = confirm(`Confirm ${selectedBookings.size} selected bookings?`);
    if (!confirmed) return;
    
    await performBulkAction('confirm');
}

async function bulkCancel() {
    if (selectedBookings.size === 0) return;
    
    const confirmed = confirm(`Cancel ${selectedBookings.size} selected bookings?`);
    if (!confirmed) return;
    
    await performBulkAction('cancel');
}

async function bulkDelete() {
    if (selectedBookings.size === 0) return;
    
    showConfirmationModal(
        'Delete Selected Bookings',
        `Are you sure you want to delete ${selectedBookings.size} selected bookings? This action cannot be undone.`,
        () => performBulkAction('delete')
    );
}

async function performBulkAction(action) {
    try {
        showLoadingToast(`Performing bulk ${action}...`);
        
        const response = await fetch('/admin/api/bulk-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                bookingIds: Array.from(selectedBookings)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast(result.message);
            
            // Reload bulk results
            loadBulkBookings();
            
            // Clear selections
            selectedBookings.clear();
            updateSelectedCount();
        } else {
            throw new Error(result.message || `Failed to perform bulk ${action}`);
        }
        
    } catch (error) {
        console.error(`Bulk ${action} error:`, error);
        showErrorToast(`Failed to perform bulk ${action}: ` + error.message);
    }
}

// Confirmation Modal
function showConfirmationModal(title, message, onConfirm) {
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirm-action-btn');
    confirmBtn.onclick = () => {
        closeConfirmationModal();
        onConfirm();
    };
    
    document.getElementById('confirmation-modal-overlay').classList.remove('hidden');
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal-overlay').classList.add('hidden');
}

function handleConfirmationOverlayClick(event) {
    if (event.target === event.currentTarget) {
        closeConfirmationModal();
    }
}

// Utility Functions
function getCourtName(courtId) {
    for (const sport in COURT_CONFIG) {
        const court = COURT_CONFIG[sport].find(c => c.id === courtId);
        if (court) return court.name;
    }
    return courtId;
}

// Toast Functions
let currentToast = null;

function showLoadingToast(message) {
    showToast(message, 'info', 0);
}

function showSuccessToast(message) {
    showToast(message, 'success', 3000);
}

function showErrorToast(message) {
    showToast(message, 'error', 5000);
}

function hideLoadingToast() {
    if (currentToast && currentToast.classList.contains('toast-info')) {
        currentToast.remove();
        currentToast = null;
    }
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    if (currentToast) {
        currentToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        ${duration > 0 ? `<button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>` : ''}
    `;

    // Add toast styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getToastColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);
    currentToast = toast;

    // Auto-remove toast after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    toast.remove();
                    if (currentToast === toast) currentToast = null;
                }, 300);
            }
        }, duration);
    }
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

function getToastColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
        warning: '#ffc107'
    };
    return colors[type] || colors.info;
}

// Add CSS animations if not already added
if (!document.querySelector('#booking-control-styles')) {
    const style = document.createElement('style');
    style.id = 'booking-control-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            opacity: 0.8;
            transition: opacity 0.3s ease;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}