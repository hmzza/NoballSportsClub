// admin_schedule.js
// Admin Schedule Management functionality

let currentDate = new Date();
let currentView = 'week'; // 'week' or 'day'
let scheduleData = {};
let selectedSlot = null;

// Court configurations
const COURT_CONFIG = {
    padel: [
        { id: 'padel-1', name: 'Court 1: Purple Mondo', pricing: 5500 },
        { id: 'padel-2', name: 'Court 2: Teracotta', pricing: 5500 }
    ],
    cricket: [
        { id: 'cricket-1', name: 'Court 1: 110x50ft', pricing: 3000 },
        { id: 'cricket-2', name: 'Court 2: 130x60ft', pricing: 3000 }
    ],
    futsal: [
        { id: 'futsal-1', name: 'Court 1: 130x60ft', pricing: 2500 }
    ],
    pickleball: [
        { id: 'pickleball-1', name: 'Court 1: Professional', pricing: 2500 }
    ]
};

// Time slots (30-minute intervals)
const TIME_SLOTS = [];
for (let hour = 6; hour < 24; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
}
// Add early morning slots (midnight to 6 AM)
for (let hour = 0; hour < 6; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSchedule();
    setupEventListeners();
    
    // Hide all modals on page load
    hideAllModals();
    
    // Load schedule data after a short delay to ensure DOM is ready
    setTimeout(() => {
        loadScheduleData();
    }, 100);
});

function hideAllModals() {
    // Hide all modals that might be visible
    const modals = [
        'slot-modal-overlay',
        'quick-book-modal-overlay', 
        'block-slot-modal-overlay'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });
    
    // Reset selected slot
    selectedSlot = null;
}

function initializeSchedule() {
    // Set current date
    const dateInput = document.getElementById('schedule-date');
    dateInput.value = currentDate.toISOString().split('T')[0];
    updateDateDisplay();
    
    // Set date limits
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90); // 3 months ahead
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

function setupEventListeners() {
    // Date navigation
    document.getElementById('prev-week').addEventListener('click', () => navigateDate(-7));
    document.getElementById('next-week').addEventListener('click', () => navigateDate(7));
    document.getElementById('schedule-date').addEventListener('change', handleDateChange);
    
    // View toggle
    document.getElementById('week-view').addEventListener('click', () => switchView('week'));
    document.getElementById('day-view').addEventListener('click', () => switchView('day'));
    
    // Filters
    document.getElementById('sport-filter').addEventListener('change', filterSchedule);
    document.getElementById('refresh-schedule').addEventListener('click', refreshSchedule);
    
    // Modal controls
    document.getElementById('close-modal').addEventListener('click', closeSlotModal);
    document.getElementById('slot-modal-overlay').addEventListener('click', handleModalOverlayClick);
    
    // Slot actions
    document.getElementById('book-slot-btn').addEventListener('click', openQuickBookModal);
    document.getElementById('block-slot-btn').addEventListener('click', openBlockSlotModal);
    document.getElementById('save-comment-btn').addEventListener('click', saveSlotComment);
    
    // Booking actions
    document.getElementById('confirm-booking-btn').addEventListener('click', confirmBookingFromSchedule);
    document.getElementById('decline-booking-btn').addEventListener('click', declineBookingFromSchedule);
    document.getElementById('cancel-booking-btn').addEventListener('click', cancelBookingFromSchedule);
    document.getElementById('edit-booking-btn').addEventListener('click', editBookingFromSchedule);
    
    // Quick book modal
    document.getElementById('close-quick-book-modal').addEventListener('click', closeQuickBookModal);
    document.getElementById('cancel-quick-book').addEventListener('click', closeQuickBookModal);
    document.getElementById('quick-book-form').addEventListener('submit', handleQuickBook);
    
    // Block slot modal
    document.getElementById('close-block-modal').addEventListener('click', closeBlockSlotModal);
    document.getElementById('cancel-block').addEventListener('click', closeBlockSlotModal);
    document.getElementById('block-slot-form').addEventListener('submit', handleBlockSlot);
    
    // Unblock action
    document.getElementById('unblock-slot-btn').addEventListener('click', unblockSlot);
}

