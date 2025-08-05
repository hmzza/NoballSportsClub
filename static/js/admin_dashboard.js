// Professional Admin Dashboard System
// Clean, maintainable, and well-structured

class AdminDashboard {
  constructor() {
    this.refreshInterval = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadDashboardData();
    this.initializeAutoRefresh();
  }

  setupEventListeners() {
    // Management card navigation - FIXED
    document.querySelectorAll(".management-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        const url = card.dataset.url;
        if (url) {
          console.log(`Navigating to: ${url}`);
          window.location.href = url;
        } else {
          console.error("No URL found for card:", card);
        }
      });
    });

    // Quick action buttons
    this.setupQuickActions();

    console.log("✅ Dashboard event listeners setup complete");
  }

  setupQuickActions() {
    // Quick booking button
    const quickBookBtn = document.getElementById("quick-book-btn");
    if (quickBookBtn) {
      quickBookBtn.addEventListener("click", () => this.createQuickBooking());
    }

    // Today's schedule button
    const todayScheduleBtn = document.getElementById("today-schedule-btn");
    if (todayScheduleBtn) {
      todayScheduleBtn.addEventListener("click", () =>
        this.viewTodaySchedule()
      );
    }

    // Export data button
    const exportBtn = document.getElementById("export-data-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportData());
    }

    // Bulk notifications button
    const bulkNotifyBtn = document.getElementById("bulk-notify-btn");
    if (bulkNotifyBtn) {
      bulkNotifyBtn.addEventListener("click", () =>
        this.sendBulkNotifications()
      );
    }

    // Generate reports button
    const reportsBtn = document.getElementById("reports-btn");
    if (reportsBtn) {
      reportsBtn.addEventListener("click", () => this.generateReports());
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }
  }

  initializeAutoRefresh() {
    // Auto-refresh dashboard every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.refreshDashboardStats();
      }
    }, 30000);

    // Stop auto-refresh when page is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.refreshInterval) {
        clearInterval(this.refreshInterval);
      } else if (
        document.visibilityState === "visible" &&
        !this.refreshInterval
      ) {
        this.initializeAutoRefresh();
      }
    });
  }

  async loadDashboardData() {
    try {
      this.showLoadingState();
      await this.refreshDashboardStats();
      this.hideLoadingState();
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      this.showErrorMessage("Failed to load dashboard data");
      this.hideLoadingState();
    }
  }

  async refreshDashboardStats() {
    try {
      console.log("🔄 Refreshing dashboard stats...");

      const response = await fetch("/admin/api/dashboard-stats");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.updateDashboardStats(data.stats);
        console.log("✅ Dashboard stats updated");
      } else {
        throw new Error(data.message || "Failed to get stats");
      }
    } catch (error) {
      console.error("❌ Error refreshing dashboard stats:", error);
      this.showErrorMessage("Failed to refresh statistics");
    }
  }

  updateDashboardStats(stats) {
    try {
      // Update stat cards with latest data using more robust selectors
      const statUpdates = [
        {
          selector: '[data-stat="total-bookings"]',
          value: stats.total_bookings || 0,
        },
        {
          selector: '[data-stat="pending-payment"]',
          value: stats.pending_payment || 0,
        },
        { selector: '[data-stat="confirmed"]', value: stats.confirmed || 0 },
        { selector: '[data-stat="cancelled"]', value: stats.cancelled || 0 },
        {
          selector: '[data-stat="revenue"]',
          value: `PKR ${(stats.revenue || 0).toLocaleString()}`,
        },
      ];

      statUpdates.forEach(({ selector, value }) => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = value;
        } else {
          // Fallback to class-based selectors
          this.updateStatByClass(
            selector.replace('[data-stat="', "").replace('"]', ""),
            value
          );
        }
      });

      // Update last refresh time
      this.updateLastRefreshTime();

      console.log("📊 Stats updated:", stats);
    } catch (error) {
      console.error("❌ Error updating dashboard stats:", error);
    }
  }

  updateStatByClass(statType, value) {
    // Fallback method using class selectors
    const classMap = {
      "total-bookings": ".total-bookings-stat",
      "pending-payment": ".pending-payment-stat",
      confirmed: ".confirmed-stat",
      cancelled: ".cancelled-stat",
      revenue: ".revenue-stat",
    };

    const className = classMap[statType];
    if (className) {
      const element = document.querySelector(className);
      if (element) {
        element.textContent = value;
      }
    }
  }

  updateLastRefreshTime() {
    const refreshTimeEl = document.getElementById("last-refresh-time");
    if (refreshTimeEl) {
      const now = new Date();
      refreshTimeEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
  }

  // Quick Actions
  createQuickBooking() {
    console.log("📝 Navigating to booking control...");
    window.location.href = "/admin/booking-control";
  }

  viewTodaySchedule() {
    const today = new Date().toISOString().split("T")[0];
    console.log(`📅 Viewing today's schedule: ${today}`);
    window.location.href = `/admin/schedule?date=${today}`;
  }

  async exportData() {
    try {
      this.showLoadingMessage("Preparing export...");

      const response = await fetch("/admin/api/export-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "csv",
          dateRange: "all",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookings_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showSuccessMessage("Export completed successfully!");
      } else {
        throw new Error(`Export failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      this.showErrorMessage("Failed to export data. Please try again.");
    }
  }

  async sendBulkNotifications() {
    try {
      const confirmed = confirm(
        "Send notifications to all users with pending bookings?"
      );
      if (!confirmed) return;

      this.showLoadingMessage("Sending notifications...");

      const response = await fetch("/admin/api/send-bulk-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pending_payment_reminder" }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessMessage(
          `Notifications sent to ${result.count} users successfully!`
        );
      } else {
        throw new Error(result.message || "Failed to send notifications");
      }
    } catch (error) {
      console.error("❌ Bulk notification error:", error);
      this.showErrorMessage("Failed to send notifications. Please try again.");
    }
  }

  generateReports() {
    this.showInfoMessage("Reports feature coming soon!");
  }

  logout() {
    const confirmed = confirm("Are you sure you want to logout?");
    if (confirmed) {
      console.log("🚪 Logging out...");
      window.location.href = "/admin/logout";
    }
  }

  // UI State Management
  showLoadingState() {
    const loadingEl = document.getElementById("dashboard-loading");
    if (loadingEl) {
      loadingEl.style.display = "block";
    }
  }

  hideLoadingState() {
    const loadingEl = document.getElementById("dashboard-loading");
    if (loadingEl) {
      loadingEl.style.display = "none";
    }
  }

  // Toast Notifications
  showLoadingMessage(message) {
    this.showToast(message, "info", 0);
  }

  showSuccessMessage(message) {
    this.showToast(message, "success", 3000);
  }

  showErrorMessage(message) {
    this.showToast(message, "error", 5000);
  }

  showInfoMessage(message) {
    this.showToast(message, "info", 3000);
  }

  showToast(message, type = "info", duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll(".dashboard-toast");
    existingToasts.forEach((toast) => toast.remove());

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `dashboard-toast toast-${type}`;

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
      warning: "fa-exclamation-triangle",
    };

    const colorMap = {
      success: "#28a745",
      error: "#dc3545",
      info: "#17a2b8",
      warning: "#ffc107",
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

    // Add toast styles
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

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight 0.3s ease";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }

  // Cleanup
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing Admin Dashboard...");
  window.adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener("beforeunload", function () {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});

// Add CSS animations
const style = document.createElement("style");
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
    
    .dashboard-toast {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
`;
document.head.appendChild(style);
