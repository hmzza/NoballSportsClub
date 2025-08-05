// Professional Admin Schedule Management System
// Clean, maintainable, and well-structured

class AdminScheduleManager {
  constructor() {
    this.currentDate = new Date();
    this.currentView = "week";
    this.scheduleData = {};
    this.selectedSlot = null;

    this.courtConfig = {
      padel: [
        { id: "padel-1", name: "Court 1: Teracotta Court", pricing: 5500 },
        { id: "padel-2", name: "Court 2: Purple Mondo", pricing: 5500 },
      ],
      cricket: [
        { id: "cricket-1", name: "Court 1: 110x50ft", pricing: 3000 },
        { id: "cricket-2", name: "Court 2: 130x60ft Multi", pricing: 3000 },
      ],
      futsal: [
        { id: "futsal-1", name: "Court 1: 130x60ft Multi", pricing: 2500 },
      ],
      pickleball: [
        { id: "pickleball-1", name: "Court 1: Professional", pricing: 2500 },
      ],
    };

    this.multiPurposeCourts = {
      "cricket-2": "multi-130x60",
      "futsal-1": "multi-130x60",
    };

    this.timeSlots = this.generateTimeSlots();
    this.init();
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    // Add early morning slots (midnight to 6 AM)
    for (let hour = 0; hour < 6; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }

  init() {
    this.initializeSchedule();
    this.setupEventListeners();
    this.hideAllModals();

    // Load schedule data after DOM is ready
    setTimeout(() => {
      this.loadScheduleData();
    }, 100);
  }

  initializeSchedule() {
    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = this.currentDate.toISOString().split("T")[0];
      this.updateDateDisplay();

      // Set date limits
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 90);

      dateInput.min = today.toISOString().split("T")[0];
      dateInput.max = maxDate.toISOString().split("T")[0];
    }
  }

  setupEventListeners() {
    // Date navigation
    this.addEventListener("prev-week", "click", () => this.navigateDate(-7));
    this.addEventListener("next-week", "click", () => this.navigateDate(7));
    this.addEventListener("schedule-date", "change", (e) =>
      this.handleDateChange(e)
    );

    // View toggle
    this.addEventListener("week-view", "click", () => this.switchView("week"));
    this.addEventListener("day-view", "click", () => this.switchView("day"));

    // Filters and refresh
    this.addEventListener("sport-filter", "change", () =>
      this.filterSchedule()
    );
    this.addEventListener("refresh-schedule", "click", () =>
      this.refreshSchedule()
    );

    // Modal controls
    this.addEventListener("close-modal", "click", () => this.closeSlotModal());
    this.addEventListener("slot-modal-overlay", "click", (e) =>
      this.handleModalOverlayClick(e)
    );

    // Slot actions
    this.addEventListener("book-slot-btn", "click", () =>
      this.openQuickBookModal()
    );
    this.addEventListener("block-slot-btn", "click", () =>
      this.openBlockSlotModal()
    );
    this.addEventListener("save-comment-btn", "click", () =>
      this.saveSlotComment()
    );
    this.addEventListener("unblock-slot-btn", "click", () =>
      this.unblockSlot()
    );

    // Booking actions
    this.addEventListener("confirm-booking-btn", "click", () =>
      this.confirmBookingFromSchedule()
    );
    this.addEventListener("decline-booking-btn", "click", () =>
      this.declineBookingFromSchedule()
    );
    this.addEventListener("cancel-booking-btn", "click", () =>
      this.cancelBookingFromSchedule()
    );
    this.addEventListener("edit-booking-btn", "click", () =>
      this.editBookingFromSchedule()
    );

    // Quick book modal
    this.addEventListener("close-quick-book-modal", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("cancel-quick-book", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("quick-book-form", "submit", (e) =>
      this.handleQuickBook(e)
    );

    // Block slot modal
    this.addEventListener("close-block-modal", "click", () =>
      this.closeBlockSlotModal()
    );
    this.addEventListener("cancel-block", "click", () =>
      this.closeBlockSlotModal()
    );
    this.addEventListener("block-slot-form", "submit", (e) =>
      this.handleBlockSlot(e)
    );
  }

  addEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    }
  }

  hideAllModals() {
    const modals = [
      "slot-modal-overlay",
      "quick-book-modal-overlay",
      "block-slot-modal-overlay",
    ];

    modals.forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    });

    this.selectedSlot = null;
  }

  // FIXED: Enhanced loadScheduleData with better error handling
  async loadScheduleData() {
    this.showLoading(true);

    try {
      const startDate = this.getWeekStartDate(this.currentDate);
      const endDate = new Date(startDate);
      endDate.setDate(
        startDate.getDate() + (this.currentView === "week" ? 6 : 0)
      );

      const requestData = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        sport: document.getElementById("sport-filter")?.value || "",
      };

      console.log("📤 Loading schedule data with request:", requestData);

      const response = await fetch("/admin/api/schedule-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📥 Raw API response:", data);

      if (data.success) {
        this.scheduleData = data.schedule || {};
        console.log("📊 Processed schedule data:", this.scheduleData);

        // Debug: Count bookings
        let bookingCount = 0;
        Object.keys(this.scheduleData).forEach((date) => {
          Object.keys(this.scheduleData[date] || {}).forEach((court) => {
            const courtBookings = Object.keys(
              this.scheduleData[date][court] || {}
            );
            bookingCount += courtBookings.length;
            if (courtBookings.length > 0) {
              console.log(
                `📅 ${date} - ${court}: ${
                  courtBookings.length
                } bookings at times: ${courtBookings.join(", ")}`
              );
            }
          });
        });

        console.log(`📈 Total bookings loaded: ${bookingCount}`);

        this.renderSchedule();

        if (bookingCount > 0) {
          this.showSuccessToast(`Loaded ${bookingCount} bookings successfully`);
        }
      } else {
        throw new Error(data.message || "Failed to load schedule");
      }
    } catch (error) {
      console.error("❌ Error loading schedule:", error);
      console.error("❌ Request details:", {
        url: "/admin/api/schedule-data",
        method: "POST",
        requestData: requestData,
      });

      this.showErrorToast("Failed to load schedule: " + error.message);
      this.scheduleData = {};
      this.renderSchedule();
    } finally {
      this.showLoading(false);
    }
  }

  renderSchedule() {
    const grid = document.getElementById("schedule-grid");
    if (!grid) {
      console.error("❌ Schedule grid not found");
      return;
    }

    // Clear previous content
    grid.innerHTML = "";
    grid.className = `schedule-grid ${this.currentView}-view`;

    try {
      // Validate schedule data
      if (!this.scheduleData || typeof this.scheduleData !== "object") {
        console.warn(
          "⚠️ Invalid schedule data, initializing empty:",
          this.scheduleData
        );
        this.scheduleData = {};
      }

      console.log("📊 Rendering schedule with data:", this.scheduleData);

      // Count total bookings for debugging
      let totalBookings = 0;
      Object.keys(this.scheduleData).forEach((date) => {
        Object.keys(this.scheduleData[date] || {}).forEach((court) => {
          totalBookings += Object.keys(
            this.scheduleData[date][court] || {}
          ).length;
        });
      });

      console.log(`📈 Total bookings to render: ${totalBookings}`);

      if (this.currentView === "week") {
        this.renderWeekView(grid);
      } else {
        this.renderDayView(grid);
      }

      console.log("✅ Schedule rendered successfully");

      // Add debug info to UI
      this.addDebugInfo(totalBookings);
    } catch (error) {
      console.error("❌ Error rendering schedule:", error);
      console.error("❌ Schedule data at error:", this.scheduleData);

      grid.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
                <div style="margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc3545;"></i>
                </div>
                <h4>Error rendering schedule</h4>
                <p>There was an issue displaying the schedule.</p>
                <button onclick="window.adminSchedule.loadScheduleData()" class="btn btn-primary">
                    <i class="fas fa-refresh"></i> Retry
                </button>
                <div style="margin-top: 1rem; font-size: 0.8rem; color: #999;">
                    Error: ${error.message}
                </div>
            </div>
        `;
    }
  }

  renderWeekView(grid) {
    const startDate = this.getWeekStartDate(this.currentDate);
    const days = ["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const timeSlotCount = this.timeSlots.length;
    grid.style.gridTemplateColumns = "80px repeat(7, 1fr)";
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 40px)`;

    // Create headers
    days.forEach((day, index) => {
      const header = document.createElement("div");
      if (index === 0) {
        header.className = "time-header";
        header.textContent = day;
      } else {
        header.className = "day-header";
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (index - 1));
        header.innerHTML = `
                    <div>${day}</div>
                    <div style="font-size: 0.8rem; opacity: 0.9;">
                        ${date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                    </div>
                `;
      }
      grid.appendChild(header);
    });

    // Create time slots
    this.timeSlots.forEach((time, timeIndex) => {
      // Time label
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      // Day slots
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = slotDate.toISOString().split("T")[0];

        const slot = this.createTimeSlot(
          dateStr,
          time,
          "all-courts",
          timeIndex
        );
        grid.appendChild(slot);
      }
    });
  }

  renderDayView(grid) {
    const courts = this.getAllCourts();
    const dateStr = this.currentDate.toISOString().split("T")[0];
    const timeSlotCount = this.timeSlots.length;

    grid.style.gridTemplateColumns = `100px repeat(${courts.length}, 1fr)`;
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 50px)`;

    // Create headers
    const timeHeader = document.createElement("div");
    timeHeader.className = "time-header";
    timeHeader.textContent = "Time";
    grid.appendChild(timeHeader);

    courts.forEach((court) => {
      const courtHeader = document.createElement("div");
      courtHeader.className = "court-header";
      courtHeader.innerHTML = `
                <div>${court.sport.toUpperCase()}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">${
                  court.name
                }</div>
            `;
      grid.appendChild(courtHeader);
    });

    // Create time slots
    this.timeSlots.forEach((time, timeIndex) => {
      // Time label
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      // Court slots
      courts.forEach((court) => {
        const slot = this.createTimeSlot(dateStr, time, court.id, timeIndex);
        grid.appendChild(slot);
      });
    });
  }

  // FIXED: Enhanced createTimeSlot method with better debugging
  createTimeSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement("div");
    slot.className = "time-slot available";
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;

    try {
      const slotData = this.getSlotData(date, time, courtId);

      if (slotData) {
        console.log(
          `🎯 Found booking data for ${courtId} at ${time} on ${date}:`,
          slotData
        );

        slot.className = `time-slot ${slotData.status}`;
        slot.innerHTML = `
              <div class="slot-content">
                  <div class="slot-title">${slotData.title || "Booked"}</div>
                  ${
                    slotData.subtitle
                      ? `<div class="slot-subtitle">${slotData.subtitle}</div>`
                      : ""
                  }
              </div>
          `;

        // Add visual indicator for debugging
        slot.style.border = "2px solid #007bff";
        slot.title = `Booking: ${slotData.title} (${slotData.status})`;
      } else {
        slot.innerHTML = `
              <div class="slot-content">
                  <div class="slot-title">Available</div>
                  <div class="slot-time" style="font-size: 0.7rem;">${this.formatTime(
                    time
                  )}</div>
              </div>
          `;
      }

      // Add click event
      slot.addEventListener("click", () => {
        console.log("🖱️ Slot clicked:", { date, time, courtId, slotData });
        this.openSlotModal(slot, slotData);
      });
    } catch (error) {
      console.error(`❌ Error creating slot for ${courtId} at ${time}:`, error);
      slot.innerHTML = `
          <div class="slot-content">
              <div class="slot-title">Error</div>
              <div class="slot-time" style="font-size: 0.7rem; color: red;">Error loading</div>
          </div>
      `;
    }

    return slot;
  }

  getSlotData(date, time, courtId) {
    try {
      console.log(`🔍 Looking for slot data: ${courtId} at ${time} on ${date}`);

      if (!this.scheduleData || !this.scheduleData[date]) {
        console.log(`📭 No schedule data for date: ${date}`);
        return null;
      }

      console.log(
        `📊 Available courts for ${date}:`,
        Object.keys(this.scheduleData[date])
      );

      // Check direct court booking
      if (
        this.scheduleData[date][courtId] &&
        this.scheduleData[date][courtId][time]
      ) {
        const directBooking = this.scheduleData[date][courtId][time];
        console.log(
          `✅ Found direct booking for ${courtId} at ${time}:`,
          directBooking
        );
        return directBooking;
      }

      // Check for multi-purpose court conflicts
      if (courtId in this.multiPurposeCourts) {
        const multiCourtType = this.multiPurposeCourts[courtId];
        console.log(
          `🏟️ Checking multi-purpose conflicts for ${courtId} (type: ${multiCourtType})`
        );

        const conflictingCourts = Object.keys(this.multiPurposeCourts).filter(
          (otherCourtId) =>
            this.multiPurposeCourts[otherCourtId] === multiCourtType &&
            otherCourtId !== courtId
        );

        console.log(`🔄 Conflicting courts: ${conflictingCourts}`);

        for (const conflictCourt of conflictingCourts) {
          if (
            this.scheduleData[date][conflictCourt] &&
            this.scheduleData[date][conflictCourt][time]
          ) {
            const conflictData = this.scheduleData[date][conflictCourt][time];
            console.log(
              `⚠️ Found conflict booking on ${conflictCourt}:`,
              conflictData
            );

            return {
              ...conflictData,
              title: `${conflictData.title} (${
                conflictCourt.includes("cricket") ? "Cricket" : "Futsal"
              })`,
              subtitle: `${conflictData.subtitle} - Multi Court Booked`,
              status: "booked-conflict",
            };
          }
        }
      }

      console.log(`📭 No booking found for ${courtId} at ${time} on ${date}`);
      return null;
    } catch (error) {
      console.error("❌ Error in getSlotData:", error, { date, time, courtId });
      console.error("❌ Schedule data structure:", this.scheduleData);
      return null;
    }
  }
  getAllCourts() {
    const sportFilter = document.getElementById("sport-filter")?.value;
    let courts = [];

    if (sportFilter && this.courtConfig[sportFilter]) {
      courts = this.courtConfig[sportFilter].map((court) => ({
        ...court,
        sport: sportFilter,
      }));
    } else {
      const sportOrder = ["padel", "cricket", "futsal", "pickleball"];
      sportOrder.forEach((sport) => {
        if (this.courtConfig[sport]) {
          this.courtConfig[sport].forEach((court) => {
            courts.push({ ...court, sport });
          });
        }
      });
    }

    return courts;
  }

  openSlotModal(slotElement, slotData) {
    this.selectedSlot = {
      element: slotElement,
      date: slotElement.dataset.date,
      time: slotElement.dataset.time,
      court: slotElement.dataset.court,
      data: slotData,
    };

    const modal = document.getElementById("slot-modal");
    const overlay = document.getElementById("slot-modal-overlay");

    if (modal && overlay) {
      this.updateSlotModalContent(slotData);
      overlay.classList.remove("hidden");
      modal.style.animation = "slideInUp 0.3s ease";
    }
  }

  updateSlotModalContent(slotData) {
    if (!this.selectedSlot) return;

    const isAvailable = !slotData;
    const isBooked =
      slotData &&
      (slotData.status === "booked-pending" ||
        slotData.status === "booked-confirmed");
    const isBlocked = slotData && slotData.status === "blocked";

    // Update basic info
    this.setElementText(
      "modal-court",
      this.getCourtName(this.selectedSlot.court)
    );
    this.setElementText(
      "modal-datetime",
      `${this.formatDate(this.selectedSlot.date)} at ${this.formatTime(
        this.selectedSlot.time
      )}`
    );

    // Update status
    const statusElement = document.getElementById("modal-status");
    if (statusElement) {
      if (isAvailable) {
        statusElement.textContent = "Available";
        statusElement.className = "status-badge available";
      } else {
        statusElement.textContent = this.getStatusText(slotData.status);
        statusElement.className = `status-badge ${slotData.status}`;
      }
    }

    // Show/hide sections
    this.setElementDisplay("available-actions", isAvailable ? "block" : "none");
    this.setElementDisplay("booking-details", isBooked ? "block" : "none");
    this.setElementDisplay("blocked-actions", isBlocked ? "block" : "none");

    if (isBooked) {
      this.updateBookingDetails(slotData);
    }

    if (isBlocked) {
      this.setElementText(
        "modal-block-reason",
        slotData.reason || "Not specified"
      );
    }
  }

  updateBookingDetails(slotData) {
    this.setElementText("modal-booking-id", slotData.bookingId || "N/A");
    this.setElementText("modal-player", slotData.playerName || "N/A");
    this.setElementText("modal-phone", slotData.playerPhone || "N/A");
    this.setElementText(
      "modal-amount",
      `PKR ${(slotData.amount || 0).toLocaleString()}`
    );
    this.setElementText("modal-duration", `${slotData.duration || 1} hour(s)`);

    // Load existing comments
    const commentsEl = document.getElementById("slot-comments");
    if (commentsEl) {
      commentsEl.value = slotData.comments || "";
    }

    // Show/hide action buttons
    const isPending = slotData.status === "booked-pending";
    const isConfirmed = slotData.status === "booked-confirmed";

    this.setElementDisplay(
      "confirm-booking-btn",
      isPending ? "inline-block" : "none"
    );
    this.setElementDisplay(
      "decline-booking-btn",
      isPending ? "inline-block" : "none"
    );
    this.setElementDisplay(
      "cancel-booking-btn",
      isConfirmed ? "inline-block" : "none"
    );
  }

  closeSlotModal() {
    const overlay = document.getElementById("slot-modal-overlay");
    const modal = document.getElementById("slot-modal");

    if (modal && overlay) {
      modal.style.animation = "slideOutDown 0.3s ease";
      setTimeout(() => {
        overlay.classList.add("hidden");
        this.selectedSlot = null;
      }, 300);
    }
  }

  handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeSlotModal();
    }
  }

  // Navigation functions
  navigateDate(days) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + days);
    this.currentDate = newDate;

    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = this.currentDate.toISOString().split("T")[0];
    }
    this.updateDateDisplay();
    this.loadScheduleData();
  }

  handleDateChange(event) {
    this.currentDate = new Date(event.target.value);
    this.updateDateDisplay();
    this.loadScheduleData();
  }

  switchView(view) {
    if (this.currentView === view) return;

    this.currentView = view;

    // Update view buttons
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    this.loadScheduleData();
  }

  updateDateDisplay() {
    const display = document.getElementById("date-display");
    if (!display) return;

    if (this.currentView === "week") {
      const startDate = this.getWeekStartDate(this.currentDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      display.textContent = `Week of ${startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      display.textContent = this.currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  getWeekStartDate(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return start;
  }

  filterSchedule() {
    this.loadScheduleData();
  }

  refreshSchedule() {
    const btn = document.getElementById("refresh-schedule");
    const icon = btn?.querySelector("i");

    if (icon) {
      icon.style.animation = "spin 1s linear infinite";
    }

    this.loadScheduleData().finally(() => {
      if (icon) {
        icon.style.animation = "";
      }
    });
  }

  // Booking actions
  async confirmBookingFromSchedule() {
    await this.performBookingAction("confirm", "confirm this booking");
  }

  async declineBookingFromSchedule() {
    await this.performBookingAction("decline", "decline this booking");
  }

  async cancelBookingFromSchedule() {
    await this.performBookingAction("cancel", "cancel this booking");
  }

  async performBookingAction(action, confirmText) {
    if (!this.selectedSlot?.data?.bookingId) return;

    const confirmed = confirm(`Are you sure you want to ${confirmText}?`);
    if (!confirmed) return;

    try {
      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: action,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast(`Booking ${action}ed successfully!`);
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || `Failed to ${action} booking`);
      }
    } catch (error) {
      console.error(`${action} booking error:`, error);
      this.showErrorToast(`Failed to ${action} booking: ` + error.message);
    }
  }

  editBookingFromSchedule() {
    if (this.selectedSlot?.data?.bookingId) {
      window.location.href = `/admin/booking-control?booking=${this.selectedSlot.data.bookingId}`;
    }
  }

  // Modal functions
  openQuickBookModal() {
    const modal = document.getElementById("quick-book-modal-overlay");
    if (modal) {
      modal.classList.remove("hidden");
    }
    this.closeSlotModal();
  }

  closeQuickBookModal() {
    const modal = document.getElementById("quick-book-modal-overlay");
    const form = document.getElementById("quick-book-form");
    if (modal) modal.classList.add("hidden");
    if (form) form.reset();
  }

  async handleQuickBook(event) {
    event.preventDefault();

    if (!this.selectedSlot) return;

    try {
      const formData = new FormData(event.target);
      const bookingData = {
        court: this.selectedSlot.court,
        date: this.selectedSlot.date,
        startTime: this.selectedSlot.time,
        duration: parseFloat(
          document.getElementById("quick-duration")?.value || 1
        ),
        playerName: document.getElementById("quick-player-name")?.value || "",
        playerPhone: document.getElementById("quick-player-phone")?.value || "",
        playerEmail: document.getElementById("quick-player-email")?.value || "",
        playerCount:
          document.getElementById("quick-player-count")?.value || "2",
        status:
          document.getElementById("quick-payment-status")?.value || "confirmed",
        specialRequests: document.getElementById("quick-comments")?.value || "",
      };

      const response = await fetch("/admin/api/admin-create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking created successfully!");
        this.closeQuickBookModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Quick book error:", error);
      this.showErrorToast("Failed to create booking: " + error.message);
    }
  }

  openBlockSlotModal() {
    const modal = document.getElementById("block-slot-modal-overlay");
    if (modal) {
      modal.classList.remove("hidden");
    }
    this.closeSlotModal();
  }

  closeBlockSlotModal() {
    const modal = document.getElementById("block-slot-modal-overlay");
    const form = document.getElementById("block-slot-form");
    if (modal) modal.classList.add("hidden");
    if (form) form.reset();
  }

  async handleBlockSlot(event) {
    event.preventDefault();

    if (!this.selectedSlot) return;

    try {
      const blockData = {
        court: this.selectedSlot.court,
        date: this.selectedSlot.date,
        startTime: this.selectedSlot.time,
        duration: parseFloat(
          document.getElementById("block-duration")?.value || 1
        ),
        reason: document.getElementById("block-reason")?.value || "",
        notes: document.getElementById("block-notes")?.value || "",
      };

      const response = await fetch("/admin/api/admin-block-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blockData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Slot blocked successfully!");
        this.closeBlockSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to block slot");
      }
    } catch (error) {
      console.error("Block slot error:", error);
      this.showErrorToast("Failed to block slot: " + error.message);
    }
  }

  async unblockSlot() {
    if (!this.selectedSlot) return;

    const confirmed = confirm("Are you sure you want to unblock this slot?");
    if (!confirmed) return;

    try {
      const response = await fetch("/admin/api/admin-unblock-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: this.selectedSlot.court,
          date: this.selectedSlot.date,
          time: this.selectedSlot.time,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Slot unblocked successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to unblock slot");
      }
    } catch (error) {
      console.error("Unblock slot error:", error);
      this.showErrorToast("Failed to unblock slot: " + error.message);
    }
  }

  async saveSlotComment() {
    if (!this.selectedSlot?.data?.bookingId) return;

    try {
      const comment = document.getElementById("slot-comments")?.value || "";

      const response = await fetch("/admin/api/save-slot-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          comment: comment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Comment saved successfully!");
        if (this.selectedSlot.data) {
          this.selectedSlot.data.comments = comment;
        }
      } else {
        throw new Error(result.message || "Failed to save comment");
      }
    } catch (error) {
      console.error("Save comment error:", error);
      this.showErrorToast("Failed to save comment: " + error.message);
    }
  }

  // Utility functions
  formatTime(time) {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  addDebugInfo(totalBookings) {
    // Remove existing debug info
    const existingDebug = document.getElementById("schedule-debug-info");
    if (existingDebug) {
      existingDebug.remove();
    }

    // Add debug info box
    const debugInfo = document.createElement("div");
    debugInfo.id = "schedule-debug-info";
    debugInfo.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    const currentViewInfo =
      this.currentView === "week"
        ? `Week of ${this.getWeekStartDate(
            this.currentDate
          ).toLocaleDateString()}`
        : `Day: ${this.currentDate.toLocaleDateString()}`;

    debugInfo.innerHTML = `
        <strong>📊 Schedule Debug Info</strong><br>
        View: ${this.currentView}<br>
        ${currentViewInfo}<br>
        Total Bookings: ${totalBookings}<br>
        Last Update: ${new Date().toLocaleTimeString()}<br>
        <button onclick="this.remove()" style="margin-top: 5px; padding: 2px 6px; border: 1px solid #ccc; background: white; border-radius: 3px; cursor: pointer;">Hide</button>
    `;

    document.body.appendChild(debugInfo);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (debugInfo.parentElement) {
        debugInfo.remove();
      }
    }, 10000);
  }

  getCourtName(courtId) {
    if (courtId === "all-courts") return "All Courts";

    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return court.name;
    }

    console.warn(`Court ID not found: ${courtId}`);
    return courtId;
  }

  getStatusText(status) {
    const statusMap = {
      available: "Available",
      "booked-pending": "Pending Payment",
      "booked-confirmed": "Confirmed",
      blocked: "Blocked",
      "booked-conflict": "Multi-Court Booking",
    };
    return statusMap[status] || status;
  }

  // UI Helper functions
  setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  setElementDisplay(id, display) {
    const element = document.getElementById(id);
    if (element) element.style.display = display;
  }

  showLoading(show) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      if (show) {
        overlay.classList.remove("hidden");
      } else {
        overlay.classList.add("hidden");
      }
    }
  }

  showSuccessToast(message) {
    this.showToast(message, "success");
  }

  showErrorToast(message) {
    this.showToast(message, "error");
  }

  showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.innerHTML =
      '<div class="toast-content">' +
      '<i class="fas ' +
      (type === "success" ? "fa-check-circle" : "fa-exclamation-circle") +
      '"></i>' +
      "<span>" +
      message +
      "</span>" +
      "</div>" +
      '<button class="toast-close" onclick="this.parentElement.remove()">' +
      '<i class="fas fa-times"></i>' +
      "</button>";

    const backgroundColor = type === "success" ? "#28a745" : "#dc3545";
    toast.style.cssText =
      "position: fixed;" +
      "top: 20px;" +
      "right: 20px;" +
      "background: " +
      backgroundColor +
      ";" +
      "color: white;" +
      "padding: 1rem 1.5rem;" +
      "border-radius: 10px;" +
      "box-shadow: 0 4px 12px rgba(0,0,0,0.2);" +
      "z-index: 10000;" +
      "display: flex;" +
      "align-items: center;" +
      "gap: 1rem;" +
      "min-width: 300px;" +
      "animation: slideInRight 0.3s ease;";

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.adminSchedule = new AdminScheduleManager();
});

// Add CSS animations
const style = document.createElement("style");
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

function forceRefreshSchedule() {
  if (window.adminSchedule) {
      console.log('🔄 Force refreshing admin schedule...');
      window.adminSchedule.scheduleData = {}; // Clear cache
      window.adminSchedule.loadScheduleData();
  } else {
      console.error('❌ Admin schedule manager not found');
  }
}

// Add to global scope for debugging
window.forceRefreshSchedule = forceRefreshSchedule;

console.log('🔧 Admin schedule fixes loaded. Use forceRefreshSchedule() to manually refresh.');