async function loadScheduleData() {
    showLoading(true);
    try {
        const startDate = getWeekStartDate(currentDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (currentView === 'week' ? 6 : 0));
        
        console.log('Loading schedule data for:', {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            sport: document.getElementById('sport-filter').value
        });
        
        const response = await fetch('/admin/api/schedule-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                sport: document.getElementById('sport-filter').value
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Schedule data received:', data);
        
        if (data.success) {
            scheduleData = data.schedule;
            renderSchedule();
        } else {
            throw new Error(data.message || 'Failed to load schedule');
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        showErrorToast('Failed to load schedule data: ' + error.message);
        
        // Show empty schedule on error
        scheduleData = {};
        renderSchedule();
    } finally {
        showLoading(false);
    }
}

function renderSchedule() {
    const grid = document.getElementById('schedule-grid');
    if (!grid) {
        console.error('Schedule grid not found');
        return;
    }
    
    grid.innerHTML = '';
    grid.className = `schedule-grid ${currentView}-view`;
    
    try {
        if (currentView === 'week') {
            renderWeekView(grid);
        } else {
            renderDayView(grid);
        }
        console.log('Schedule rendered successfully');
    } catch (error) {
        console.error('Error rendering schedule:', error);
        grid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Error rendering schedule</div>';
    }
}

function renderWeekView(grid) {
    const startDate = getWeekStartDate(currentDate);
    const days = ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Calculate grid template
    const timeSlotCount = TIME_SLOTS.length;
    grid.style.gridTemplateColumns = '80px repeat(7, 1fr)';
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 40px)`;
    
    // Create headers
    days.forEach((day, index) => {
        const header = document.createElement('div');
        if (index === 0) {
            header.className = 'time-header';
            header.textContent = day;
        } else {
            header.className = 'day-header';
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (index - 1));
            header.innerHTML = `
                <div>${day}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">
                    ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
            `;
        }
        grid.appendChild(header);
    });
    
    // Create time slots
    TIME_SLOTS.forEach((time, timeIndex) => {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-header';
        timeLabel.textContent = formatTime(time);
        grid.appendChild(timeLabel);
        
        // Day slots
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const slotDate = new Date(startDate);
            slotDate.setDate(startDate.getDate() + dayOffset);
            const dateStr = slotDate.toISOString().split('T')[0];
            
            const slot = createTimeSlot(dateStr, time, 'all-courts', timeIndex);
            grid.appendChild(slot);
        }
    });
}

function renderDayView(grid) {
    const courts = getAllCourts();
    const dateStr = currentDate.toISOString().split('T')[0];
    const timeSlotCount = TIME_SLOTS.length;
    
    // Calculate grid template
    grid.style.gridTemplateColumns = `100px repeat(${courts.length}, 1fr)`;
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 50px)`;
    
    // Create headers
    const timeHeader = document.createElement('div');
    timeHeader.className = 'time-header';
    timeHeader.textContent = 'Time';
    grid.appendChild(timeHeader);
    
    courts.forEach(court => {
        const courtHeader = document.createElement('div');
        courtHeader.className = 'court-header';
        courtHeader.innerHTML = `
            <div>${court.sport.toUpperCase()}</div>
            <div style="font-size: 0.8rem; opacity: 0.9;">${court.name}</div>
        `;
        grid.appendChild(courtHeader);
    });
    
    // Create time slots
    TIME_SLOTS.forEach((time, timeIndex) => {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-header';
        timeLabel.textContent = formatTime(time);
        grid.appendChild(timeLabel);
        
        // Court slots
        courts.forEach(court => {
            const slot = createTimeSlot(dateStr, time, court.id, timeIndex);
            grid.appendChild(slot);
        });
    });
}

function createTimeSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement('div');
    slot.className = 'time-slot available'; // Default to available
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;
    
    // Get slot data from scheduleData
    const slotData = getSlotData(date, time, courtId);
    
    if (slotData) {
        slot.className = `time-slot ${slotData.status}`;
        slot.innerHTML = `
            <div class="slot-content">
                <div class="slot-title">${slotData.title}</div>
                ${slotData.subtitle ? `<div class="slot-subtitle">${slotData.subtitle}</div>` : ''}
            </div>
        `;
    } else {
        slot.innerHTML = `
            <div class="slot-content">
                <div class="slot-title">Available</div>
                <div class="slot-time" style="font-size: 0.7rem;">${formatTime(time)}</div>
            </div>
        `;
    }
    
    // Add click event (only if not disabled)
    slot.addEventListener('click', () => {
        console.log('Slot clicked:', { date, time, courtId, slotData });
        openSlotModal(slot, slotData);
    });
    
    return slot;
}

