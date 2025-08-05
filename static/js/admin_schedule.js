// FIXED: Professional Admin Schedule Management System
// Enhanced debugging and booking display

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
        {
          id: "pickleball-1",
          name: "Court 1: Professional Setup",
          pricing: 2500,
        }, // Added "Setup"
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
    // Generate slots from 6 AM to 11:30 PM
    for (let hour = 6; hour < 24; hour++) {
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

  // FIXED: Enhanced loadScheduleData with comprehensive debugging
  async loadScheduleData() {
    this.showLoading(true);

    try {
      const startDate =
        this.currentView === "week"
          ? this.getWeekStartDate(this.currentDate)
          : new Date(this.currentDate);

      const endDate =
        this.currentView === "week"
          ? (() => {
              const end = new Date(startDate);
              end.setDate(startDate.getDate() + 6);
              return end;
            })()
          : new Date(this.currentDate);

      const requestData = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        sport: document.getElementById("sport-filter")?.value || "",
      };

      console.log("🔧 FIXED: Loading schedule data with request:", requestData);

      const response = await fetch("/admin/api/schedule-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      console.log(
        "📡 FIXED: Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📥 FIXED: Raw API response:", data);

      if (data.success) {
        this.scheduleData = data.schedule || {};
        console.log("📊 FIXED: Processed schedule data:", this.scheduleData);

        // FIXED: Enhanced debugging - count bookings by court and status
        let bookingCount = 0;
        let statusCounts = {};
        Object.keys(this.scheduleData).forEach((date) => {
          console.log(
            `📅 FIXED: Date ${date} has courts:`,
            Object.keys(this.scheduleData[date] || {})
          );

          Object.keys(this.scheduleData[date] || {}).forEach((court) => {
            const courtBookings = this.scheduleData[date][court] || {};
            const slotTimes = Object.keys(courtBookings);
            bookingCount += slotTimes.length;

            if (slotTimes.length > 0) {
              console.log(
                `🏟️ FIXED: ${date} - ${court}: ${slotTimes.length} bookings at times:`,
                slotTimes
              );

              // Count by status
              slotTimes.forEach((time) => {
                const slotData = courtBookings[time];
                const status = slotData.status || "unknown";
                statusCounts[status] = (statusCounts[status] || 0) + 1;

                console.log(
                  `🎯 FIXED: ${court} at ${time}: ${
                    slotData.title
                  } (${status}) - PKR ${slotData.amount || 0}`
                );
              });
            }
          });
        });

        console.log(`📈 FIXED: Total bookings loaded: ${bookingCount}`);
        console.log(`📊 FIXED: Status breakdown:`, statusCounts);

        // Debug specific court if pickleball
        const sport = document.getElementById("sport-filter")?.value;
        if (sport === "pickleball" || !sport) {
          const todayStr = new Date().toISOString().split("T")[0];
          console.log(
            `🔍 FIXED: Checking pickleball court for today (${todayStr}):`
          );

          if (
            this.scheduleData[todayStr] &&
            this.scheduleData[todayStr]["pickleball-1"]
          ) {
            const pickleballBookings =
              this.scheduleData[todayStr]["pickleball-1"];
            console.log(
              `🏓 FIXED: Pickleball court bookings for today:`,
              pickleballBookings
            );

            Object.keys(pickleballBookings).forEach((time) => {
              const booking = pickleballBookings[time];
              console.log(`  ⏰ ${time}: ${booking.title} (${booking.status})`);
            });
          } else {
            console.log(`🏓 FIXED: No pickleball bookings found for today`);
          }
        }

        this.renderSchedule();

        if (bookingCount > 0) {
          this.showSuccessToast(
            `FIXED: Loaded ${bookingCount} bookings successfully`
          );
        } else {
          console.warn("⚠️ FIXED: No bookings found in the response");
          this.showInfoToast("No bookings found for the selected period");
        }

        // FIXED: Add debug info to the page
        this.addDebugInfo(bookingCount, statusCounts, data.debug_info);
      } else {
        throw new Error(data.message || "Failed to load schedule");
      }
    } catch (error) {
      console.error("❌ FIXED: Error loading schedule:", error);
      this.showErrorToast("Failed to load schedule: " + error.message);
      this.scheduleData = {};
      this.renderSchedule();
    } finally {
      this.showLoading(false);
    }
  }

  // FIXED: Enhanced renderSchedule with better debugging
  renderSchedule() {
    const grid = document.getElementById("schedule-grid");
    if (!grid) {
      console.error("❌ FIXED: Schedule grid not found");
      return;
    }

    // Clear previous content
    grid.innerHTML = "";
    grid.className = `schedule-grid ${this.currentView}-view`;

    try {
      // Validate schedule data
      if (!this.scheduleData || typeof this.scheduleData !== "object") {
        console.warn(
          "⚠️ FIXED: Invalid schedule data, initializing empty:",
          this.scheduleData
        );
        this.scheduleData = {};
      }

      console.log("📊 FIXED: Rendering schedule with data:", this.scheduleData);

      // Count total bookings for debugging
      let totalBookings = 0;
      Object.keys(this.scheduleData).forEach((date) => {
        Object.keys(this.scheduleData[date] || {}).forEach((court) => {
          totalBookings += Object.keys(
            this.scheduleData[date][court] || {}
          ).length;
        });
      });

      console.log(`📈 FIXED: Total bookings to render: ${totalBookings}`);

      if (this.currentView === "week") {
        this.renderWeekView(grid);
      } else {
        this.renderDayView(grid);
      }

      console.log("✅ FIXED: Schedule rendered successfully");
    } catch (error) {
      console.error("❌ FIXED: Error rendering schedule:", error);

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

  renderDayView(grid) {
    const courts = this.getAllCourts();
    const dateStr = this.currentDate.toISOString().split("T")[0];
    const timeSlotCount = this.timeSlots.length;

    console.log(
      `📅 FIXED: Rendering day view for ${dateStr} with ${courts.length} courts`
    );

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
        <div style="font-size: 0.8rem; opacity: 0.9;">${court.name}</div>
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

    console.log(
      `✅ FIXED: Day view rendered with ${this.timeSlots.length} time slots for ${courts.length} courts`
    );
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

  // FIXED: Enhanced createTimeSlot method with comprehensive debugging
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
          `🎯 FIXED: Found booking data for ${courtId} at ${time} on ${date}:`,
          slotData
        );

        // FIXED: Apply proper CSS classes based on status
        const statusClass = slotData.status || "booked-pending";
        slot.className = `time-slot ${statusClass}`;

        // FIXED: Enhanced slot content with better visibility
        slot.innerHTML = `
          <div class="slot-content">
            <div class="slot-title" style="font-weight: 600; font-size: 0.8rem;">${
              slotData.title || "Booked"
            }</div>
            ${
              slotData.subtitle
                ? `<div class="slot-subtitle" style="font-size: 0.7rem; opacity: 0.9;">${slotData.subtitle}</div>`
                : ""
            }
          </div>
        `;

        // FIXED: Add visual indicators for different booking types
        const statusColors = {
          "booked-pending": "#ffc107",
          "booked-confirmed": "#28a745",
          "booked-conflict": "#dc3545",
          "booked-cancelled": "#6c757d",
        };

        const statusColor = statusColors[statusClass] || "#007bff";
        slot.style.backgroundColor = statusColor;
        slot.style.color = "white";
        slot.style.border = `2px solid ${statusColor}`;

        slot.title = `${slotData.title} - ${slotData.status} - ${
          slotData.subtitle || ""
        }`;

        console.log(
          `✅ FIXED: Styled slot ${time} for ${courtId} with status ${statusClass}`
        );
      } else {
        // Available slot
        slot.innerHTML = `
          <div class="slot-content">
            <div class="slot-title" style="font-size: 0.8rem;">Available</div>
            <div class="slot-time" style="font-size: 0.7rem; opacity: 0.7;">${this.formatTime(
              time
            )}</div>
          </div>
        `;
        slot.style.backgroundColor = "#f8f9fa";
        slot.style.border = "1px solid #dee2e6";
      }

      // Add click event
      slot.addEventListener("click", () => {
        console.log("🖱️ FIXED: Slot clicked:", {
          date,
          time,
          courtId,
          slotData,
        });
        this.openSlotModal(slot, slotData);
      });
    } catch (error) {
      console.error(
        `❌ FIXED: Error creating slot for ${courtId} at ${time}:`,
        error
      );
      slot.innerHTML = `
        <div class="slot-content">
          <div class="slot-title" style="color: red;">Error</div>
          <div class="slot-time" style="font-size: 0.7rem; color: red;">Error loading</div>
        </div>
      `;
      slot.style.backgroundColor = "#f8d7da";
      slot.style.border = "1px solid #dc3545";
    }

    return slot;
  }

  // FIXED: Enhanced getSlotData with comprehensive debugging and logic fixes
  getSlotData(date, time, courtId) {
    try {
      console.log(
        `🔍 FIXED: Looking for slot data: ${courtId} at ${time} on ${date}`
      );

      if (!this.scheduleData || !this.scheduleData[date]) {
        console.log(`📭 FIXED: No schedule data for date: ${date}`);
        console.log(
          `📊 FIXED: Available dates:`,
          Object.keys(this.scheduleData || {})
        );
        return null;
      }

      console.log(
        `📊 FIXED: Available courts for ${date}:`,
        Object.keys(this.scheduleData[date])
      );

      // FIXED: For week view, check all courts if courtId is "all-courts"
      if (courtId === "all-courts") {
        console.log(
          `🔍 FIXED: Checking all courts for week view at ${time} on ${date}`
        );

        // Get all courts and check each one
        const allCourts = this.getAllCourts();
        for (const court of allCourts) {
          const courtBooking = this.getSlotDataForSpecificCourt(
            date,
            time,
            court.id
          );
          if (courtBooking) {
            console.log(
              `✅ FIXED: Found booking in ${court.id} for week view:`,
              courtBooking
            );
            return {
              ...courtBooking,
              title: `${courtBooking.title} (${court.sport.toUpperCase()})`,
              subtitle: `${courtBooking.subtitle} - ${court.name}`,
            };
          }
        }

        console.log(
          `📭 FIXED: No bookings found in any court for week view at ${time} on ${date}`
        );
        return null;
      }

      // FIXED: For day view or specific court, check that specific court
      return this.getSlotDataForSpecificCourt(date, time, courtId);
    } catch (error) {
      console.error("❌ FIXED: Error in getSlotData:", error, {
        date,
        time,
        courtId,
      });
      return null;
    }
  }

  // FIXED: New method to get slot data for a specific court
  getSlotDataForSpecificCourt(date, time, courtId) {
    try {
      console.log(
        `🔍 FIXED: Checking specific court ${courtId} at ${time} on ${date}`
      );

      // Check direct court booking
      if (
        this.scheduleData[date][courtId] &&
        this.scheduleData[date][courtId][time]
      ) {
        const directBooking = this.scheduleData[date][courtId][time];
        console.log(
          `✅ FIXED: Found direct booking for ${courtId} at ${time}:`,
          directBooking
        );
        return directBooking;
      }

      // FIXED: Check for multi-purpose court conflicts
      if (courtId in this.multiPurposeCourts) {
        const multiCourtType = this.multiPurposeCourts[courtId];
        console.log(
          `🏟️ FIXED: Checking multi-purpose conflicts for ${courtId} (type: ${multiCourtType})`
        );

        const conflictingCourts = Object.keys(this.multiPurposeCourts).filter(
          (otherCourtId) =>
            this.multiPurposeCourts[otherCourtId] === multiCourtType &&
            otherCourtId !== courtId
        );

        console.log(`🔄 FIXED: Conflicting courts:`, conflictingCourts);

        for (const conflictCourt of conflictingCourts) {
          if (
            this.scheduleData[date][conflictCourt] &&
            this.scheduleData[date][conflictCourt][time]
          ) {
            const conflictData = this.scheduleData[date][conflictCourt][time];
            console.log(
              `⚠️ FIXED: Found conflict booking on ${conflictCourt}:`,
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

      console.log(
        `📭 FIXED: No booking found for ${courtId} at ${time} on ${date}`
      );
      return null;
    } catch (error) {
      console.error(
        `❌ FIXED: Error checking specific court ${courtId}:`,
        error
      );
      return null;
    }
  }

  // In your renderDayView method, replace the court filtering logic:
  getAllCourts() {
    const sportFilter = document.getElementById("sport-filter")?.value;
    let courts = [];

    if (sportFilter && this.courtConfig[sportFilter]) {
      courts = this.courtConfig[sportFilter].map((court) => ({
        ...court,
        sport: sportFilter,
      }));
      console.log(
        `🏓 FIXED: Filtering by ${sportFilter}, found courts:`,
        courts
      );
    } else {
      const sportOrder = ["padel", "cricket", "futsal", "pickleball"];
      sportOrder.forEach((sport) => {
        if (this.courtConfig[sport]) {
          this.courtConfig[sport].forEach((court) => {
            courts.push({ ...court, sport });
          });
        }
      });
      console.log(`🏓 FIXED: All sports, total courts:`, courts);
    }

    return courts;
  }

  // Navigation and utility methods
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

  // FIXED: Enhanced debug info with comprehensive details
  addDebugInfo(totalBookings, statusCounts, apiDebugInfo) {
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
      border: 2px solid #007bff;
      padding: 15px;
      border-radius: 10px;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      max-width: 350px;
      font-family: monospace;
    `;

    const currentViewInfo =
      this.currentView === "week"
        ? `Week of ${this.getWeekStartDate(
            this.currentDate
          ).toLocaleDateString()}`
        : `Day: ${this.currentDate.toLocaleDateString()}`;

    const statusBreakdown = Object.keys(statusCounts)
      .map((status) => `${status}: ${statusCounts[status]}`)
      .join("<br>");

    debugInfo.innerHTML = `
      <strong style="color: #007bff;">🔧 FIXED Schedule Debug Info</strong><br><br>
      <strong>View:</strong> ${this.currentView}<br>
      <strong>Period:</strong> ${currentViewInfo}<br>
      <strong>Total Bookings:</strong> ${totalBookings}<br>
      <strong>Last Update:</strong> ${new Date().toLocaleTimeString()}<br><br>
      <strong>📊 Status Breakdown:</strong><br>
      ${statusBreakdown || "No bookings"}<br><br>
      ${
        apiDebugInfo
          ? `
        <strong>🗄️ DB Info:</strong><br>
        DB Bookings: ${apiDebugInfo.total_bookings_in_range || 0}<br>
        API Days: ${apiDebugInfo.total_days || 0}<br>
        API Slots: ${apiDebugInfo.total_slots || 0}<br><br>
      `
          : ""
      }
      <button onclick="this.remove()" style="margin-top: 10px; padding: 5px 10px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 5px; cursor: pointer;">Hide</button>
      <button onclick="window.adminSchedule.loadScheduleData()" style="margin-top: 5px; padding: 5px 10px; border: 1px solid #28a745; background: #28a745; color: white; border-radius: 5px; cursor: pointer;">Refresh</button>
    `;

    document.body.appendChild(debugInfo);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (debugInfo.parentElement) {
        debugInfo.remove();
      }
    }, 15000);
  }

  // Modal and slot interaction methods
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
      overlay.style.display = "flex";
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

    if (isBooked) {
      this.updateBookingDetails(slotData);
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

    // Show action buttons based on status
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
        overlay.style.display = "none";
        this.selectedSlot = null;
      }, 300);
    }
  }

  handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeSlotModal();
    }
  }

  // Quick book modal methods
  openQuickBookModal() {
    const modal = document.getElementById("quick-book-modal-overlay");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    }
    this.closeSlotModal();
  }

  closeQuickBookModal() {
    const modal = document.getElementById("quick-book-modal-overlay");
    const form = document.getElementById("quick-book-form");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
    if (form) form.reset();
  }

  async handleQuickBook(event) {
    event.preventDefault();

    if (!this.selectedSlot) return;

    try {
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

  // Utility helper methods
  setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  setElementDisplay(id, display) {
    const element = document.getElementById(id);
    if (element) element.style.display = display;
  }

  getCourtName(courtId) {
    if (courtId === "all-courts") return "All Courts";

    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return court.name;
    }

    return courtId;
  }

  getStatusText(status) {
    const statusMap = {
      available: "Available",
      "booked-pending": "Pending Payment",
      "booked-confirmed": "Confirmed",
      "booked-conflict": "Multi-Court Booking",
    };
    return statusMap[status] || status;
  }

  showLoading(show) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      if (show) {
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
      } else {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }
    }
  }

  // Toast notification methods
  showSuccessToast(message) {
    this.showToast(message, "success", 3000);
  }

  showErrorToast(message) {
    this.showToast(message, "error", 5000);
  }

  showInfoToast(message) {
    this.showToast(message, "info", 3000);
  }

  showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
    };

    const colorMap = {
      success: "#28a745",
      error: "#dc3545",
      info: "#17a2b8",
    };

    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    const backgroundColor = colorMap[type] || colorMap.info;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
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

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight 0.3s ease";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 FIXED: Initializing Admin Schedule Manager...");
  window.adminSchedule = new AdminScheduleManager();
});

// Global debugging functions
window.forceRefreshSchedule = function () {
  if (window.adminSchedule) {
    console.log("🔄 FIXED: Force refreshing admin schedule...");
    window.adminSchedule.scheduleData = {}; // Clear cache
    window.adminSchedule.loadScheduleData();
  } else {
    console.error("❌ Admin schedule manager not found");
  }
};

window.debugScheduleData = function () {
  if (window.adminSchedule) {
    console.log(
      "🔍 FIXED: Current schedule data:",
      window.adminSchedule.scheduleData
    );

    // Count bookings per date
    Object.keys(window.adminSchedule.scheduleData || {}).forEach((date) => {
      const courts = window.adminSchedule.scheduleData[date] || {};
      let totalBookings = 0;
      Object.keys(courts).forEach((court) => {
        totalBookings += Object.keys(courts[court] || {}).length;
      });
      console.log(
        `📅 ${date}: ${totalBookings} bookings across ${
          Object.keys(courts).length
        } courts`
      );
    });
  } else {
    console.error("❌ Admin schedule manager not found");
  }
};

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

console.log("🔧 FIXED: Admin schedule fixes loaded successfully!");
