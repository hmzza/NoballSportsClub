// Booking System JavaScript

let currentStep = 1;
let bookingData = {
    sport: '',
    court: '',
    courtName: '',
    date: '',
    time: '',
    playerName: '',
    playerPhone: '',
    playerEmail: '',
    playerCount: '',
    specialRequests: '',
    paymentType: 'advance',
    totalAmount: 2500
};

// Court mapping for multi-purpose courts
const MULTI_PURPOSE_COURTS = {
    'cricket-2': 'multi-130x60', // Cricket Court 2 (130x60ft)
    'futsal-1': 'multi-130x60'   // Futsal Court 1 (130x60ft)
};

// Time slots (6 AM to 11 PM)
const TIME_SLOTS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

// Initialize booking system
document.addEventListener('DOMContentLoaded', function() {
    initializeDateSelector();
    setupEventListeners();
    updateProgressBar();
});

function initializeDateSelector() {
    const dateInput = document.getElementById('booking-date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30); // Allow booking up to 30 days ahead
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    dateInput.value = today.toISOString().split('T')[0];
    
    bookingData.date = dateInput.value;
}

function setupEventListeners() {
    // Sport and court selection
    document.querySelectorAll('.sport-card').forEach(card => {
        card.addEventListener('click', selectSport);
    });

    // Date change
    document.getElementById('booking-date').addEventListener('change', function() {
        bookingData.date = this.value;
        loadTimeSlots();
    });

    // Navigation buttons
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', nextStep);
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', prevStep);
    });

    // Form validation
    document.getElementById('player-name').addEventListener('input', validateStep3);
    document.getElementById('player-phone').addEventListener('input', validateStep3);

    // Payment type selection
    document.querySelectorAll('input[name="payment-type"]').forEach(radio => {
        radio.addEventListener('change', updatePaymentAmounts);
    });

    // Final booking confirmation
    document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
}

function selectSport(event) {
    const sportCard = event.currentTarget;
    const sport = sportCard.dataset.sport;
    
    // Remove previous selections
    document.querySelectorAll('.sport-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select current sport
    sportCard.classList.add('selected');
    bookingData.sport = sport;
    
    // Setup court selection within the sport
    const courtOptions = sportCard.querySelectorAll('.court-option');
    courtOptions.forEach(option => {
        option.addEventListener('click', selectCourt);
    });
    
    validateStep1();
}

function selectCourt(event) {
    event.stopPropagation();
    const courtOption = event.currentTarget;
    const court = courtOption.dataset.court;
    const courtName = courtOption.dataset.courtName;
    
    // Remove previous court selections
    document.querySelectorAll('.court-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Select current court
    courtOption.classList.add('selected');
    bookingData.court = court;
    bookingData.courtName = courtName;
    
    validateStep1();
}

function validateStep1() {
    const nextBtn = document.querySelector('#step-1 .next-step');
    nextBtn.disabled = !(bookingData.sport && bookingData.court);
}

function validateStep2() {
    const nextBtn = document.querySelector('#step-2 .next-step');
    nextBtn.disabled = !bookingData.time;
}

function validateStep3() {
    const name = document.getElementById('player-name').value.trim();
    const phone = document.getElementById('player-phone').value.trim();
    const nextBtn = document.querySelector('#step-3 .next-step');
    
    nextBtn.disabled = !(name && phone);
}

function nextStep() {
    if (currentStep < 4) {
        // Save current step data
        saveStepData();
        
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        
        // Show next step
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        
        // Update progress bar
        updateProgressBar();
        
        // Initialize step-specific functionality
        if (currentStep === 2) {
            updateSelectedInfo();
            loadTimeSlots();
        } else if (currentStep === 3) {
            updateBookingSummary();
        } else if (currentStep === 4) {
            updateFinalSummary();
            updatePaymentAmounts();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        
        // Show previous step
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        
        // Update progress bar
        updateProgressBar();
    }
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

function saveStepData() {
    if (currentStep === 3) {
        bookingData.playerName = document.getElementById('player-name').value.trim();
        bookingData.playerPhone = document.getElementById('player-phone').value.trim();
        bookingData.playerEmail = document.getElementById('player-email').value.trim();
        bookingData.playerCount = document.getElementById('player-count').value;
        bookingData.specialRequests = document.getElementById('special-requests').value.trim();
    }
}

function updateSelectedInfo() {
    document.getElementById('selected-sport-display').textContent = bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
    document.getElementById('selected-court-display').textContent = bookingData.courtName;
}

async function loadTimeSlots() {
    const timeSlotsContainer = document.getElementById('time-slots');
    timeSlotsContainer.innerHTML = '<div class="loading">Loading available slots...</div>';
    
    try {
        // Get booked slots from server
        const response = await fetch('/api/booked-slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                court: bookingData.court,
                date: bookingData.date
            })
        });
        
        const bookedSlots = await response.json();
        
        // Create time slot elements
        timeSlotsContainer.innerHTML = '';
        TIME_SLOTS.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = formatTime(time);
            slot.dataset.time = time;
            
            // Check if slot is booked
            if (bookedSlots.includes(time)) {
                slot.classList.add('booked');
                slot.title = 'This slot is already booked';
            } else {
                slot.addEventListener('click', selectTimeSlot);
            }
            
            timeSlotsContainer.appendChild(slot);
        });
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        timeSlotsContainer.innerHTML = '<div class="error">Error loading time slots. Please try again.</div>';
    }
}

