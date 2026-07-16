function getSourceIcon(name) {
  const icons = {
    'Netflix': '🎬', 'Amazon Prime Video': '📦', 'Prime Video': '📦',
    'Disney+': '🏰', 'Disney Plus Hotstar': '🏰', 'Hotstar': '🏰',
    'Hulu': '📺', 'HBO Max': '🎭', 'Max': '🎭',
    'Apple TV+': '🍎', 'Apple TV Plus': '🍎', 'Apple TV': '🍎',
    'YouTube': '▶️', 'Google Play Movies': '🎬', 'iTunes': '🎵',
    'Vudu': '🎥', 'Amazon Video': '📦', 'Peacock': '🦚',
    'Paramount+': '⭐', 'Paramount Plus': '⭐',
    'Crunchyroll': '🎌', 'Funimation': '🎌',
    'Sony LIV': '📺', 'ZEE5': '📺', 'JioCinema': '📱',
    'MX Player': '📱', 'VI Movies & TV': '📱',
    'Tubi': '🆓', 'Pluto TV': '🆓', 'Roku Channel': '🆓'
  };
  return icons[name] || '📺';
}

function getSourceColor(name) {
  const colors = {
    'Netflix': '#E50914', 'Amazon Prime Video': '#00A8E1', 'Prime Video': '#00A8E1',
    'Disney+': '#113CCF', 'Disney Plus Hotstar': '#113CCF', 'Hotstar': '#113CCF',
    'Hulu': '#1CE783', 'HBO Max': '#B535F6', 'Max': '#B535F6',
    'Apple TV+': '#555555', 'Apple TV Plus': '#555555',
    'YouTube': '#FF0000', 'Crunchyroll': '#F47521',
    'Sony LIV': '#000000', 'ZEE5': '#8B0000', 'JioCinema': '#0A3A7A'
  };
  return colors[name] || '#333';
}

module.exports = { getSourceIcon, getSourceColor };
