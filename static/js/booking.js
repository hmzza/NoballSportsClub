// booking.js
// Booking System JavaScript

let currentStep = 1;
let bookingData = {
  sport: "",
  court: "",
  courtName: "",
  date: "",
  startTime: "",
  endTime: "",
  duration: 0, // in hours
  selectedSlots: [], // array of selected time slots
  playerName: "",
  playerPhone: "",
  playerEmail: "",
  playerCount: "",
  specialRequests: "",
  paymentType: "advance",
  totalAmount: 0,
};

// Court mapping for multi-purpose courts
const MULTI_PURPOSE_COURTS = {
  "cricket-2": "multi-130x60", // Cricket Court 2 (130x60ft)
  "futsal-1": "multi-130x60", // Futsal Court 1 (130x60ft)
};

// Pricing per hour for each sport
const SPORT_PRICING = {
  cricket: 3000,
  futsal: 2500,
  padel: 5500,
  pickleball: 2500,
};

// 30-minute time slots (24 hours - 6 AM to 5:30 AM next day)
const TIME_SLOTS = [
  // Day 1 (6 AM to 11:30 PM)
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  // Day 2 (12 AM to 5:30 AM next day)
  "00:00",
  "00:30",
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
];

// Initialize EmailJS
(function () {
  emailjs.init("uZNZEybypHzeY8duz"); // Replace with your EmailJS public key
})();

// Helper function to check if time is next day (midnight onwards)
function isNextDayTime(time) {
  const hour = parseInt(time.split(":")[0]);
  return hour >= 0 && hour <= 5;
}

// Initialize booking system
document.addEventListener("DOMContentLoaded", function () {
  initializeDateSelector();
  setupEventListeners();
  updateProgressBar();
});

function initializeDateSelector() {
  const dateInput = document.getElementById("booking-date");
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30); // Allow booking up to 30 days ahead

  dateInput.min = today.toISOString().split("T")[0];
  dateInput.max = maxDate.toISOString().split("T")[0];
  dateInput.value = today.toISOString().split("T")[0];

  bookingData.date = dateInput.value;
}

function setupEventListeners() {
  // Sport and court selection
  document.querySelectorAll(".sport-card").forEach((card) => {
    card.addEventListener("click", selectSport);
  });

  // Date change
  document
    .getElementById("booking-date")
    .addEventListener("change", function () {
      bookingData.date = this.value;
      loadTimeSlots();
    });

  // Navigation buttons
  document.querySelectorAll(".next-step").forEach((btn) => {
    btn.addEventListener("click", nextStep);
  });

  document.querySelectorAll(".prev-step").forEach((btn) => {
    btn.addEventListener("click", prevStep);
  });

  // NEW: Add step back buttons
  document.querySelectorAll(".step-back-btn").forEach((btn) => {
    btn.addEventListener("click", goBackOneStep);
  });

  // Form validation
  document
    .getElementById("player-name")
    .addEventListener("input", validateStep3);
  document
    .getElementById("player-phone")
    .addEventListener("input", validateStep3);

  // Payment type selection
  document.querySelectorAll('input[name="payment-type"]').forEach((radio) => {
    radio.addEventListener("change", updatePaymentAmounts);
  });

  // Final booking confirmation
  document
    .getElementById("confirm-booking")
    .addEventListener("click", confirmBooking);
}

function goBackOneStep() {
  if (currentStep > 1) {
    prevStep();
  } else {
    // If already on step 1, go back to home page
    window.location.href = "/";
  }
}

function selectSport(event) {
  const sportCard = event.currentTarget;
  const sport = sportCard.dataset.sport;

  // Remove previous selections
  document.querySelectorAll(".sport-card").forEach((card) => {
    card.classList.remove("selected");
  });

  // Select current sport
  sportCard.classList.add("selected");
  bookingData.sport = sport;

  // Setup court selection within the sport
  const courtOptions = sportCard.querySelectorAll(".court-option");
  courtOptions.forEach((option) => {
    option.addEventListener("click", selectCourt);
  });

  validateStep1();
}

function selectCourt(event) {
  event.stopPropagation();
  const courtOption = event.currentTarget;
  const court = courtOption.dataset.court;
  const courtName = courtOption.dataset.courtName;

  // Remove previous court selections
  document.querySelectorAll(".court-option").forEach((option) => {
    option.classList.remove("selected");
  });

  // Select current court
  courtOption.classList.add("selected");
  bookingData.court = court;
  bookingData.courtName = courtName;

  validateStep1();
}

