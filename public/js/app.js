// streamX Client JS
document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // User dropdown
  const avatar = document.querySelector('.avatar');
  const dropdown = document.getElementById('userMenu');
  if (avatar && dropdown) {
    document.addEventListener('click', (e) => {
      if (e.target === avatar || avatar.contains(e.target)) {
        dropdown.classList.toggle('show');
      } else {
        dropdown.classList.remove('show');
      }
    });
  }

  // Auto-toast from session flash
  if (typeof window.flashSuccess !== 'undefined' && window.flashSuccess) {
    showToast(window.flashSuccess, 'success');
  }
});

// Watchlist
function addToWatchlist(id) {
  showToast('Added to watchlist!', 'success');
}

// Toast notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
