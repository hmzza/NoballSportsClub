// admin_dashboard.js
// Admin Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

function initializeDashboard() {
    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            refreshDashboardStats();
        }
    }, 30000);
}

function setupEventListeners() {
    // Management card navigation
    document.querySelectorAll('.management-card').forEach(card => {
        card.addEventListener('click', function() {
            const url = this.dataset.url;
            if (url) {
                window.location.href = url;
            }
        });
    });

    // Add any other specific dashboard event listeners here
    console.log('Dashboard event listeners setup complete');
}

async function loadDashboardData() {
    try {
        // Load recent activity and update stats
        await refreshDashboardStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function refreshDashboardStats() {
    try {
        const response = await fetch('/admin/api/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
        }
    } catch (error) {
        console.error('Error refreshing dashboard stats:', error);
    }
}

function updateDashboardStats(stats) {
    // Update stat cards with latest data
    const statElements = {
        totalBookings: document.querySelector('.stat-card:nth-child(1) .stat-number'),
        pendingPayment: document.querySelector('.stat-card:nth-child(2) .stat-number'),
        confirmed: document.querySelector('.stat-card:nth-child(3) .stat-number'),
        cancelled: document.querySelector('.stat-card:nth-child(4) .stat-number'),
        revenue: document.querySelector('.stat-card:nth-child(5) .stat-number')
    };

    if (statElements.totalBookings) statElements.totalBookings.textContent = stats.totalBookings || 0;
    if (statElements.pendingPayment) statElements.pendingPayment.textContent = stats.pendingPayment || 0;
    if (statElements.confirmed) statElements.confirmed.textContent = stats.confirmed || 0;
    if (statElements.cancelled) statElements.cancelled.textContent = stats.cancelled || 0;
    if (statElements.revenue) statElements.revenue.textContent = `PKR ${(stats.revenue || 0).toLocaleString()}`;
}

// Quick Actions
function createQuickBooking() {
    window.location.href = '/admin/booking-control';
}

function viewTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    window.location.href = `/admin/schedule?date=${today}`;
}

async function exportData() {
    try {
        showLoadingMessage('Preparing export...');
        
        const response = await fetch('/admin/api/export-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                format: 'csv',
                dateRange: 'all'
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showSuccessMessage('Export completed successfully!');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        showErrorMessage('Failed to export data. Please try again.');
    }
}

async function sendBulkNotifications() {
    try {
        const confirmed = confirm('Send notifications to all users with pending bookings?');
        if (!confirmed) return;

        showLoadingMessage('Sending notifications...');

        const response = await fetch('/admin/api/send-bulk-notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'pending_payment_reminder'
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(`Notifications sent to ${result.count} users successfully!`);
        } else {
            throw new Error(result.message || 'Failed to send notifications');
        }
    } catch (error) {
        console.error('Bulk notification error:', error);
        showErrorMessage('Failed to send notifications. Please try again.');
    }
}

function generateReports() {
    // Navigate to reports page (to be implemented)
    showInfoMessage('Reports feature coming soon!');
}

function logout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        window.location.href = '/admin/logout';
    }
}

// Utility functions
function showLoadingMessage(message) {
    // Create or update loading toast
    showToast(message, 'info', 0); // 0 = no auto-hide
}

function showSuccessMessage(message) {
    showToast(message, 'success', 3000);
}

function showErrorMessage(message) {
    showToast(message, 'error', 5000);
}

function showInfoMessage(message) {
    showToast(message, 'info', 3000);
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
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

    // Auto-remove toast after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
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

// Add CSS animations
const style = document.createElement('style');
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