function validateStep1() {
  const nextBtn = document.querySelector("#step-1 .next-step");
  nextBtn.disabled = !(bookingData.sport && bookingData.court);
}

function validateStep2() {
  const nextBtn = document.querySelector("#step-2 .next-step");
  // Minimum 2 slots (1 hour) required
  nextBtn.disabled = bookingData.selectedSlots.length < 2;
}

function validateStep3() {
  const name = document.getElementById("player-name").value.trim();
  const phone = document.getElementById("player-phone").value.trim();
  const nextBtn = document.querySelector("#step-3 .next-step");

  nextBtn.disabled = !(name && phone);
}

function nextStep() {
  if (currentStep < 4) {
    // Save current step data
    saveStepData();

    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove("active");

    // Show next step
    currentStep++;
    document.getElementById(`step-${currentStep}`).classList.add("active");

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
    document.getElementById(`step-${currentStep}`).classList.remove("active");

    // Show previous step
    currentStep--;
    document.getElementById(`step-${currentStep}`).classList.add("active");

    // Update progress bar
    updateProgressBar();
  }
}

function updateProgressBar() {
  document.querySelectorAll(".progress-step").forEach((step, index) => {
    const stepNumber = index + 1;

    if (stepNumber < currentStep) {
      step.classList.add("completed");
      step.classList.remove("active");
    } else if (stepNumber === currentStep) {
      step.classList.add("active");
      step.classList.remove("completed");
    } else {
      step.classList.remove("active", "completed");
    }
  });

  // Show/hide back buttons based on current step
  updateBackButtonVisibility();
}

function updateBackButtonVisibility() {
  const backButtons = document.querySelectorAll(".step-back-btn");

  backButtons.forEach((btn) => {
    const stepContainer = btn.closest(".booking-step");
    if (stepContainer) {
      const stepId = stepContainer.id;
      const stepNumber = parseInt(stepId.replace("step-", ""));

      if (stepNumber === currentStep) {
        btn.style.display = "inline-block";
        // Update button text based on step
        if (currentStep === 1) {
          btn.textContent = "← Back to Home";
        } else {
          btn.textContent = "← Previous Step";
        }
      } else {
        btn.style.display = "none";
      }
    }
  });
}

function saveStepData() {
  if (currentStep === 3) {
    bookingData.playerName = document
      .getElementById("player-name")
      .value.trim();
    bookingData.playerPhone = document
      .getElementById("player-phone")
      .value.trim();
    bookingData.playerEmail = document
      .getElementById("player-email")
      .value.trim();
    bookingData.playerCount = document.getElementById("player-count").value;
    bookingData.specialRequests = document
      .getElementById("special-requests")
      .value.trim();
  }
}

function updateSelectedInfo() {
  document.getElementById("selected-sport-display").textContent =
    bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
  document.getElementById("selected-court-display").textContent =
    bookingData.courtName;
}