function selectTimeSlot(event) {
    const slot = event.currentTarget;
    
    if (slot.classList.contains('booked')) return;
    
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    
    // Select current slot
    slot.classList.add('selected');
    bookingData.time = slot.dataset.time;
    
    validateStep2();
}

function formatTime(time) {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
}

function updateBookingSummary() {
    document.getElementById('summary-sport').textContent = bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
    document.getElementById('summary-court').textContent = bookingData.courtName;
    document.getElementById('summary-date').textContent = formatDate(bookingData.date);
    document.getElementById('summary-time').textContent = formatTime(bookingData.time);
    document.getElementById('summary-amount').textContent = `PKR ${bookingData.totalAmount.toLocaleString()}`;
}

function updateFinalSummary() {
    document.getElementById('final-sport').textContent = bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
    document.getElementById('final-court').textContent = bookingData.courtName;
    document.getElementById('final-datetime').textContent = `${formatDate(bookingData.date)} at ${formatTime(bookingData.time)}`;
    document.getElementById('final-name').textContent = bookingData.playerName;
    document.getElementById('final-phone').textContent = bookingData.playerPhone;
    document.getElementById('final-amount').textContent = `PKR ${bookingData.totalAmount.toLocaleString()}`;
}

function updatePaymentAmounts() {
    const advanceAmount = Math.floor(bookingData.totalAmount * 0.5);
    const fullAmount = bookingData.totalAmount;
    
    document.getElementById('advance-amount').textContent = advanceAmount.toLocaleString();
    document.getElementById('full-amount').textContent = fullAmount.toLocaleString();
    
    // Update selected payment type
    const selectedPayment = document.querySelector('input[name="payment-type"]:checked');
    bookingData.paymentType = selectedPayment.value;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function confirmBooking() {
    const confirmBtn = document.getElementById('confirm-booking');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
    
    try {
        // Save final data
        saveStepData();
        bookingData.paymentType = document.querySelector('input[name="payment-type"]:checked').value;
        
        // Submit booking to server
        const response = await fetch('/api/create-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Hide step 4 and show confirmation
            document.getElementById('step-4').style.display = 'none';
            document.getElementById('booking-confirmation').style.display = 'block';
            document.getElementById('generated-booking-id').textContent = result.bookingId;
            
            // Scroll to confirmation
            document.getElementById('booking-confirmation').scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(result.message || 'Booking failed');
        }
        
    } catch (error) {
        console.error('Booking error:', error);
        alert('Sorry, there was an error processing your booking. Please try again or contact support.');
        
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Booking';
    }
}

// Utility function to generate booking ID
function generateBookingId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NB${dateStr}${random}`;
}