function getSlotData(date, time, courtId) {
    if (!scheduleData[date]) return null;
    
    // First check direct court booking
    if (scheduleData[date][courtId] && scheduleData[date][courtId][time]) {
        return scheduleData[date][courtId][time];
    }
    
    // Check for multi-purpose court conflicts
    if (courtId in MULTI_PURPOSE_COURTS) {
        const multiCourtType = MULTI_PURPOSE_COURTS[courtId];
        
        // Find other courts that share this multi-purpose space
        const conflictingCourts = Object.keys(MULTI_PURPOSE_COURTS).filter(
            otherCourtId => MULTI_PURPOSE_COURTS[otherCourtId] === multiCourtType && otherCourtId !== courtId
        );
        
        // Check if any conflicting court has a booking at this time
        for (const conflictCourt of conflictingCourts) {
            if (scheduleData[date][conflictCourt] && scheduleData[date][conflictCourt][time]) {
                const conflictData = scheduleData[date][conflictCourt][time];
                return {
                    ...conflictData,
                    title: `${conflictData.title} (${conflictCourt.includes('cricket') ? 'Cricket' : 'Futsal'})`,
                    subtitle: `${conflictData.subtitle} - Multi Court Booked`,
                    status: 'booked-conflict' // Special status for multi-court conflicts
                };
            }
        }
    }
    
    return null; // Available
}

function getAllCourts() {
    const sportFilter = document.getElementById('sport-filter').value;
    let courts = [];
    
    if (sportFilter) {
        // Show only courts for the selected sport
        courts = COURT_CONFIG[sportFilter].map(court => ({
            ...court,
            sport: sportFilter
        }));
    } else {
        // Show all courts in proper order: Padel, Cricket, Futsal, Pickleball
        const sportOrder = ['padel', 'cricket', 'futsal', 'pickleball'];
        
        sportOrder.forEach(sport => {
            COURT_CONFIG[sport].forEach(court => {
                courts.push({
                    ...court,
                    sport: sport
                });
            });
        });
    }
    
    return courts;
}

function openSlotModal(slotElement, slotData) {
    selectedSlot = {
        element: slotElement,
        date: slotElement.dataset.date,
        time: slotElement.dataset.time,
        court: slotElement.dataset.court,
        data: slotData
    };
    
    const modal = document.getElementById('slot-modal');
    const overlay = document.getElementById('slot-modal-overlay');
    
    // Update modal content
    updateSlotModalContent(slotData);
    
    // Show modal
    overlay.classList.remove('hidden');
    modal.style.animation = 'slideInUp 0.3s ease';
}

function updateSlotModalContent(slotData) {
    const isAvailable = !slotData;
    const isBooked = slotData && (slotData.status === 'booked-pending' || slotData.status === 'booked-confirmed');
    const isBlocked = slotData && slotData.status === 'blocked';
    
    // Update basic info
    document.getElementById('modal-court').textContent = getCourtName(selectedSlot.court);
    document.getElementById('modal-datetime').textContent = `${formatDate(selectedSlot.date)} at ${formatTime(selectedSlot.time)}`;
    
    // Update status
    const statusElement = document.getElementById('modal-status');
    if (isAvailable) {
        statusElement.textContent = 'Available';
        statusElement.className = 'status-badge available';
    } else {
        statusElement.textContent = getStatusText(slotData.status);
        statusElement.className = `status-badge ${slotData.status}`;
    }
    
    // Show/hide sections
    document.getElementById('available-actions').style.display = isAvailable ? 'block' : 'none';
    document.getElementById('booking-details').style.display = isBooked ? 'block' : 'none';
    document.getElementById('blocked-actions').style.display = isBlocked ? 'block' : 'none';
    
    if (isBooked) {
        updateBookingDetails(slotData);
    }
    
    if (isBlocked) {
        document.getElementById('modal-block-reason').textContent = slotData.reason || 'Not specified';
    }
}

