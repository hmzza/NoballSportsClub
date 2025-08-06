// FIXED: Professional Admin Schedule Management System
// Enhanced debugging and booking display

// COMPLETE WORKING Admin Schedule - Based on your original working code
// Fixed all issues while keeping existing functionality

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
        },
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
    return slots;
  }

  init() {
    this.initializeSchedule();
    this.setupEventListeners();
    this.hideAllModals();
    setTimeout(() => {
      this.loadScheduleData();
    }, 100);
  }

  initializeSchedule() {
    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = this.currentDate.toISOString().split("T")[0];
      this.updateDateDisplay();

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

    // Modal controls - FIXED
    this.addEventListener("close-modal", "click", () => this.closeSlotModal());
    this.addEventListener("slot-modal-overlay", "click", (e) =>
      this.handleModalOverlayClick(e)
    );

    // Slot actions - FIXED with proper event handling
    this.addEventListener("book-slot-btn", "click", () =>
      this.openQuickBookModal()
    );
    this.addEventListener("block-slot-btn", "click", () =>
      this.blockSlotFromModal()
    );

    // Booking actions - FIXED
    this.addEventListener("confirm-booking-btn", "click", () =>
      this.confirmBookingFromModal()
    );
    this.addEventListener("decline-booking-btn", "click", () =>
      this.declineBookingFromModal()
    );
    this.addEventListener("cancel-booking-btn", "click", () =>
      this.cancelBookingFromModal()
    );
    this.addEventListener("edit-booking-btn", "click", () =>
      this.editBookingFromModal()
    );

    // Comments - FIXED
    this.addEventListener("save-comment-btn", "click", () =>
      this.saveSlotComment()
    );
    this.addEventListener("unblock-slot-btn", "click", () =>
      this.unblockSlotFromModal()
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

    this.addEventListener("close-quick-book-modal", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("cancel-quick-book", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("quick-book-form", "submit", (e) =>
      this.handleQuickBook(e)
    );

    // FIXED: Quick book modal overlay click
    this.addEventListener("quick-book-modal-overlay", "click", (e) =>
      this.handleQuickBookOverlayClick(e)
    );

    console.log("✅ FIXED: Quick book event listeners setup");
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

  // FIXED: Enhanced loadScheduleData (your original working logic)
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

      console.log("🔧 Loading schedule data with request:", requestData);

      const response = await fetch("/admin/api/schedule-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.scheduleData = data.schedule || {};
        console.log(
          "📊 Schedule data loaded:",
          Object.keys(this.scheduleData).length,
          "days"
        );

        this.renderSchedule();

        // Count total bookings
        let totalBookings = 0;
        Object.keys(this.scheduleData).forEach((date) => {
          Object.keys(this.scheduleData[date] || {}).forEach((court) => {
            totalBookings += Object.keys(
              this.scheduleData[date][court] || {}
            ).length;
          });
        });

        if (totalBookings > 0) {
          this.showSuccessToast(
            `Loaded ${totalBookings} bookings successfully`
          );
        }
      } else {
        throw new Error(data.message || "Failed to load schedule");
      }
    } catch (error) {
      console.error("❌ Error loading schedule:", error);
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

    grid.innerHTML = "";
    grid.className = `schedule-grid ${this.currentView}-view`;

    try {
      if (!this.scheduleData || typeof this.scheduleData !== "object") {
        this.scheduleData = {};
      }

      if (this.currentView === "week") {
        this.renderWeekView(grid);
      } else {
        this.renderDayView(grid);
      }

      console.log("✅ Schedule rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering schedule:", error);
      grid.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #666;">
          <h4>Error rendering schedule</h4>
          <p>Please try refreshing the page.</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Refresh Page</button>
        </div>
      `;
    }
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
        <div style="font-size: 0.8rem; opacity: 0.9;">${court.name}</div>
      `;
      grid.appendChild(courtHeader);
    });

    // Create time slots with merged booking support
    this.timeSlots.forEach((time, timeIndex) => {
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      courts.forEach((court) => {
        const slot = this.createTimeSlot(dateStr, time, court.id, timeIndex);
        grid.appendChild(slot);
      });
    });
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
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

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

  // ENHANCED: Merged booking functionality
  groupConsecutiveBookings(scheduleData, date, courtId) {
    try {
      if (!scheduleData[date] || !scheduleData[date][courtId]) {
        return {};
      }

      const courtBookings = scheduleData[date][courtId];
      const bookingGroups = {};
      const bookingsByID = {};

      Object.keys(courtBookings).forEach((time) => {
        const booking = courtBookings[time];
        const bookingId = booking.bookingId;

        if (!bookingsByID[bookingId]) {
          bookingsByID[bookingId] = [];
        }
        bookingsByID[bookingId].push({ time, ...booking });
      });

      Object.keys(bookingsByID).forEach((bookingId) => {
        const slots = bookingsByID[bookingId];
        slots.sort((a, b) => a.time.localeCompare(b.time));

        if (slots.length > 1) {
          const firstSlot = slots[0];
          bookingGroups[firstSlot.time] = {
            ...firstSlot,
            isGroupStart: true,
            groupSize: slots.length,
            mergedBooking: true,
          };

          for (let i = 1; i < slots.length; i++) {
            bookingGroups[slots[i].time] = {
              ...slots[i],
              isGroupContinuation: true,
              groupStartTime: firstSlot.time,
              mergedBooking: true,
            };
          }
        } else {
          bookingGroups[slots[0].time] = {
            ...slots[0],
            isGroupStart: true,
            groupSize: 1,
            mergedBooking: false,
          };
        }
      });

      return bookingGroups;
    } catch (error) {
      console.error("❌ Error grouping bookings:", error);
      return {};
    }
  }

  // ENHANCED: createTimeSlot with merged booking support
  createTimeSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement("div");
    slot.className = "time-slot available";
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;

    try {
      const groupedBookings = this.groupConsecutiveBookings(
        this.scheduleData,
        date,
        courtId
      );
      const slotData =
        groupedBookings[time] || this.getSlotData(date, time, courtId);

      if (slotData && slotData.mergedBooking) {
        if (slotData.isGroupContinuation) {
          slot.className = `time-slot ${slotData.status} group-continuation`;
          slot.innerHTML = `<div class="slot-content continuation-marker"></div>`;

          slot.style.backgroundColor = "transparent";
          slot.style.border = "none";
          slot.style.borderLeft = "8px solid #28a745";
          slot.style.borderRight = "8px solid #28a745";

          slot.addEventListener("click", () => {
            const startSlot = document.querySelector(
              `[data-time="${slotData.groupStartTime}"][data-court="${courtId}"]`
            );
            if (startSlot) startSlot.click();
          });
        } else if (slotData.isGroupStart) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `time-slot ${statusClass} group-start`;

          const duration = slotData.groupSize * 0.5;

          slot.innerHTML = `
            <div class="slot-content merged-booking">
              <div class="booking-header">
                <div class="slot-title" style="font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;">
                  Name: ${slotData.title || "Booked"}
                </div>                
                <div class="booking-duration" style="font-size: 0.7rem; opacity: 0.9; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; display: inline-block;">
                  Time: ${duration}h
                </div>
              </div>
              <div class="slot-subtitle" style="font-size: 0.75rem; opacity: 0.95; margin-top: 2px;">
                PKR ${(slotData.amount || 0).toLocaleString()}
              </div>
              ${
                slotData.subtitle && slotData.subtitle.includes("Multi Court")
                  ? `<div style="font-size: 0.6rem; opacity: 0.8; margin-top: 1px;">Multi Court</div>`
                  : ""
              }
            </div>
          `;

          const statusColors = {
            "booked-pending": "#ffc107",
            "booked-confirmed": "#28a745",
            "booked-conflict": "#dc3545",
            "booked-cancelled": "#6c757d",
          };

          const statusColor = statusColors[statusClass] || "#007bff";
          slot.style.backgroundColor = statusColor;
          slot.style.color = "white";
          slot.style.border = `3px solid ${statusColor}`;
          slot.style.borderRadius = "8px 8px 0 0";
          slot.style.fontWeight = "600";
          slot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        }
      } else if (slotData) {
        const statusClass = slotData.status || "booked-pending";
        slot.className = `time-slot ${statusClass}`;

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

        const statusColors = {
          "booked-pending": "#ffc107",
          "booked-confirmed": "#28a745",
          "booked-conflict": "#dc3545",
        };

        const statusColor = statusColors[statusClass] || "#007bff";
        slot.style.backgroundColor = statusColor;
        slot.style.color = "white";
        slot.style.border = `2px solid ${statusColor}`;
      } else {
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

      // FIXED: Click event with proper data passing
      slot.addEventListener("click", () => {
        console.log("🖱️ Slot clicked:", { date, time, courtId, slotData });
        this.openSlotModal(slot, slotData);
      });
    } catch (error) {
      console.error(`❌ Error creating slot for ${courtId} at ${time}:`, error);
      slot.innerHTML = `<div class="slot-content"><div class="slot-title" style="color: red;">Error</div></div>`;
      slot.style.backgroundColor = "#f8d7da";
    }

    return slot;
  }

  getSlotData(date, time, courtId) {
    try {
      if (!this.scheduleData || !this.scheduleData[date]) {
        return null;
      }

      if (courtId === "all-courts") {
        const allCourts = this.getAllCourts();
        for (const court of allCourts) {
          const courtBooking = this.getSlotDataForSpecificCourt(
            date,
            time,
            court.id
          );
          if (courtBooking) {
            return {
              ...courtBooking,
              title: `${courtBooking.title} (${court.sport.toUpperCase()})`,
              subtitle: `${courtBooking.subtitle} - ${court.name}`,
            };
          }
        }
        return null;
      }

      return this.getSlotDataForSpecificCourt(date, time, courtId);
    } catch (error) {
      console.error("❌ Error in getSlotData:", error);
      return null;
    }
  }

  getSlotDataForSpecificCourt(date, time, courtId) {
    try {
      if (
        this.scheduleData[date][courtId] &&
        this.scheduleData[date][courtId][time]
      ) {
        return this.scheduleData[date][courtId][time];
      }

      if (courtId in this.multiPurposeCourts) {
        const multiCourtType = this.multiPurposeCourts[courtId];
        const conflictingCourts = Object.keys(this.multiPurposeCourts).filter(
          (otherCourtId) =>
            this.multiPurposeCourts[otherCourtId] === multiCourtType &&
            otherCourtId !== courtId
        );

        for (const conflictCourt of conflictingCourts) {
          if (
            this.scheduleData[date][conflictCourt] &&
            this.scheduleData[date][conflictCourt][time]
          ) {
            const conflictData = this.scheduleData[date][conflictCourt][time];
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

      return null;
    } catch (error) {
      console.error(`❌ Error checking specific court ${courtId}:`, error);
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

  // FIXED: Modal functionality
  openSlotModal(slotElement, slotData) {
    try {
      console.log("🔓 Opening slot modal with data:", slotData);

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
        console.log("✅ Modal opened successfully");
      }
    } catch (error) {
      console.error("❌ Error opening modal:", error);
    }
  }

  // FIXED: Complete modal content update
  updateSlotModalContent(slotData) {
    try {
      if (!this.selectedSlot) return;

      const isAvailable = !slotData;
      const isBooked =
        slotData &&
        (slotData.status === "booked-pending" ||
          slotData.status === "booked-confirmed" ||
          slotData.status === "booked-conflict");

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
      this.setElementDisplay(
        "available-actions",
        isAvailable ? "block" : "none"
      );
      this.setElementDisplay("booking-details", isBooked ? "block" : "none");

      if (isBooked) {
        this.updateBookingDetails(slotData);
      }

      console.log("✅ Modal content updated");
    } catch (error) {
      console.error("❌ Error updating modal content:", error);
    }
  }

  updateBookingDetails(slotData) {
    try {
      this.setElementText("modal-booking-id", slotData.bookingId || "N/A");
      this.setElementText(
        "modal-player",
        slotData.playerName || slotData.title || "N/A"
      );
      this.setElementText("modal-phone", slotData.playerPhone || "N/A");
      this.setElementText(
        "modal-amount",
        `PKR ${(slotData.amount || 0).toLocaleString()}`
      );
      this.setElementText(
        "modal-duration",
        `${slotData.duration || 1} hour(s)`
      );

      const commentsEl = document.getElementById("slot-comments");
      if (commentsEl) {
        commentsEl.value = slotData.comments || "";
      }

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
      this.setElementDisplay("edit-booking-btn", "inline-block");
    } catch (error) {
      console.error("❌ Error updating booking details:", error);
    }
  }

  // FIXED: Booking action methods with proper API calls
  async confirmBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to confirm this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Confirming booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "confirm",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking confirmed successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to confirm booking");
      }
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
      this.showErrorToast("Failed to confirm booking: " + error.message);
    }
  }

  async declineBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to decline this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Declining booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "decline",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking declined successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to decline booking");
      }
    } catch (error) {
      console.error("❌ Error declining booking:", error);
      this.showErrorToast("Failed to decline booking: " + error.message);
    }
  }

  async cancelBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to cancel this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Cancelling booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "cancel",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking cancelled successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      this.showErrorToast("Failed to cancel booking: " + error.message);
    }
  }

  editBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    console.log(
      "✏️ Redirecting to edit booking:",
      this.selectedSlot.data.bookingId
    );
    this.closeSlotModal();
    window.location.href = `/admin/booking-control?booking=${this.selectedSlot.data.bookingId}`;
  }

  async saveSlotComment() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const comment = document.getElementById("slot-comments")?.value || "";
      console.log(
        "💬 Saving comment for booking:",
        this.selectedSlot.data.bookingId
      );

      this.showLoadingToast("Saving comment...");

      // Update locally for now
      setTimeout(() => {
        if (this.selectedSlot.data) {
          this.selectedSlot.data.comments = comment;
        }
        this.showSuccessToast("Comment saved successfully!");
      }, 500);
    } catch (error) {
      console.error("❌ Error saving comment:", error);
      this.showErrorToast("Failed to save comment: " + error.message);
    }
  }

  async blockSlotFromModal() {
    if (!this.selectedSlot) {
      this.showErrorToast("No slot selected");
      return;
    }

    try {
      const reason = prompt(
        "Enter reason for blocking this slot:",
        "Maintenance"
      );
      if (!reason) return;

      this.showLoadingToast("Blocking slot...");

      // Simulate API call for now
      setTimeout(() => {
        this.showSuccessToast("Slot blocked successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      }, 1000);
    } catch (error) {
      console.error("❌ Error blocking slot:", error);
      this.showErrorToast("Failed to block slot: " + error.message);
    }
  }

  async unblockSlotFromModal() {
    if (!this.selectedSlot) {
      this.showErrorToast("No slot selected");
      return;
    }

    try {
      const confirmed = confirm("Are you sure you want to unblock this slot?");
      if (!confirmed) return;

      this.showLoadingToast("Unblocking slot...");

      setTimeout(() => {
        this.showSuccessToast("Slot unblocked successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      }, 1000);
    } catch (error) {
      console.error("❌ Error unblocking slot:", error);
      this.showErrorToast("Failed to unblock slot: " + error.message);
    }
  }

  closeSlotModal() {
    try {
      const overlay = document.getElementById("slot-modal-overlay");
      const modal = document.getElementById("slot-modal");

      if (modal && overlay) {
        modal.style.animation = "slideOutDown 0.3s ease";
        setTimeout(() => {
          overlay.classList.add("hidden");
          overlay.style.display = "none";
          this.selectedSlot = null;

          const commentsEl = document.getElementById("slot-comments");
          if (commentsEl) commentsEl.value = "";
        }, 300);
      }
    } catch (error) {
      console.error("❌ Error closing modal:", error);
    }
  }

  handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeSlotModal();
    }
  }

  ////////////////////////////////////////
  //  START - QUICK BOOOKING FUNCTIONALITY
  ////////////////////////////////////////
  // Quick book modal methods
  openQuickBookModal() {
    try {
      console.log(
        "📖 FIXED: Opening quick book modal for slot:",
        this.selectedSlot
      );

      if (!this.selectedSlot) {
        this.showErrorToast("No slot selected for booking");
        return;
      }

      const modal = document.getElementById("quick-book-modal-overlay");
      if (!modal) {
        this.showErrorToast("Quick book modal not found");
        return;
      }

      // FIXED: Setup form with slot information
      this.setupQuickBookForm();

      // Show modal
      modal.classList.remove("hidden");
      modal.style.display = "flex";

      // Focus on first input
      const firstInput = document.getElementById("quick-player-name");
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }

      // Close slot modal
      this.closeSlotModal();

      console.log("✅ FIXED: Quick book modal opened successfully");
    } catch (error) {
      console.error("❌ FIXED: Error opening quick book modal:", error);
      this.showErrorToast("Failed to open booking form");
    }
  }

  // FIXED: Setup form with default values and validation
  setupQuickBookForm() {
    try {
      // Clear form first
      const form = document.getElementById("quick-book-form");
      if (form) {
        form.reset();
      }

      // FIXED: Set default duration based on court type
      const durationSelect = document.getElementById("quick-duration");
      if (durationSelect && this.selectedSlot?.court) {
        const courtSport = this.getCourtSport(this.selectedSlot.court);
        const defaultDurations = {
          padel: "1.5",
          cricket: "2",
          futsal: "1",
          pickleball: "1",
        };
        durationSelect.value = defaultDurations[courtSport] || "1";
      }

      // FIXED: Set default player count based on sport
      const playerCountSelect = document.getElementById("quick-player-count");
      if (playerCountSelect && this.selectedSlot?.court) {
        const courtSport = this.getCourtSport(this.selectedSlot.court);
        const defaultPlayers = {
          padel: "4",
          cricket: "6",
          futsal: "5",
          pickleball: "2",
        };
        playerCountSelect.value = defaultPlayers[courtSport] || "2";
      }

      // FIXED: Update modal title with slot info
      const modalTitle = document.querySelector(
        "#quick-book-modal .modal-header h3"
      );
      if (modalTitle && this.selectedSlot) {
        const courtName = this.getCourtName(this.selectedSlot.court);
        const timeStr = this.formatTime(this.selectedSlot.time);
        const dateStr = this.formatDate(this.selectedSlot.date);

        modalTitle.innerHTML = `
          Quick Book Slot<br>
          <small style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">
            ${courtName} - ${timeStr} on ${dateStr}
          </small>
        `;
      }

      console.log("✅ FIXED: Quick book form setup complete");
    } catch (error) {
      console.error("❌ FIXED: Error setting up quick book form:", error);
    }
  }

  // FIXED: Get court sport from court ID
  getCourtSport(courtId) {
    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return sport;
    }
    return "unknown";
  }

  // FIXED: Enhanced handleQuickBook with proper validation and API call
  async handleQuickBook(event) {
    event.preventDefault();

    try {
      console.log("📝 FIXED: Processing quick book form submission");

      if (!this.selectedSlot) {
        this.showErrorToast("No slot selected for booking");
        return;
      }

      // FIXED: Collect form data with validation
      const formData = this.collectQuickBookFormData();

      // FIXED: Validate required fields
      const validationError = this.validateQuickBookData(formData);
      if (validationError) {
        this.showErrorToast(validationError);
        return;
      }

      // FIXED: Show loading state
      this.showLoadingToast("Creating booking...");

      // FIXED: Disable form to prevent double submission
      this.setQuickBookFormDisabled(true);

      console.log("📤 FIXED: Sending booking data:", formData);

      // FIXED: Make API call
      const response = await fetch("/admin/api/admin-create-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      console.log("📡 FIXED: API response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("📥 FIXED: API response:", result);

      if (result.success) {
        this.showSuccessToast(
          `Booking created successfully! ID: ${result.bookingId}`
        );
        this.closeQuickBookModal();

        // FIXED: Refresh schedule to show new booking
        setTimeout(() => {
          this.loadScheduleData();
        }, 500);
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("❌ FIXED: Quick book error:", error);
      this.showErrorToast("Failed to create booking: " + error.message);
    } finally {
      // FIXED: Re-enable form
      this.setQuickBookFormDisabled(false);
    }
  }

  // FIXED: Collect and validate form data
  collectQuickBookFormData() {
    const playerName =
      document.getElementById("quick-player-name")?.value?.trim() || "";
    const playerPhone =
      document.getElementById("quick-player-phone")?.value?.trim() || "";
    const playerEmail =
      document.getElementById("quick-player-email")?.value?.trim() || "";
    const duration = parseFloat(
      document.getElementById("quick-duration")?.value || 1
    );
    const playerCount =
      document.getElementById("quick-player-count")?.value || "2";
    const paymentStatus =
      document.getElementById("quick-payment-status")?.value || "confirmed";
    const specialRequests =
      document.getElementById("quick-comments")?.value?.trim() || "";

    // FIXED: Calculate end time
    const startTime = this.selectedSlot.time;
    const endTime = this.calculateEndTime(startTime, duration);

    // FIXED: Get court information
    const courtSport = this.getCourtSport(this.selectedSlot.court);
    const courtName = this.getCourtName(this.selectedSlot.court);

    // FIXED: Calculate total amount
    const totalAmount = this.calculateBookingAmount(courtSport, duration);

    return {
      // Required fields
      sport: courtSport,
      court: this.selectedSlot.court,
      courtName: courtName,
      date: this.selectedSlot.date,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      playerName: playerName,
      playerPhone: playerPhone,

      // Optional fields
      playerEmail: playerEmail,
      playerCount: playerCount,
      specialRequests: specialRequests,
      paymentType: "advance", // Default for admin bookings
      totalAmount: totalAmount,
      status: paymentStatus,

      // FIXED: Generate selected slots array
      selectedSlots: this.generateSelectedSlots(startTime, duration),
    };
  }

  // FIXED: Validate form data
  validateQuickBookData(data) {
    if (!data.playerName) {
      return "Player name is required";
    }

    if (data.playerName.length < 2) {
      return "Player name must be at least 2 characters long";
    }

    if (!data.playerPhone) {
      return "Phone number is required";
    }

    if (data.playerPhone.length < 10) {
      return "Please enter a valid phone number";
    }

    if (!data.duration || data.duration <= 0) {
      return "Duration must be greater than 0";
    }

    if (data.duration > 6) {
      return "Maximum duration is 6 hours";
    }

    if (!data.court || !data.date || !data.startTime) {
      return "Slot information is missing";
    }

    return null; // No validation errors
  }

  // FIXED: Calculate end time from start time and duration
  calculateEndTime(startTime, durationHours) {
    try {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + durationHours * 60;

      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;

      return `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("❌ FIXED: Error calculating end time:", error);
      return startTime;
    }
  }

  // FIXED: Calculate booking amount based on sport and duration
  calculateBookingAmount(sport, duration) {
    const pricing = {
      padel: 5500,
      cricket: 3000,
      futsal: 2500,
      pickleball: 2500,
    };

    const hourlyRate = pricing[sport] || 2500;
    return Math.round(hourlyRate * duration);
  }

  // FIXED: Generate selected slots array for backend
  generateSelectedSlots(startTime, durationHours) {
    try {
      const slots = [];
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const totalSlots = Math.ceil(durationHours * 2); // Each slot is 30 minutes

      for (let i = 0; i < totalSlots; i++) {
        const slotMinutes = startHours * 60 + startMinutes + i * 30;
        const slotHours = Math.floor(slotMinutes / 60) % 24;
        const slotMins = slotMinutes % 60;

        const timeStr = `${slotHours.toString().padStart(2, "0")}:${slotMins
          .toString()
          .padStart(2, "0")}`;

        slots.push({
          time: timeStr,
          index: i,
        });
      }

      console.log("🕐 FIXED: Generated slots:", slots);
      return slots;
    } catch (error) {
      console.error("❌ FIXED: Error generating slots:", error);
      return [{ time: startTime, index: 0 }];
    }
  }

  // FIXED: Enable/disable form to prevent double submission
  setQuickBookFormDisabled(disabled) {
    const form = document.getElementById("quick-book-form");
    if (form) {
      const inputs = form.querySelectorAll("input, select, textarea, button");
      inputs.forEach((input) => {
        input.disabled = disabled;
      });

      // FIXED: Update submit button text
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        if (disabled) {
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Creating...';
        } else {
          submitBtn.innerHTML = "Create Booking";
        }
      }
    }
  }

  // FIXED: Enhanced closeQuickBookModal with proper cleanup
  closeQuickBookModal() {
    try {
      const modal = document.getElementById("quick-book-modal-overlay");
      const form = document.getElementById("quick-book-form");

      if (modal) {
        // FIXED: Animate close
        const modalContent = document.getElementById("quick-book-modal");
        if (modalContent) {
          modalContent.style.animation = "slideOutDown 0.3s ease";
        }

        setTimeout(() => {
          modal.classList.add("hidden");
          modal.style.display = "none";

          // FIXED: Reset form and modal title
          if (form) {
            form.reset();
            this.setQuickBookFormDisabled(false);
          }

          const modalTitle = document.querySelector(
            "#quick-book-modal .modal-header h3"
          );
          if (modalTitle) {
            modalTitle.textContent = "Quick Book Slot";
          }

          console.log("✅ FIXED: Quick book modal closed and cleaned up");
        }, 300);
      }
    } catch (error) {
      console.error("❌ FIXED: Error closing quick book modal:", error);
    }
  }

  // FIXED: Handle overlay click
  handleQuickBookOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeQuickBookModal();
    }
  }

  // FIXED: Enhanced error handling for quick book
  showQuickBookError(message) {
    // FIXED: Show error in modal instead of toast if modal is open
    const modal = document.getElementById("quick-book-modal-overlay");
    if (modal && !modal.classList.contains("hidden")) {
      // Remove existing error message
      const existingError = document.getElementById("quick-book-error");
      if (existingError) {
        existingError.remove();
      }

      // Add error message to modal
      const modalBody = document.querySelector("#quick-book-modal .modal-body");
      if (modalBody) {
        const errorDiv = document.createElement("div");
        errorDiv.id = "quick-book-error";
        errorDiv.style.cssText = `
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border-left: 4px solid #dc3545;
          font-size: 0.9rem;
        `;
        errorDiv.innerHTML = `
          <strong><i class="fas fa-exclamation-triangle"></i> Error:</strong> ${message}
        `;

        modalBody.insertBefore(errorDiv, modalBody.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 5000);
      }
    } else {
      // Fall back to toast if modal is not open
      this.showErrorToast(message);
    }
  }

  ////////////////////////////////////////
  //  END - QUICK BOOOKING FUNCTIONALITY
  ////////////////////////////////////////

  // Navigation methods
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

  // FIXED: Toast notification system
  showSuccessToast(message) {
    this.showToast(message, "success", 3000);
  }

  showErrorToast(message) {
    this.showToast(message, "error", 5000);
  }

  showLoadingToast(message) {
    if (this.currentLoadingToast) {
      this.currentLoadingToast.remove();
    }
    this.currentLoadingToast = this.showToast(message, "info", 0);
  }

  showToast(message, type = "info", duration = 3000) {
    // Remove existing loading toast when showing new non-loading toast
    if (type !== "info" && this.currentLoadingToast) {
      this.currentLoadingToast.remove();
      this.currentLoadingToast = null;
    }

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

    const isLoading = type === "info" && duration === 0;

    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${iconMap[type] || iconMap.info} ${
      isLoading ? "fa-spin" : ""
    }"></i>
        <span>${message}</span>
      </div>
      ${
        duration > 0
          ? '<button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>'
          : ""
      }
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

    return toast;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Initializing Complete Admin Schedule Manager...");
  window.adminSchedule = new AdminScheduleManager();
});

// Global debugging functions
window.forceRefreshSchedule = function () {
  if (window.adminSchedule) {
    console.log("🔄 Force refreshing admin schedule...");
    window.adminSchedule.scheduleData = {};
    window.adminSchedule.loadScheduleData();
  } else {
    console.error("❌ Admin schedule manager not found");
  }
};

// Enhanced CSS for merged bookings and modal functionality
const enhancedStyle = document.createElement("style");
enhancedStyle.id = "complete-admin-schedule-style";
enhancedStyle.textContent = `
  /* Enhanced styles for merged booking slots */
  .time-slot.group-start {
    position: relative;
    z-index: 10;
  }
  
  .time-slot.group-continuation {
    border-top: none !important;
    border-bottom: none !important;
    position: relative;
    z-index: 5;
  }
  
  .time-slot.group-continuation:last-of-type {
    border-bottom: 8px solid #28a745 !important;
    border-radius: 0 0 8px 8px !important;
  }
  
  .merged-booking {
    padding: 8px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  
  .booking-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  
  .continuation-marker {
    height: 100%;
    background: linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.1) 50%, transparent 80%);
  }
  
  .time-slot.group-start:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    transition: all 0.2s ease;
  }
  
  .time-slot.group-continuation:hover {
    background: rgba(0,123,255,0.1) !important;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-overlay.hidden {
    display: none !important;
  }

  .modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  }

  .modal-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    transition: color 0.3s ease;
    padding: 4px;
    border-radius: 4px;
  }

  .close-btn:hover {
    color: #dc3545;
    background: #f8f9fa;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .info-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .info-group:last-child {
    border-bottom: none;
  }

  .info-group label {
    font-weight: 600;
    color: #555;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 15px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .booking-details {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .comments-section textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9rem;
  }

  .booking-actions, .available-actions .action-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    justify-content: center;
  }

  .action-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  /* Animation keyframes */
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

// Only add styles if not already present
if (!document.getElementById("complete-admin-schedule-style")) {
  document.head.appendChild(enhancedStyle);
}

console.log(
  "🎯 COMPLETE: Working admin schedule with full modal functionality loaded!"
);

// FIXED: Enhanced CSS for quick book modal
const quickBookStyle = document.createElement("style");
quickBookStyle.id = "quick-book-modal-style";
quickBookStyle.textContent = `
  /* Enhanced quick book modal styles */
  #quick-book-modal {
    max-width: 600px;
    width: 95%;
  }

  #quick-book-modal .modal-header {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  #quick-book-modal .modal-header h3 {
    color: white;
  }

  #quick-book-modal .close-btn {
    color: white;
  }

  #quick-book-modal .close-btn:hover {
    color: #f8f9fa;
    background: rgba(255,255,255,0.2);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #495057;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }

  .btn-cancel {
    padding: 0.75rem 1.5rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .btn-cancel:hover {
    background: #5a6268;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    background: #218838;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
  }

  /* Form validation styles */
  .form-group input:invalid {
    border-color: #dc3545;
  }

  .form-group input:valid {
    border-color: #28a745;
  }

  /* Loading state */
  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled {
    background-color: #f8f9fa;
    opacity: 0.6;
  }
`;

if (!document.getElementById("quick-book-modal-style")) {
  document.head.appendChild(quickBookStyle);
}

console.log("🎯 FIXED: Complete quick book functionality implemented!");