async function loadTimeSlots() {
  const timeSlotsContainer = document.getElementById("time-slots");
  timeSlotsContainer.innerHTML =
    '<div class="loading">Loading available slots...</div>';

  try {
    // Get booked slots from server
    const response = await fetch("/api/booked-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        court: bookingData.court,
        date: bookingData.date,
      }),
    });

    const bookedSlots = await response.json();

    // Create time slot elements
    timeSlotsContainer.innerHTML = "";

    // Add instruction text
    const instructionDiv = document.createElement("div");
    instructionDiv.className = "time-slot-instruction";
    instructionDiv.innerHTML = `
            <p><strong>Instructions:</strong></p>
            <ul>
                <li>Each slot is 30 minutes</li>
                <li>Minimum booking: 1 hour (2 consecutive slots)</li>
                <li>Select consecutive slots for your desired duration</li>
                <li>Click on time slots to select/deselect</li>
            </ul>
        `;
    timeSlotsContainer.appendChild(instructionDiv);

    // Create slots grid with day separation
    const slotsGrid = document.createElement("div");
    slotsGrid.className = "slots-grid-container";

    // Current day slots (6 AM to 11:30 PM)
    const currentDayDiv = document.createElement("div");
    currentDayDiv.innerHTML = `<h4>Today - ${formatDate(
      bookingData.date
    )}</h4>`;
    currentDayDiv.className = "day-section";

    const currentDayGrid = document.createElement("div");
    currentDayGrid.className = "slots-grid";

    // Next day slots (12 AM to 5:30 AM)
    const nextDay = new Date(bookingData.date);
    nextDay.setDate(nextDay.getDate() + 1);

    const nextDayDiv = document.createElement("div");
    nextDayDiv.innerHTML = `<h4>Tomorrow - ${formatDate(
      nextDay.toISOString().split("T")[0]
    )}</h4>`;
    nextDayDiv.className = "day-section";

    const nextDayGrid = document.createElement("div");
    nextDayGrid.className = "slots-grid";

    TIME_SLOTS.forEach((time, index) => {
      const slot = document.createElement("div");
      slot.className = "time-slot";
      slot.textContent = formatTime(time);
      slot.dataset.time = time;
      slot.dataset.index = index;

      // Check if slot is booked
      if (bookedSlots.includes(time)) {
        slot.classList.add("booked");
        slot.title = "This slot is already booked";
      } else {
        slot.addEventListener("click", selectTimeSlot);
      }

      // Add to appropriate day grid
      if (isNextDayTime(time)) {
        nextDayGrid.appendChild(slot);
      } else {
        currentDayGrid.appendChild(slot);
      }
    });

    currentDayDiv.appendChild(currentDayGrid);
    nextDayDiv.appendChild(nextDayGrid);

    slotsGrid.appendChild(currentDayDiv);
    slotsGrid.appendChild(nextDayDiv);
    timeSlotsContainer.appendChild(slotsGrid);

    // Add selected slots display
    const selectedDisplay = document.createElement("div");
    selectedDisplay.className = "selected-slots-display";
    selectedDisplay.id = "selected-slots-display";
    timeSlotsContainer.appendChild(selectedDisplay);
  } catch (error) {
    console.error("Error loading time slots:", error);
    timeSlotsContainer.innerHTML =
      '<div class="error">Error loading time slots. Please try again.</div>';
  }
}

function selectTimeSlot(event) {
  const slot = event.currentTarget;
  const time = slot.dataset.time;
  const index = parseInt(slot.dataset.index);

  if (slot.classList.contains("booked")) return;

  if (slot.classList.contains("selected")) {
    // Trying to deselect - check if this breaks consecutiveness
    const tempSlots = bookingData.selectedSlots.filter((s) => s.time !== time);

    if (tempSlots.length > 0 && !areConsecutiveSlots(tempSlots)) {
      alert(
        "You cannot deselect this slot as it would break the consecutive booking requirement. Please deselect from the ends only."
      );
      return;
    }

    // Allow deselection
    slot.classList.remove("selected");
    bookingData.selectedSlots = tempSlots;
  } else {
    // Trying to select - check if this maintains consecutiveness
    const tempSlots = [...bookingData.selectedSlots, { time, index }];
    tempSlots.sort((a, b) => a.index - b.index);

    if (!areConsecutiveSlots(tempSlots)) {
      alert(
        "Please select consecutive time slots only. You can extend your current selection or start a new consecutive block."
      );
      return;
    }

    // Allow selection
    slot.classList.add("selected");
    bookingData.selectedSlots = tempSlots;
  }

  // Update booking data
  updateBookingTimeData();
  updateSelectedSlotsDisplay();
  validateStep2();
}

function areConsecutiveSlots(slots) {
  if (slots.length <= 1) return true;

  for (let i = 1; i < slots.length; i++) {
    if (slots[i].index !== slots[i - 1].index + 1) {
      return false;
    }
  }
  return true;
}