function updateBookingDetails(slotData) {
    document.getElementById('modal-booking-id').textContent = slotData.bookingId || 'N/A';
    document.getElementById('modal-player').textContent = slotData.playerName || 'N/A';
    document.getElementById('modal-phone').textContent = slotData.playerPhone || 'N/A';
    document.getElementById('modal-amount').textContent = `PKR ${(slotData.amount || 0).toLocaleString()}`;
    document.getElementById('modal-duration').textContent = `${slotData.duration || 1} hour(s)`;
    
    // Load existing comments
    document.getElementById('slot-comments').value = slotData.comments || '';
    
    // Show/hide action buttons based on status
    const isPending = slotData.status === 'booked-pending';
    const isConfirmed = slotData.status === 'booked-confirmed';
    
    document.getElementById('confirm-booking-btn').style.display = isPending ? 'inline-block' : 'none';
    document.getElementById('decline-booking-btn').style.display = isPending ? 'inline-block' : 'none';
    document.getElementById('cancel-booking-btn').style.display = isConfirmed ? 'inline-block' : 'none';
}

function closeSlotModal() {
    const overlay = document.getElementById('slot-modal-overlay');
    const modal = document.getElementById('slot-modal');
    
    modal.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => {
        overlay.classList.add('hidden');
        selectedSlot = null;
    }, 300);
}

function handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) {
        closeSlotModal();
    }
}

// Navigation functions
function navigateDate(days) {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    currentDate = newDate;
    
    document.getElementById('schedule-date').value = currentDate.toISOString().split('T')[0];
    updateDateDisplay();
    loadScheduleData();
}

function handleDateChange(event) {
    currentDate = new Date(event.target.value);
    updateDateDisplay();
    loadScheduleData();
}

function switchView(view) {
    if (currentView === view) return;
    
    currentView = view;
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    loadScheduleData();
}

function updateDateDisplay() {
    const display = document.getElementById('date-display');
    if (currentView === 'week') {
        const startDate = getWeekStartDate(currentDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        display.textContent = `Week of ${startDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        })} - ${endDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        })}`;
    } else {
        display.textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function getWeekStartDate(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    return start;
}

// Filter and refresh functions
function filterSchedule() {
    loadScheduleData();
}

function refreshSchedule() {
    const btn = document.getElementById('refresh-schedule');
    const icon = btn.querySelector('i');
    
    icon.style.animation = 'spin 1s linear infinite';
    
    loadScheduleData().finally(() => {
        icon.style.animation = '';
    });
}

// Quick booking functions
function openQuickBookModal() {
    document.getElementById('quick-book-modal-overlay').classList.remove('hidden');
    closeSlotModal();
}

function closeQuickBookModal() {
    document.getElementById('quick-book-modal-overlay').classList.add('hidden');
    document.getElementById('quick-book-form').reset();
}

async function handleQuickBook(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const bookingData = {
            court: selectedSlot.court,
            date: selectedSlot.date,
            startTime: selectedSlot.time,
            duration: parseFloat(document.getElementById('quick-duration').value),
            playerName: document.getElementById('quick-player-name').value,
            playerPhone: document.getElementById('quick-player-phone').value,
            playerEmail: document.getElementById('quick-player-email').value,
            playerCount: document.getElementById('quick-player-count').value,
            status: document.getElementById('quick-payment-status').value,
            specialRequests: document.getElementById('quick-comments').value
        };
        
        const response = await fetch('/admin/api/admin-create-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Booking created successfully!');
            closeQuickBookModal();
            loadScheduleData();
        } else {
            throw new Error(result.message || 'Failed to create booking');
        }
    } catch (error) {
        console.error('Quick book error:', error);
        showErrorToast('Failed to create booking: ' + error.message);
    }
}

// Block slot functions
function openBlockSlotModal() {
    document.getElementById('block-slot-modal-overlay').classList.remove('hidden');
    closeSlotModal();
}

function closeBlockSlotModal() {
    document.getElementById('block-slot-modal-overlay').classList.add('hidden');
    document.getElementById('block-slot-form').reset();
}

async function handleBlockSlot(event) {
    event.preventDefault();
    
    try {
        const blockData = {
            court: selectedSlot.court,
            date: selectedSlot.date,
            startTime: selectedSlot.time,
            duration: parseFloat(document.getElementById('block-duration').value),
            reason: document.getElementById('block-reason').value,
            notes: document.getElementById('block-notes').value
        };
        
        const response = await fetch('/admin/api/admin-block-slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(blockData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Slot blocked successfully!');
            closeBlockSlotModal();
            loadScheduleData();
        } else {
            throw new Error(result.message || 'Failed to block slot');
        }
    } catch (error) {
        console.error('Block slot error:', error);
        showErrorToast('Failed to block slot: ' + error.message);
    }
}

