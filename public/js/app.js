document.addEventListener('DOMContentLoaded', function() {
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  var menu = document.getElementById('userMenu');
  var navUser = document.querySelector('.nav-user');

  document.addEventListener('click', function(e) {
    if (!menu || !navUser) return;
    if (navUser.contains(e.target)) {
      e.stopPropagation();
      menu.classList.toggle('show');
    } else {
      menu.classList.remove('show');
    }
  });

  if (menu) {
    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  var hash = window.location.hash.replace('#', '');
  if (hash) {
    showTab(hash);
  }

  // Voice Search
  var voiceBtn = document.getElementById('voiceBtn');
  var searchInput = document.getElementById('searchInput');
  var searchForm = document.getElementById('searchForm');
  if (voiceBtn && searchInput && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    voiceBtn.addEventListener('click', function() {
      if (voiceBtn.classList.contains('listening')) {
        recognition.stop();
        return;
      }
      recognition.start();
      voiceBtn.classList.add('listening');
      voiceBtn.title = 'Listening...';
      searchInput.placeholder = 'Listening...';
    });

    recognition.onresult = function(event) {
      var transcript = event.results[0][0].transcript;
      searchInput.value = transcript;
      searchForm.submit();
    };

    recognition.onerror = function() {
      voiceBtn.classList.remove('listening');
      searchInput.placeholder = 'Search...';
    };

    recognition.onend = function() {
      voiceBtn.classList.remove('listening');
      voiceBtn.title = 'Voice Search';
      searchInput.placeholder = 'Search...';
    };
  } else if (voiceBtn) {
    voiceBtn.style.display = 'none';
  }
});

function toggleMenu() {
  var menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('show');
}

function toggleNav() {
  var nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('open');
}

function showTab(name) {
  var sections = document.querySelectorAll('.profile-section');
  for (var i = 0; i < sections.length; i++) {
    sections[i].style.display = 'none';
  }
  var tabs = document.querySelectorAll('.profile-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }
  var tab = document.getElementById('tab-' + name);
  if (tab) tab.style.display = 'block';
  for (var i = 0; i < tabs.length; i++) {
    var onclick = tabs[i].getAttribute('onclick') || '';
    var text = tabs[i].textContent.toLowerCase().trim();
    if (onclick.indexOf("'" + name + "'") !== -1 || text === name) {
      tabs[i].classList.add('active');
    }
  }
}

function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}
