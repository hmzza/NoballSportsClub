// Professional Booking System JavaScript
// Clean, maintainable, and well-structured

class BookingSystem {
  constructor() {
    this.currentStep = 1;
    this.bookingData = {
      sport: "",
      court: "",
      courtName: "",
      date: "",
      startTime: "",
      endTime: "",
      duration: 0,
      selectedSlots: [],
      playerName: "",
      playerPhone: "",
      playerEmail: "",
      playerCount: "2",
      specialRequests: "",
      paymentType: "advance",
      totalAmount: 0,
    };

    this.sportPricing = {
      cricket: 3000,
      futsal: 2500,
      padel: 5500,
      pickleball: 2500,
    };

    this.timeSlots = this.generateTimeSlots();
    this.multiPurposeCourts = {
      "cricket-2": "multi-130x60",
      "futsal-1": "multi-130x60",
    };

    this.init();
  }

  generateTimeSlots() {
    const slots = [];
    // Day 1 (6 AM to 11:30 PM)
    for (let hour = 6; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    // Day 2 (12 AM to 5:30 AM next day)
    for (let hour = 0; hour < 6; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }

  init() {
    this.initializeDateSelector();
    this.setupEventListeners();
    this.updateProgressBar();
    this.initEmailJS();
  }

  initEmailJS() {
    if (typeof emailjs !== "undefined") {
      emailjs.init("uZNZEybypHzeY8duz");
    }
  }

  initializeDateSelector() {
    const dateInput = document.getElementById("booking-date");
    if (!dateInput) return;

    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);

    dateInput.min = today.toISOString().split("T")[0];
    dateInput.max = maxDate.toISOString().split("T")[0];
    dateInput.value = today.toISOString().split("T")[0];

    this.bookingData.date = dateInput.value;
  }

  setupEventListeners() {
    // Sport and court selection
    document.querySelectorAll(".sport-card").forEach((card) => {
      card.addEventListener("click", (e) => this.selectSport(e));
    });

    // Date change
    const dateInput = document.getElementById("booking-date");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        this.bookingData.date = e.target.value;
        this.loadTimeSlots();
      });
    }

    // Navigation buttons
    document.querySelectorAll(".next-step").forEach((btn) => {
      btn.addEventListener("click", () => this.nextStep());
    });

    document.querySelectorAll(".prev-step").forEach((btn) => {
      btn.addEventListener("click", () => this.prevStep());
    });

    // Step back buttons
    document.querySelectorAll(".step-back-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.goBackOneStep());
    });

    // Form validation
    const playerName = document.getElementById("player-name");
    const playerPhone = document.getElementById("player-phone");
    if (playerName)
      playerName.addEventListener("input", () => this.validateStep3());
    if (playerPhone)
      playerPhone.addEventListener("input", () => this.validateStep3());

    // Payment type selection
    document.querySelectorAll('input[name="payment-type"]').forEach((radio) => {
      radio.addEventListener("change", () => this.updatePaymentAmounts());
    });

    // Final booking confirmation
    const confirmBtn = document.getElementById("confirm-booking");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => this.confirmBooking());
    }
  }

  selectSport(event) {
    const sportCard = event.currentTarget;
    const sport = sportCard.dataset.sport;

    // Remove previous selections
    document.querySelectorAll(".sport-card").forEach((card) => {
      card.classList.remove("selected");
    });

    // Select current sport
    sportCard.classList.add("selected");
    this.bookingData.sport = sport;

    // Setup court selection
    const courtOptions = sportCard.querySelectorAll(".court-option");
    courtOptions.forEach((option) => {
      option.addEventListener("click", (e) => this.selectCourt(e));
    });

    this.validateStep1();
  }

  selectCourt(event) {
    event.stopPropagation();
    const courtOption = event.currentTarget;
    const court = courtOption.dataset.court;
    const courtName = courtOption.dataset.courtName;

    // Remove previous selections
    document.querySelectorAll(".court-option").forEach((option) => {
      option.classList.remove("selected");
    });

    // Select current court
    courtOption.classList.add("selected");
    this.bookingData.court = court;
    this.bookingData.courtName = courtName;

    this.validateStep1();
  }

  validateStep1() {
    const nextBtn = document.querySelector("#step-1 .next-step");
    if (nextBtn) {
      nextBtn.disabled = !(this.bookingData.sport && this.bookingData.court);
    }
  }

  validateStep2() {
    const nextBtn = document.querySelector("#step-2 .next-step");
    if (nextBtn) {
      nextBtn.disabled = this.bookingData.selectedSlots.length < 2;
    }
  }

  validateStep3() {
    const name = document.getElementById("player-name")?.value.trim() || "";
    const phone = document.getElementById("player-phone")?.value.trim() || "";
    const nextBtn = document.querySelector("#step-3 .next-step");

    if (nextBtn) {
      nextBtn.disabled = !(name && phone);
    }
  }

  nextStep() {
    if (this.currentStep < 4) {
      this.saveStepData();

      // Hide current step
      const currentStepEl = document.getElementById(`step-${this.currentStep}`);
      if (currentStepEl) currentStepEl.classList.remove("active");

      // Show next step
      this.currentStep++;
      const nextStepEl = document.getElementById(`step-${this.currentStep}`);
      if (nextStepEl) nextStepEl.classList.add("active");

      this.updateProgressBar();
      this.initializeCurrentStep();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      // Hide current step
      const currentStepEl = document.getElementById(`step-${this.currentStep}`);
      if (currentStepEl) currentStepEl.classList.remove("active");

      // Show previous step
      this.currentStep--;
      const prevStepEl = document.getElementById(`step-${this.currentStep}`);
      if (prevStepEl) prevStepEl.classList.add("active");

      this.updateProgressBar();
    }
  }

  goBackOneStep() {
    if (this.currentStep > 1) {
      this.prevStep();
    } else {
      window.location.href = "/";
    }
  }

  initializeCurrentStep() {
    switch (this.currentStep) {
      case 2:
        this.updateSelectedInfo();
        this.loadTimeSlots();
        break;
      case 3:
        this.updateBookingSummary();
        break;
      case 4:
        this.updateFinalSummary();
        this.updatePaymentAmounts();
        break;
    }
  }

  updateProgressBar() {
    document.querySelectorAll(".progress-step").forEach((step, index) => {
      const stepNumber = index + 1;

      if (stepNumber < this.currentStep) {
        step.classList.add("completed");
        step.classList.remove("active");
      } else if (stepNumber === this.currentStep) {
        step.classList.add("active");
        step.classList.remove("completed");
      } else {
        step.classList.remove("active", "completed");
      }
    });

    this.updateBackButtonVisibility();
  }

  updateBackButtonVisibility() {
    const backButtons = document.querySelectorAll(".step-back-btn");

    backButtons.forEach((btn) => {
      const stepContainer = btn.closest(".booking-step");
      if (stepContainer) {
        const stepId = stepContainer.id;
        const stepNumber = parseInt(stepId.replace("step-", ""));

        if (stepNumber === this.currentStep) {
          btn.style.display = "inline-block";
          btn.textContent =
            this.currentStep === 1 ? "← Back to Home" : "← Previous Step";
        } else {
          btn.style.display = "none";
        }
      }
    });
  }

  saveStepData() {
    if (this.currentStep === 3) {
      this.bookingData.playerName =
        document.getElementById("player-name")?.value.trim() || "";
      this.bookingData.playerPhone =
        document.getElementById("player-phone")?.value.trim() || "";
      this.bookingData.playerEmail =
        document.getElementById("player-email")?.value.trim() || "";
      this.bookingData.playerCount =
        document.getElementById("player-count")?.value || "2";
      this.bookingData.specialRequests =
        document.getElementById("special-requests")?.value.trim() || "";
    }
  }

  updateSelectedInfo() {
    const sportDisplay = document.getElementById("selected-sport-display");
    const courtDisplay = document.getElementById("selected-court-display");

    if (sportDisplay) {
      sportDisplay.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (courtDisplay) {
      courtDisplay.textContent = this.bookingData.courtName;
    }
  }

  async loadTimeSlots() {
    const timeSlotsContainer = document.getElementById("time-slots");
    if (!timeSlotsContainer) return;

    timeSlotsContainer.innerHTML =
      '<div class="loading">Loading available slots...</div>';

    try {
      console.log(
        `Loading slots for court: ${this.bookingData.court}, date: ${this.bookingData.date}`
      );

      const response = await fetch("/api/booked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: this.bookingData.court,
          date: this.bookingData.date,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const bookedSlots = await response.json();
      console.log(`Received ${bookedSlots.length} booked slots:`, bookedSlots);

      this.renderTimeSlots(timeSlotsContainer, bookedSlots);
    } catch (error) {
      console.error("Error loading time slots:", error);
      timeSlotsContainer.innerHTML =
        '<div class="error">Error loading time slots. Please try again.</div>';
    }
  }

  renderTimeSlots(container, bookedSlots) {
    container.innerHTML = "";

    // Add instructions
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
    container.appendChild(instructionDiv);

    // Create slots grid
    const slotsGrid = document.createElement("div");
    slotsGrid.className = "slots-grid-container";

    // Current day slots
    const currentDayDiv = document.createElement("div");
    currentDayDiv.innerHTML = `<h4>Today - ${this.formatDate(
      this.bookingData.date
    )}</h4>`;
    currentDayDiv.className = "day-section";

    const currentDayGrid = document.createElement("div");
    currentDayGrid.className = "slots-grid";

    // Next day slots
    const nextDay = new Date(this.bookingData.date);
    nextDay.setDate(nextDay.getDate() + 1);

    const nextDayDiv = document.createElement("div");
    nextDayDiv.innerHTML = `<h4>Tomorrow - ${this.formatDate(
      nextDay.toISOString().split("T")[0]
    )}</h4>`;
    nextDayDiv.className = "day-section";

    const nextDayGrid = document.createElement("div");
    nextDayGrid.className = "slots-grid";

    // Create time slot elements
    this.timeSlots.forEach((time, index) => {
      const slot = document.createElement("div");
      slot.className = "time-slot";
      slot.textContent = this.formatTime(time);
      slot.dataset.time = time;
      slot.dataset.index = index;

      // Check if slot is booked
      if (bookedSlots.includes(time)) {
        slot.classList.add("booked");
        slot.title = "This slot is already booked";
      } else {
        slot.addEventListener("click", (e) => this.selectTimeSlot(e));
      }

      // Add to appropriate day grid
      if (this.isNextDayTime(time)) {
        nextDayGrid.appendChild(slot);
      } else {
        currentDayGrid.appendChild(slot);
      }
    });

    currentDayDiv.appendChild(currentDayGrid);
    nextDayDiv.appendChild(nextDayGrid);

    slotsGrid.appendChild(currentDayDiv);
    slotsGrid.appendChild(nextDayDiv);
    container.appendChild(slotsGrid);

    // Add selected slots display
    const selectedDisplay = document.createElement("div");
    selectedDisplay.className = "selected-slots-display";
    selectedDisplay.id = "selected-slots-display";
    container.appendChild(selectedDisplay);
  }

  selectTimeSlot(event) {
    const slot = event.currentTarget;
    const time = slot.dataset.time;
    const index = parseInt(slot.dataset.index);

    if (slot.classList.contains("booked")) return;

    if (slot.classList.contains("selected")) {
      // Deselecting - check if this breaks consecutiveness
      const tempSlots = this.bookingData.selectedSlots.filter(
        (s) => s.time !== time
      );

      if (tempSlots.length > 0 && !this.areConsecutiveSlots(tempSlots)) {
        alert(
          "You cannot deselect this slot as it would break the consecutive booking requirement. Please deselect from the ends only."
        );
        return;
      }

      slot.classList.remove("selected");
      this.bookingData.selectedSlots = tempSlots;
    } else {
      // Selecting - check if this maintains consecutiveness
      const tempSlots = [...this.bookingData.selectedSlots, { time, index }];
      tempSlots.sort((a, b) => a.index - b.index);

      if (!this.areConsecutiveSlots(tempSlots)) {
        alert(
          "Please select consecutive time slots only. You can extend your current selection or start a new consecutive block."
        );
        return;
      }

      slot.classList.add("selected");
      this.bookingData.selectedSlots = tempSlots;
    }

    this.updateBookingTimeData();
    this.updateSelectedSlotsDisplay();
    this.validateStep2();
  }

  areConsecutiveSlots(slots) {
    if (slots.length <= 1) return true;

    for (let i = 1; i < slots.length; i++) {
      if (slots[i].index !== slots[i - 1].index + 1) {
        return false;
      }
    }
    return true;
  }

  updateBookingTimeData() {
    if (this.bookingData.selectedSlots.length === 0) {
      this.bookingData.startTime = "";
      this.bookingData.endTime = "";
      this.bookingData.duration = 0;
      this.bookingData.totalAmount = 0;
      return;
    }

    const firstSlot = this.bookingData.selectedSlots[0];
    const lastSlot =
      this.bookingData.selectedSlots[this.bookingData.selectedSlots.length - 1];

    this.bookingData.startTime = firstSlot.time;

    // Calculate end time (30 minutes after last slot)
    const endIndex = lastSlot.index + 1;
    if (endIndex < this.timeSlots.length) {
      this.bookingData.endTime = this.timeSlots[endIndex];
    } else {
      this.bookingData.endTime = "06:00";
    }

    // Calculate duration and amount
    this.bookingData.duration = this.bookingData.selectedSlots.length * 0.5;
    const hourlyRate = this.sportPricing[this.bookingData.sport] || 2500;
    this.bookingData.totalAmount = Math.round(
      hourlyRate * this.bookingData.duration
    );
  }

  updateSelectedSlotsDisplay() {
    const display = document.getElementById("selected-slots-display");
    if (!display) return;

    if (this.bookingData.selectedSlots.length === 0) {
      display.innerHTML = "";
      return;
    }

    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime = this.formatTime(this.bookingData.endTime);
    const duration = this.bookingData.duration;
    const amount = this.bookingData.totalAmount;

    let timeDisplayText = `${startTime} - ${endTime}`;

    // Handle cross-day booking display
    const isStartNextDay = this.isNextDayTime(this.bookingData.startTime);
    const isEndNextDay = this.isNextDayTime(this.bookingData.endTime);

    if (!isStartNextDay && isEndNextDay) {
      const nextDay = new Date(this.bookingData.date);
      nextDay.setDate(nextDay.getDate() + 1);
      timeDisplayText = `${startTime} (${this.formatDateShort(
        this.bookingData.date
      )}) - ${endTime} (${this.formatDateShort(
        nextDay.toISOString().split("T")[0]
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

  updateBookingSummary() {
    const elements = {
      sport: document.getElementById("summary-sport"),
      court: document.getElementById("summary-court"),
      date: document.getElementById("summary-date"),
      time: document.getElementById("summary-time"),
      amount: document.getElementById("summary-amount"),
    };

    if (elements.sport) {
      elements.sport.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (elements.court) {
      elements.court.textContent = this.bookingData.courtName;
    }
    if (elements.date) {
      elements.date.textContent = this.formatDate(this.bookingData.date);
    }
    if (elements.time) {
      const startTime = this.formatTime(this.bookingData.startTime);
      const endTime = this.formatTime(this.bookingData.endTime);
      elements.time.textContent = `${startTime} - ${endTime} (${this.bookingData.duration}h)`;
    }
    if (elements.amount) {
      elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
    }
  }

  updateFinalSummary() {
    const elements = {
      sport: document.getElementById("final-sport"),
      court: document.getElementById("final-court"),
      datetime: document.getElementById("final-datetime"),
      name: document.getElementById("final-name"),
      phone: document.getElementById("final-phone"),
      amount: document.getElementById("final-amount"),
    };

    if (elements.sport) {
      elements.sport.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (elements.court) {
      elements.court.textContent = this.bookingData.courtName;
    }
    if (elements.datetime) {
      elements.datetime.textContent = this.formatBookingDateTime();
    }
    if (elements.name) {
      elements.name.textContent = this.bookingData.playerName;
    }
    if (elements.phone) {
      elements.phone.textContent = this.bookingData.playerPhone;
    }
    if (elements.amount) {
      elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
    }
  }

  updatePaymentAmounts() {
    const advanceAmount = Math.floor(this.bookingData.totalAmount * 0.5);
    const fullAmount = this.bookingData.totalAmount;

    const advanceEl = document.getElementById("advance-amount");
    const fullEl = document.getElementById("full-amount");

    if (advanceEl) advanceEl.textContent = advanceAmount.toLocaleString();
    if (fullEl) fullEl.textContent = fullAmount.toLocaleString();

    const selectedPayment = document.querySelector(
      'input[name="payment-type"]:checked'
    );
    if (selectedPayment) {
      this.bookingData.paymentType = selectedPayment.value;
    }
  }

  async confirmBooking() {
    const confirmBtn = document.getElementById("confirm-booking");
    if (!confirmBtn) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
      // Save final data
      this.saveStepData();
      this.bookingData.paymentType =
        document.querySelector('input[name="payment-type"]:checked')?.value ||
        "advance";

      // Validate required data
      if (!this.validateBookingData()) {
        alert("Please ensure all required fields are filled out correctly.");
        return;
      }

      // Check for conflicts
      confirmBtn.textContent = "Checking availability...";
      const conflictCheck = await this.checkForConflicts();

      if (conflictCheck.hasConflict) {
        alert(
          `Sorry, ${conflictCheck.message}. Please go back and select different time slots.`
        );
        return;
      }

      // Create booking
      confirmBtn.textContent = "Finalizing booking...";
      const response = await fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.bookingData),
      });

      const result = await response.json();

      if (result.success) {
        this.showBookingConfirmation(result.bookingId);
        await this.sendAdminNotification(result.bookingId);
      } else {
        throw new Error(result.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert(
        `Sorry, there was an error processing your booking: ${error.message}. Please try again or contact support.`
      );
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm Booking";
    }
  }

  validateBookingData() {
    const required = [
      "sport",
      "court",
      "courtName",
      "date",
      "startTime",
      "endTime",
      "duration",
      "selectedSlots",
      "playerName",
      "playerPhone",
    ];

    for (const field of required) {
      const value = this.bookingData[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }
    return true;
  }

  async checkForConflicts() {
    try {
      const response = await fetch("/api/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: this.bookingData.court,
          date: this.bookingData.date,
          selectedSlots: this.bookingData.selectedSlots,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return { hasConflict: true, message: "Error checking availability" };
    }
  }

  showBookingConfirmation(bookingId) {
    // Hide step 4 and show confirmation
    const step4 = document.getElementById("step-4");
    const confirmation = document.getElementById("booking-confirmation");
    const bookingIdEl = document.getElementById("generated-booking-id");

    if (step4) step4.style.display = "none";
    if (confirmation) confirmation.style.display = "block";
    if (bookingIdEl) bookingIdEl.textContent = bookingId;

    // Scroll to confirmation
    if (confirmation) {
      confirmation.scrollIntoView({ behavior: "smooth" });
    }

    console.log("Booking process completed successfully");
  }

  async sendAdminNotification(bookingId) {
    try {
      if (typeof emailjs === "undefined") {
        console.warn("EmailJS not available");
        return false;
      }

      const templateParams = {
        booking_id: bookingId,
        sport:
          this.bookingData.sport.charAt(0).toUpperCase() +
          this.bookingData.sport.slice(1),
        court_name: this.bookingData.courtName,
        booking_datetime: this.formatBookingDateTime(),
        duration: this.bookingData.duration.toString(),
        total_amount: this.bookingData.totalAmount.toLocaleString(),
        payment_type:
          this.bookingData.paymentType === "advance"
            ? "50% Advance Payment"
            : "Full Payment",
        player_name: this.bookingData.playerName,
        player_phone: this.bookingData.playerPhone,
        player_email: this.bookingData.playerEmail || "Not provided",
        player_count: this.bookingData.playerCount || "2",
        special_requests: this.bookingData.specialRequests || "None",
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

      console.log("Sending admin notification email...");
      const response = await emailjs.send(
        "service_y85g6ha",
        "template_ceqhxb3",
        templateParams
      );
      console.log("Admin notification email sent successfully");
      return true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return false;
    }
  }

  // Utility methods
  isNextDayTime(time) {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 0 && hour <= 5;
  }

  formatTime(time) {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  formatBookingDateTime() {
    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime = this.formatTime(this.bookingData.endTime);
    const startDate = this.bookingData.date;
    const isStartNextDay = this.isNextDayTime(this.bookingData.startTime);
    const isEndNextDay = this.isNextDayTime(this.bookingData.endTime);

    if (!isStartNextDay && !isEndNextDay) {
      return `${this.formatDate(startDate)} from ${startTime} to ${endTime}`;
    } else if (!isStartNextDay && isEndNextDay) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(startDate)} ${startTime} to ${this.formatDate(
        nextDay.toISOString().split("T")[0]
      )} ${endTime}`;
    } else {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(
        nextDay.toISOString().split("T")[0]
      )} from ${startTime} to ${endTime}`;
    }
  }
}

// Initialize booking system when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.bookingSystem = new BookingSystem();
});

// Global functions for backward compatibility
function debugCustomerSlots(court, date) {
  if (window.bookingSystem) {
    const testCourt =
      court || window.bookingSystem.bookingData.court || "padel-1";
    const testDate =
      date || window.bookingSystem.bookingData.date || "2025-08-05";

    console.log(`🔍 Debug: Testing ${testCourt} on ${testDate}`);
    window.bookingSystem.loadTimeSlots();
  }
}