function updateBookingTimeData() {
  if (bookingData.selectedSlots.length === 0) {
    bookingData.startTime = "";
    bookingData.endTime = "";
    bookingData.duration = 0;
    bookingData.totalAmount = 0;
    return;
  }

  const firstSlot = bookingData.selectedSlots[0];
  const lastSlot =
    bookingData.selectedSlots[bookingData.selectedSlots.length - 1];

  bookingData.startTime = firstSlot.time;

  // Calculate end time (30 minutes after last slot)
  const endIndex = lastSlot.index + 1;
  if (endIndex < TIME_SLOTS.length) {
    bookingData.endTime = TIME_SLOTS[endIndex];
  } else {
    // Handle end time after last slot (6:00 AM next day)
    bookingData.endTime = "06:00";
  }

  // Calculate duration in hours
  bookingData.duration = bookingData.selectedSlots.length * 0.5;

  // Calculate total amount
  const hourlyRate = SPORT_PRICING[bookingData.sport] || 2500;
  bookingData.totalAmount = Math.round(hourlyRate * bookingData.duration);
}

function updateSelectedSlotsDisplay() {
  const display = document.getElementById("selected-slots-display");
  if (!display) return;

  if (bookingData.selectedSlots.length === 0) {
    display.innerHTML = "";
    return;
  }

  const startTime = formatTime(bookingData.startTime);
  const endTime = formatTime(bookingData.endTime);
  const duration = bookingData.duration;
  const amount = bookingData.totalAmount;

  // Determine if booking spans multiple days
  const startDate = bookingData.date;
  const isStartNextDay = isNextDayTime(bookingData.startTime);
  const isEndNextDay = isNextDayTime(bookingData.endTime);

  let timeDisplayText = `${startTime} - ${endTime}`;

  // Handle cross-day booking display
  if (!isStartNextDay && isEndNextDay) {
    // Booking starts today and ends tomorrow
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    timeDisplayText = `${startTime} (${formatDateShort(
      startDate
    )}) - ${endTime} (${formatDateShort(nextDay.toISOString().split("T")[0])})`;
  } else if (isStartNextDay && !isEndNextDay) {
    // Booking starts tomorrow and ends day after
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayAfter = new Date(startDate);
    dayAfter.setDate(dayAfter.getDate() + 2);
    timeDisplayText = `${startTime} (${formatDateShort(
      nextDay.toISOString().split("T")[0]
    )}) - ${endTime} (${formatDateShort(
      dayAfter.toISOString().split("T")[0]
    )})`;
  }

  display.innerHTML = `
        <div class="selected-time-info">
            <h4>Selected Time:</h4>
            <p><strong>${timeDisplayText}</strong></p>
            <p>Duration: ${duration} hour${duration !== 1 ? "s" : ""}</p>
            <p>Total Amount: <strong>PKR ${amount.toLocaleString()}</strong></p>
        </div>
    `;
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(time) {
  const [hour, minute] = time.split(":");
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour =
    hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${displayHour}:${minute} ${ampm}`;
}

function updateBookingSummary() {
  document.getElementById("summary-sport").textContent =
    bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
  document.getElementById("summary-court").textContent = bookingData.courtName;
  document.getElementById("summary-date").textContent = formatDate(
    bookingData.date
  );

  const startTime = formatTime(bookingData.startTime);
  const endTime = formatTime(bookingData.endTime);
  document.getElementById(
    "summary-time"
  ).textContent = `${startTime} - ${endTime} (${bookingData.duration}h)`;

  document.getElementById(
    "summary-amount"
  ).textContent = `PKR ${bookingData.totalAmount.toLocaleString()}`;
}

function updateFinalSummary() {
  document.getElementById("final-sport").textContent =
    bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1);
  document.getElementById("final-court").textContent = bookingData.courtName;

  const startTime = formatTime(bookingData.startTime);
  const endTime = formatTime(bookingData.endTime);

  // Handle cross-day booking display
  const startDate = bookingData.date;
  const isStartNextDay = isNextDayTime(bookingData.startTime);
  const isEndNextDay = isNextDayTime(bookingData.endTime);

  let dateTimeText;

  if (!isStartNextDay && !isEndNextDay) {
    // Same day booking
    dateTimeText = `${formatDate(startDate)} from ${startTime} to ${endTime}`;
  } else if (!isStartNextDay && isEndNextDay) {
    // Starts today, ends tomorrow
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dateTimeText = `${formatDate(startDate)} ${startTime} to ${formatDate(
      nextDay.toISOString().split("T")[0]
    )} ${endTime}`;
  } else if (isStartNextDay && !isEndNextDay) {
    // Starts tomorrow, ends day after
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayAfter = new Date(startDate);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dateTimeText = `${formatDate(
      nextDay.toISOString().split("T")[0]
    )} ${startTime} to ${formatDate(
      dayAfter.toISOString().split("T")[0]
    )} ${endTime}`;
  } else {
    // Both times are next day
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dateTimeText = `${formatDate(
      nextDay.toISOString().split("T")[0]
    )} from ${startTime} to ${endTime}`;
  }

  document.getElementById("final-datetime").textContent = dateTimeText;
  document.getElementById("final-name").textContent = bookingData.playerName;
  document.getElementById("final-phone").textContent = bookingData.playerPhone;
  document.getElementById(
    "final-amount"
  ).textContent = `PKR ${bookingData.totalAmount.toLocaleString()}`;
}

function updatePaymentAmounts() {
  const advanceAmount = Math.floor(bookingData.totalAmount * 0.5);
  const fullAmount = bookingData.totalAmount;

  document.getElementById("advance-amount").textContent =
    advanceAmount.toLocaleString();
  document.getElementById("full-amount").textContent =
    fullAmount.toLocaleString();

  // Update selected payment type
  const selectedPayment = document.querySelector(
    'input[name="payment-type"]:checked'
  );
  bookingData.paymentType = selectedPayment.value;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function checkForConflicts() {
  // Check for booking conflicts before final confirmation
  try {
    const response = await fetch("/api/check-conflicts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        court: bookingData.court,
        date: bookingData.date,
        selectedSlots: bookingData.selectedSlots,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error checking conflicts:", error);
    return { hasConflict: true, message: "Error checking availability" };
  }
}

// Helper function to format booking datetime for emails
function formatBookingDateTimeForEmail(date, startTime, endTime) {
  try {
    const bookingDate = new Date(date);
    const formattedDate = bookingDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const start12hr = formatTime(startTime);
    const end12hr = formatTime(endTime);

    // Check if booking spans multiple days
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);

    if (startHour >= 6 && endHour >= 6) {
      // Same day booking
      return `${formattedDate} from ${start12hr} to ${end12hr}`;
    } else if (startHour >= 6 && endHour <= 5) {
      // Starts today, ends tomorrow
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayFormatted = nextDay.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `${formattedDate} ${start12hr} to ${nextDayFormatted} ${end12hr}`;
    } else {
      // Both times are next day or complex case
      return `${formattedDate} from ${start12hr} to ${end12hr}`;
    }
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return `${date} from ${startTime} to ${endTime}`;
  }
}

// SINGLE CORRECT admin email function - replace both duplicate functions with this
async function sendAdminNotificationEmail(bookingData, bookingId) {
  try {
    console.log("🔄 Starting admin email process...");
    console.log("📧 EmailJS Service ID: service_y85g6ha");
    console.log("📧 EmailJS Template ID: template_ceqhxb3");

    // Format booking datetime for email
    const bookingDateTime = formatBookingDateTimeForEmail(
      bookingData.date,
      bookingData.startTime,
      bookingData.endTime
    );

    // Create admin portal links
    const baseUrl = window.location.origin;
    const adminPortalLink = `${baseUrl}/admin/bookings`;
    const confirmLink = `${baseUrl}/admin/confirm-booking/${bookingId}`;
    const declineLink = `${baseUrl}/admin/decline-booking/${bookingId}`;

    // Format payment type
    const paymentType =
      bookingData.paymentType === "advance"
        ? "50% Advance Payment"
        : "Full Payment";

    // Prepare email template parameters for admin
    const templateParams = {
      // EmailJS template variables - these must match your template exactly
      booking_id: bookingId,
      sport:
        bookingData.sport.charAt(0).toUpperCase() + bookingData.sport.slice(1),
      court_name: bookingData.courtName,
      booking_datetime: bookingDateTime,
      duration: bookingData.duration.toString(),
      total_amount: bookingData.totalAmount.toLocaleString(),
      payment_type: paymentType,
      player_name: bookingData.playerName,
      player_phone: bookingData.playerPhone,
      player_email: bookingData.playerEmail || "Not provided",
      player_count: bookingData.playerCount || "2",
      special_requests: bookingData.specialRequests || "None",
      admin_portal_link: adminPortalLink,
      confirm_link: confirmLink,
      decline_link: declineLink,
      submission_time: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      to_email: "noballarena@gmail.com",
    };

    console.log("📋 Template parameters prepared:", templateParams);

    // Send admin notification email using YOUR correct template ID
    console.log("📤 Sending admin email via EmailJS...");
    const response = await emailjs.send(
      "service_y85g6ha",
      "template_ceqhxb3", // ✅ Your correct template ID
      templateParams
    );

    console.log("✅ EmailJS Response:", response);
    console.log("✅ Admin notification email sent successfully");
    return true;
  } catch (error) {
    console.error("❌ EmailJS Error Details:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error status:", error.status);
    console.error("❌ Error text:", error.text);

    // Additional debugging
    if (error.text) {
      console.error("❌ EmailJS Error Response:", error.text);
    }

    return false;
  }
}

// Remove customer email function since you don't have customer template
// Updated confirmBooking function - admin email only
async function confirmBooking() {
  const confirmBtn = document.getElementById("confirm-booking");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Processing...";

  try {
    // Save final data
    saveStepData();
    bookingData.paymentType = document.querySelector(
      'input[name="payment-type"]:checked'
    ).value;

    // Validate that we have all required data before submitting
    if (
      !bookingData.sport ||
      !bookingData.court ||
      !bookingData.courtName ||
      !bookingData.date ||
      !bookingData.startTime ||
      !bookingData.endTime ||
      !bookingData.duration ||
      !bookingData.selectedSlots ||
      bookingData.selectedSlots.length === 0 ||
      !bookingData.playerName ||
      !bookingData.playerPhone
    ) {
      alert("Please ensure all required fields are filled out correctly.");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm Booking";
      return;
    }

    // Check for conflicts before proceeding
    confirmBtn.textContent = "Checking availability...";
    const conflictCheck = await checkForConflicts();

    if (conflictCheck.hasConflict) {
      alert(
        `Sorry, ${conflictCheck.message}. Please go back and select different time slots.`
      );
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm Booking";
      return;
    }

    // Prepare booking data for submission
    const submissionData = {
      sport: bookingData.sport,
      court: bookingData.court,
      courtName: bookingData.courtName,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      duration: bookingData.duration,
      selectedSlots: bookingData.selectedSlots,
      playerName: bookingData.playerName,
      playerPhone: bookingData.playerPhone,
      playerEmail: bookingData.playerEmail || "",
      playerCount: bookingData.playerCount || "2",
      specialRequests: bookingData.specialRequests || "",
      paymentType: bookingData.paymentType,
      totalAmount: bookingData.totalAmount,
    };

    console.log("Booking data before submission:", bookingData);
    console.log("Submission data:", submissionData);

    // Submit booking to server
    confirmBtn.textContent = "Finalizing booking...";
    const response = await fetch("/api/create-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    });

    const result = await response.json();
    console.log("Server response:", result);

    if (result.success) {
      // Hide step 4 and show confirmation
      document.getElementById("step-4").style.display = "none";
      document.getElementById("booking-confirmation").style.display = "block";
      document.getElementById("generated-booking-id").textContent =
        result.bookingId;

      // Send admin notification email only
      confirmBtn.textContent = "Sending notification to admin...";

      try {
        const adminEmailSent = await sendAdminNotificationEmail(
          bookingData,
          result.bookingId
        );
        console.log(`Admin email sent: ${adminEmailSent}`);

        if (adminEmailSent) {
          console.log("🎉 Admin has been notified via email!");
        } else {
          console.log(
            "⚠️ Admin email failed, but booking was saved successfully"
          );
        }
      } catch (adminEmailError) {
        console.error("Admin email error:", adminEmailError);
      }

      // Reset button
      confirmBtn.textContent = "Booking Confirmed ✓";
      confirmBtn.style.background = "#28a745";
      confirmBtn.style.color = "white";

      // Scroll to confirmation
      document
        .getElementById("booking-confirmation")
        .scrollIntoView({ behavior: "smooth" });

      // Log completion
      console.log("Booking process completed successfully");
    } else {
      throw new Error(result.message || "Booking failed");
    }
  } catch (error) {
    console.error("Booking error:", error);
    alert(
      `Sorry, there was an error processing your booking: ${error.message}. Please try again or contact support.`
    );

    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm Booking";
    confirmBtn.style.background = "";
    confirmBtn.style.color = "";
  }
}
// Utility function to generate booking ID
function generateBookingId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `NB${dateStr}${random}`;
}
