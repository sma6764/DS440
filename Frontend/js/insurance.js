// Insurance page - Enhanced instant filtering with text highlighting

const API_BASE = 'http://localhost/check-me-up/backend/api';

document.addEventListener('DOMContentLoaded', () => {
  loadPricingTable();
});

function populateSpecialistFilter(items) {
  const specialistFilter = document.getElementById('specialist-filter');
  if (!specialistFilter) return;

  const uniqueSpecialists = Array.from(new Set(items.map(item => item.specialist))).filter(Boolean);
  uniqueSpecialists.sort((a, b) => a.localeCompare(b));

  specialistFilter.innerHTML = '<option value="">All Specialists</option>';
  uniqueSpecialists.forEach((specialist) => {
    const option = document.createElement('option');
    option.value = specialist;
    option.textContent = specialist;
    specialistFilter.appendChild(option);
  });
}

// Load pricing table from API
function loadPricingTable() {
  const table = document.getElementById('pricing-table');
  const tbody = table.querySelector('tbody');
  
  // Show loading spinner
  tbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="5" style="text-align: center; padding: 3rem;">
        <div class="spinner" style="margin: 0 auto 1rem;"></div>
        <div style="color: var(--color-text-muted);">Loading pricing data...</div>
      </td>
    </tr>
  `;
  
  // Fetch pricing data from API
  fetch(`${API_BASE}/insurance.php?table=true`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (!result.success) {
      showErrorMessage(tbody, result.message);
      return;
    }

    // Clear loading state
    tbody.innerHTML = '';
    
    // Render table rows from API data
    result.data.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.insurance_company}</td>
        <td>${item.specialist}</td>
        <td>Consultation, Diagnostic Tests</td>
        <td>${item.copay_percent}%</td>
        <td>Varies by plan</td>
      `;
      tbody.appendChild(row);
    });

    // Sync specialist dropdown with DB values
    populateSpecialistFilter(result.data);
    
    // Initialize filters after data is loaded
    initializeFilters();
  })
  .catch(error => {
    console.error('Error loading pricing data:', error);
    showErrorMessage(tbody, 'Could not load pricing data. Please try again.');
  });
}

// Show error message in table
function showErrorMessage(tbody, message) {
  tbody.innerHTML = `
    <tr class="error-row">
      <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-error);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
        <div style="font-weight: 600;">${message}</div>
      </td>
    </tr>
  `;
}

// Initialize filter functionality with instant updates
function initializeFilters() {
  const searchInput = document.getElementById('provider-search');
  const specialistFilter = document.getElementById('specialist-filter');
  const searchBtn = document.getElementById('search-btn');
  const table = document.getElementById('pricing-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  // Store original HTML for each row
  rows.forEach(row => {
    row.dataset.originalHtml = row.cells[0].innerHTML;
  });

  // Function to highlight matching text
  function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight-match">$1</span>');
  }

  // Function to filter and highlight table
  function filterTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedSpecialist = specialistFilter.value.toLowerCase();
    
    let visibleCount = 0;

    rows.forEach(row => {
      const provider = row.cells[0].textContent.toLowerCase();
      const specialist = row.cells[1].textContent.toLowerCase();

      // Check if row matches filters
      const matchesSearch = searchTerm === '' || provider.includes(searchTerm);
      const matchesSpecialist = selectedSpecialist === '' || specialist.includes(selectedSpecialist.toLowerCase());

      if (matchesSearch && matchesSpecialist) {
        row.style.display = '';
        visibleCount++;
        
        // Highlight matching text in provider name
        if (searchTerm) {
          const originalText = row.dataset.originalHtml;
          row.cells[0].innerHTML = highlightText(originalText, searchTerm);
        } else {
          row.cells[0].innerHTML = row.dataset.originalHtml;
        }
      } else {
        row.style.display = 'none';
      }
    });

    // Show or hide "no results" message
    showNoResultsMessage(tbody, visibleCount);
  }

  // Show "No results found" message if no rows match
  function showNoResultsMessage(tbody, visibleCount) {
    // Remove existing message if any
    const existingMessage = tbody.querySelector('.no-results-row');
    if (existingMessage) {
      existingMessage.remove();
    }

    if (visibleCount === 0) {
      const noResultsRow = document.createElement('tr');
      noResultsRow.className = 'no-results-row fade-in';
      noResultsRow.innerHTML = `
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted); font-size: 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No results found for your search.</div>
          <div style="font-size: 0.875rem;">Try adjusting your filters or search term.</div>
        </td>
      `;
      tbody.appendChild(noResultsRow);
    }
  }

  // Real-time filtering on input (instant updates)
  searchInput.addEventListener('input', filterTable);
  
  // Real-time filtering on dropdown change
  specialistFilter.addEventListener('change', filterTable);

  // Keep search button functional (but not required)
  if (searchBtn) {
    searchBtn.addEventListener('click', filterTable);
  }
  
  // Enter key support
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      filterTable();
    }
  });
}

