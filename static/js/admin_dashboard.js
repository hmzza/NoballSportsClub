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
    console.log("✅ Admin Dashboard initialized successfully");
  }

  setupEventListeners() {
    // FIXED: Management card navigation
    document.querySelectorAll(".management-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        const url = card.dataset.url;
        if (url) {
          console.log(`🔗 Navigating to: ${url}`);
          // Add loading state
          this.showLoadingState(card);
          window.location.href = url;
        } else {
          console.error("❌ No URL found for card:", card);
        }
      });

      // Add hover effects
      card.addEventListener("mouseenter", function () {
        this.style.transform = "translateY(-4px)";
        this.style.boxShadow = "0 12px 40px rgba(0,0,0,0.15)";
      });

      card.addEventListener("mouseleave", function () {
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "";
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

    // Logout button - handled in HTML inline script for immediacy
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
        this.refreshInterval = null;
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
      console.log("✅ Dashboard data loaded successfully");
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
        console.log("✅ Dashboard stats updated successfully");
      } else {
        throw new Error(data.message || "Failed to get stats");
      }
    } catch (error) {
      console.error("❌ Error refreshing dashboard stats:", error);
      // Don't show error message for auto-refresh failures
      if (!this.refreshInterval) {
        this.showErrorMessage("Failed to refresh statistics");
      }
    }
  }

  updateDashboardStats(stats) {
    try {
      // Update stat cards with latest data
      const statUpdates = [
        {
          selector: '[data-stat="total-bookings"]',
          value: stats.total_bookings || 0,
        },
        {
          selector: '[data-stat="pending-payment"]',
          value: stats.pending_payment || 0,
        },
        {
          selector: '[data-stat="confirmed"]',
          value: stats.confirmed || 0,
        },
        {
          selector: '[data-stat="cancelled"]',
          value: stats.cancelled || 0,
        },
        {
          selector: '[data-stat="revenue"]',
          value: `PKR ${(stats.revenue || 0).toLocaleString()}`,
        },
      ];

      statUpdates.forEach(({ selector, value }) => {
        const element = document.querySelector(selector);
        if (element) {
          // Add animation effect
          element.style.transition = "all 0.3s ease";
          element.style.transform = "scale(1.1)";
          element.textContent = value;

          setTimeout(() => {
            element.style.transform = "scale(1)";
          }, 300);
        } else {
          console.warn(`⚠️ Element not found: ${selector}`);
        }
      });

      // Update pending count in management card
      const pendingCountEl = document.querySelector(".pending-count");
      if (pendingCountEl) {
        pendingCountEl.textContent = `${stats.pending_payment || 0} pending`;
      }

      // Update last refresh time
      this.updateLastRefreshTime();

      console.log("📊 Stats updated:", stats);
    } catch (error) {
      console.error("❌ Error updating dashboard stats:", error);
    }
  }

  updateLastRefreshTime() {
    const refreshTimeEl = document.getElementById("last-refresh-time");
    if (refreshTimeEl) {
      const now = new Date();
      refreshTimeEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
  }

  // Quick Actions Implementation
  createQuickBooking() {
    console.log("📝 Navigating to booking control...");
    this.showSuccessMessage("Redirecting to booking control...");
    setTimeout(() => {
      window.location.href = "/admin/booking-control";
    }, 500);
  }

  viewTodaySchedule() {
    const today = new Date().toISOString().split("T")[0];
    console.log(`📅 Viewing today's schedule: ${today}`);
    this.showSuccessMessage("Loading today's schedule...");
    setTimeout(() => {
      window.location.href = `/admin/schedule?date=${today}`;
    }, 500);
  }

  async exportData() {
    try {
      this.showLoadingMessage("Preparing export...");

      // Simulate export functionality for now
      setTimeout(() => {
        this.showSuccessMessage("Export feature will be available soon!");
      }, 2000);

      // TODO: Implement actual export functionality
      /*
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
      */
    } catch (error) {
      console.error("❌ Export error:", error);
      this.showErrorMessage("Export feature coming soon!");
    }
  }

  async sendBulkNotifications() {
    try {
      const confirmed = confirm(
        "Send notifications to all users with pending bookings?"
      );
      if (!confirmed) return;

      this.showLoadingMessage("Sending notifications...");

      // Simulate notification sending for now
      setTimeout(() => {
        this.showSuccessMessage(
          "Bulk notification feature will be available soon!"
        );
      }, 2000);

      // TODO: Implement actual notification functionality
      /*
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
      */
    } catch (error) {
      console.error("❌ Bulk notification error:", error);
      this.showErrorMessage("Notification feature coming soon!");
    }
  }

  generateReports() {
    this.showInfoMessage("Advanced reports feature coming soon!");
    console.log("📊 Reports feature requested");
  }

  // UI State Management
  showLoadingState(element = null) {
    if (element) {
      const icon = element.querySelector("i");
      if (icon) {
        icon.classList.add("fa-spin");
      }
    }

    const loadingEl = document.getElementById("dashboard-loading");
    if (loadingEl) {
      loadingEl.style.display = "flex";
    }
  }

  hideLoadingState() {
    // Remove spin from all icons
    document.querySelectorAll(".fa-spin").forEach((icon) => {
      if (!icon.closest(".loading-spinner")) {
        icon.classList.remove("fa-spin");
      }
    });

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
      max-width: 500px;
      animation: slideInRight 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    console.log("🧹 Dashboard cleanup completed");
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing Admin Dashboard...");

  // Check if we're on the dashboard page
  if (
    document.querySelector(".admin-dashboard") ||
    document.querySelector(".stats-grid")
  ) {
    window.adminDashboard = new AdminDashboard();
  } else {
    console.log("ℹ️ Not on dashboard page, skipping initialization");
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", function () {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});

// Add CSS animations if not already present
if (!document.querySelector("#dashboard-animations")) {
  const style = document.createElement("style");
  style.id = "dashboard-animations";
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
      padding: 4px;
    }
    
    .toast-close:hover {
      opacity: 1;
    }
    
    .management-card {
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .management-card:hover {
      transform: translateY(-4px);
    }
    
    .action-btn {
      position: relative;
      overflow: hidden;
    }
    
    .action-btn:active {
      transform: translateY(1px);
    }
    
    .stat-card {
      transition: all 0.3s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    #dashboard-loading {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .loading-spinner {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    
    .loading-spinner i {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #007bff;
    }
    
    .no-activity {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    
    .view-all-activity {
      text-align: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
    
    .system-status {
      margin-top: 2rem;
    }
    
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ccc;
    }
    
    .status-indicator.online {
      background: #28a745;
      box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
    }
    
    .status-indicator.offline {
      background: #dc3545;
      box-shadow: 0 0 8px rgba(220, 53, 69, 0.4);
    }
    
    .status-title {
      font-weight: 600;
      color: #333;
    }
    
    .status-subtitle {
      font-size: 0.8rem;
      color: #666;
    }
    
    .refresh-indicator {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      color: #666;
    }
  `;
  document.head.appendChild(style);
}

// Global debugging functions
window.refreshDashboard = function () {
  if (window.adminDashboard) {
    console.log("🔄 Manually refreshing dashboard...");
    window.adminDashboard.refreshDashboardStats();
  } else {
    console.error("❌ Dashboard not initialized");
  }
};

window.testDashboardToast = function (type = "info", message = "Test message") {
  if (window.adminDashboard) {
    window.adminDashboard.showToast(message, type, 3000);
  } else {
    console.error("❌ Dashboard not initialized");
  }
};