async function unblockSlot() {
    try {
        const confirmed = confirm('Are you sure you want to unblock this slot?');
        if (!confirmed) return;
        
        const response = await fetch('/admin/api/admin-unblock-slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                court: selectedSlot.court,
                date: selectedSlot.date,
                time: selectedSlot.time
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Slot unblocked successfully!');
            closeSlotModal();
            loadScheduleData();
        } else {
            throw new Error(result.message || 'Failed to unblock slot');
        }
    } catch (error) {
        console.error('Unblock slot error:', error);
        showErrorToast('Failed to unblock slot: ' + error.message);
    }
}

// Comment functions
async function saveSlotComment() {
    try {
        const comment = document.getElementById('slot-comments').value;
        
        const response = await fetch('/admin/api/save-slot-comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookingId: selectedSlot.data.bookingId,
                comment: comment
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('Comment saved successfully!');
            selectedSlot.data.comments = comment;
        } else {
            throw new Error(result.message || 'Failed to save comment');
        }
    } catch (error) {
        console.error('Save comment error:', error);
        showErrorToast('Failed to save comment: ' + error.message);
    }
}

// Booking action functions
async function confirmBookingFromSchedule() {
    await performBookingAction('confirm', 'confirm this booking');
}

async function declineBookingFromSchedule() {
    await performBookingAction('decline', 'decline this booking');
}

async function cancelBookingFromSchedule() {
    await performBookingAction('cancel', 'cancel this booking');
}

async function performBookingAction(action, confirmText) {
    try {
        const confirmed = confirm(`Are you sure you want to ${confirmText}?`);
        if (!confirmed) return;
        
        const response = await fetch(`/admin/api/admin-booking-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookingId: selectedSlot.data.bookingId,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast(`Booking ${action}ed successfully!`);
            closeSlotModal();
            loadScheduleData();
        } else {
            throw new Error(result.message || `Failed to ${action} booking`);
        }
    } catch (error) {
        console.error(`${action} booking error:`, error);
        showErrorToast(`Failed to ${action} booking: ` + error.message);
    }
}

function editBookingFromSchedule() {
    // Navigate to booking control with booking ID
    window.location.href = `/admin/booking-control?booking=${selectedSlot.data.bookingId}`;
}

// Utility functions
function formatTime(time) {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getCourtName(courtId) {
    if (courtId === 'all-courts') return 'All Courts';
    
    for (const sport in COURT_CONFIG) {
        const court = COURT_CONFIG[sport].find(c => c.id === courtId);
        if (court) return court.name;
    }
    return courtId;
}

function getStatusText(status) {
    const statusMap = {
        'available': 'Available',
        'booked-pending': 'Pending Payment',
        'booked-confirmed': 'Confirmed',
        'blocked': 'Blocked'
    };
    return statusMap[status] || status;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showToast(message, type) {
    // Create toast (same as dashboard)
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
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

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideOutDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);