// BACKEND DONE: Insurance matching now uses real API data from /api/insurance.php
// BACKEND DONE: Patient insurance comes from session via API
// BACKEND DONE: Coverage and co-pay calculated from database insurance_coverage table

const API_BASE = 'http://localhost/check-me-up/backend/api';

// Booking data object to store all selections
// BACKEND TODO: Replace bookingData.doctor with real doctor ID from API response in Step 2
// BACKEND TODO: Replace bookingData.branch with real branch ID from API response in Step 2
const bookingData = {
  specialist: null,
  specialistName: null,
  doctor: null,
  doctorName: null,
  branch: null,
  branchName: null,
  date: null,
  time: null
};

// Current step tracker
let currentStep = 1;
const totalSteps = 4;

// Get DOM elements
const nextBtn = document.getElementById('next-btn');
const backBtn = document.getElementById('back-btn');
const progressSteps = document.querySelectorAll('.progress-step');
const formSteps = document.querySelectorAll('.form-step');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSpecialists();
  initializeEventListeners();
  updateStepDisplay();
  addCardAnimationClasses();
});

// Add animation classes to cards
function addCardAnimationClasses() {
  document.querySelectorAll('.specialist-card, .doctor-card, .time-slot').forEach(card => {
    card.classList.add('card-animate');
  });
}

// Initialize all event listeners
function initializeEventListeners() {
  // Load branches on page load
  loadBranches();
  
  // Initialize date picker (set minimum date to today)
  initializeDatePicker();
  
  // Navigation buttons
  nextBtn.addEventListener('click', handleNext);
  backBtn.addEventListener('click', handleBack);

  // Step 1: Specialist selection with auto-advance (event delegation for dynamic cards)
  const specialistGrid = document.getElementById('specialist-grid');
  if (specialistGrid) {
    specialistGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.specialist-card');
      if (card) {
        selectSpecialist(card);
      }
    });
  }

  // Step 2: Branch dropdown
  const branchSelect = document.getElementById('branch-select');
  branchSelect.addEventListener('change', (e) => {
    bookingData.branch = e.target.value;
    bookingData.branchName = e.target.options[e.target.selectedIndex].text;
    
    // Re-fetch doctors when branch changes
    if (bookingData.specialistName) {
      loadDoctors(bookingData.specialistName, e.target.value);
    }
  });

  // Step 3: Date selection
  const dateInput = document.getElementById('appointment-date');
  dateInput.addEventListener('change', (e) => {
    bookingData.date = e.target.value;
    
    // Fetch available slots when date changes
    if (bookingData.doctor && bookingData.date) {
      loadTimeSlots(bookingData.doctor, bookingData.date);
    }
  });

  // Step 4: Confirm booking button
  const confirmBtn = document.querySelector('.confirm-button');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirmBooking);
  }
}

function loadSpecialists() {
  const specialistGrid = document.getElementById('specialist-grid');
  if (!specialistGrid) {
    return;
  }

  fetch(`${API_BASE}/specialists.php`)
    .then(response => response.json())
    .then(result => {
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
        specialistGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #EF4444; padding: 1.5rem;">Could not load specialists.</div>';
        return;
      }

      const iconMap = {
        'General Practitioner': '👨‍⚕️',
        'Cardiologist': '❤️',
        'Dermatologist': '🔬',
        'Pediatrician': '👶',
        'Neurologist': '🧠',
        'Orthopedic': '🦴'
      };

      specialistGrid.innerHTML = result.data.map((specialist) => {
        const icon = iconMap[specialist.name] || '🩺';
        return `
          <div class="specialist-card" data-specialist="${specialist.id}">
            <div class="specialist-icon">${icon}</div>
            <div class="specialist-label">${specialist.name}</div>
          </div>
        `;
      }).join('');

      addCardAnimationClasses();
      checkURLParameters();
    })
    .catch(error => {
      console.error('Error loading specialists:', error);
      specialistGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #EF4444; padding: 1.5rem;">Could not load specialists.</div>';
    });
}

// Handle specialist selection with animation and auto-advance
function selectSpecialist(selectedCard) {
  // Remove selection from all cards
  document.querySelectorAll('.specialist-card').forEach(card => {
    card.classList.remove('selected', 'card-selected');
  });

  // Add selection with animation to clicked card
  selectedCard.classList.add('selected', 'card-selected');

  // Store selection
  bookingData.specialist = selectedCard.dataset.specialist;
  bookingData.specialistName = selectedCard.querySelector('.specialist-label').textContent;

  // Clear any error message
  clearErrorMessage();

  // Load doctors for this specialist
  loadDoctors(bookingData.specialistName, null);

  // Auto-advance after 400ms
  setTimeout(() => {
    if (currentStep === 1 && bookingData.specialist) {
      handleNext();
    }
  }, 400);
}

// Handle doctor selection with animation and auto-advance
function selectDoctor(selectedCard) {
  // Remove selection from all cards
  document.querySelectorAll('.doctor-card').forEach(card => {
    card.classList.remove('selected', 'card-selected');
  });

  // Add selection with animation to clicked card
  selectedCard.classList.add('selected', 'card-selected');

  // Store selection
  bookingData.doctor = selectedCard.dataset.doctor;
  bookingData.doctorName = selectedCard.querySelector('.doctor-name').textContent;
  
  // Store branch_id from doctor data
  if (selectedCard.dataset.branchId) {
    bookingData.branch = selectedCard.dataset.branchId;
  }
  
  // Store branch name from the selected doctor card
  const doctorBranch = selectedCard.querySelector('.doctor-branch');
  if (doctorBranch) {
    bookingData.branchName = doctorBranch.textContent;
  }

  // Clear any error message
  clearErrorMessage();

  // Auto-advance after 400ms (only need doctor to be selected)
  setTimeout(() => {
    if (currentStep === 2 && bookingData.doctor) {
      handleNext();
    }
  }, 400);
}

// Handle time slot selection with animation and auto-advance
function selectTimeSlot(selectedSlot) {
  // Remove selection from all slots
  document.querySelectorAll('.time-slot').forEach(slot => {
    slot.classList.remove('selected', 'card-selected');
  });

  // Add selection with animation to clicked slot
  selectedSlot.classList.add('selected', 'card-selected');

  // Store selection
  bookingData.time = selectedSlot.dataset.time;

  // Clear any error message
  clearErrorMessage();

  // Auto-advance after 400ms
  setTimeout(() => {
    if (currentStep === 3 && bookingData.date && bookingData.time) {
      handleNext();
    }
  }, 400);
}

// Initialize date picker with minimum date
function initializeDatePicker() {
  const dateInput = document.getElementById('appointment-date');
  if (dateInput) {
    // Set minimum date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    dateInput.setAttribute('min', minDate);
  }
}

// Load available time slots from API
function loadTimeSlots(doctorId, date) {
  const timeSlotsContainer = document.querySelector('.time-slots');
  
  if (!timeSlotsContainer) {
    return;
  }
  
  // Clear any previous error messages in Step 3
  clearErrorMessage();
  
  // Show loading spinner
  timeSlotsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6B7280; grid-column: 1 / -1;">Loading available time slots...</div>';
  
  // Fetch slots from API
  fetch(`${API_BASE}/slots.php?doctor_id=${doctorId}&date=${date}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const slots = data.data.available_slots;
        
        // Clear container
        timeSlotsContainer.innerHTML = '';
        
        // Render time slot buttons
        slots.forEach(slot => {
          const slotButton = document.createElement('button');
          slotButton.className = 'time-slot card-animate';
          slotButton.dataset.time = slot;
          slotButton.textContent = slot;
          
          // Add click event
          slotButton.addEventListener('click', () => selectTimeSlot(slotButton));
          
          timeSlotsContainer.appendChild(slotButton);
        });
      } else {
        // Show error message
        timeSlotsContainer.innerHTML = '';
        showErrorMessage(3, data.message || 'No available slots for this date. Please pick another day.');
      }
    })
    .catch(error => {
      console.error('Error loading time slots:', error);
      timeSlotsContainer.innerHTML = '';
      showErrorMessage(3, 'Could not load time slots. Please try again.');
    });
}

// Load branches from API
function loadBranches() {
  const branchSelect = document.getElementById('branch-select');
  
  fetch(`${API_BASE}/branches.php`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.data.length > 0) {
        // Clear existing options except the first one
        branchSelect.innerHTML = '<option value="">Choose a branch...</option>';
        
        // Add branches from API
        data.data.forEach(branch => {
          const option = document.createElement('option');
          option.value = branch.id;
          option.textContent = `${branch.name} - ${branch.city}`;
          branchSelect.appendChild(option);
        });
      }
    })
    .catch(error => {
      console.error('Error loading branches:', error);
    });
}

// Load doctors from API
function loadDoctors(specialist, branchId) {
  const doctorCardsContainer = document.querySelector('.doctor-cards');
  
  // Show loading spinner
  doctorCardsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6B7280;">Loading doctors...</div>';
  
  // Build API URL with filters
  let url = `${API_BASE}/doctors.php?specialist=${encodeURIComponent(specialist)}`;
  if (branchId) {
    url += `&branch_id=${branchId}`;
  }
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const doctors = data.data;
        
        if (doctors.length === 0) {
          // No doctors found
          doctorCardsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6B7280;">No doctors available for this selection.</div>';
          return;
        }
        
        // Clear container
        doctorCardsContainer.innerHTML = '';
        
        // Render doctor cards
        doctors.forEach(doctor => {
          const doctorCard = document.createElement('div');
          doctorCard.className = 'doctor-card card-animate';
          doctorCard.dataset.doctor = doctor.id;
          doctorCard.dataset.branchId = doctor.branch_id; // Store branch_id for booking
          
          doctorCard.innerHTML = `
            <div class="doctor-photo">👨‍⚕️</div>
            <div class="doctor-info">
              <h4 class="doctor-name">${doctor.full_name}</h4>
              <p class="doctor-specialty">${doctor.specialty}</p>
              <p class="doctor-branch" style="font-size: 0.875rem; color: #6B7280;">${doctor.branch}</p>
              <div class="doctor-rating">⭐ ${doctor.rating} rating</div>
            </div>
          `;
          
          // Add click event
          doctorCard.addEventListener('click', () => selectDoctor(doctorCard));
          
          doctorCardsContainer.appendChild(doctorCard);
        });
      } else {
        doctorCardsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #EF4444;">Could not load data. Please try again.</div>';
      }
    })
    .catch(error => {
      console.error('Error loading doctors:', error);
      doctorCardsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #EF4444;">Could not load data. Please try again.</div>';
    });
}

// Validate current step
function validateStep(step) {
  clearErrorMessage();

  switch(step) {
    case 1:
      if (!bookingData.specialist) {
        showErrorMessage(step, 'Please select a specialist before continuing.');
        return false;
      }
      break;
    case 2:
      if (!bookingData.doctor) {
        showErrorMessage(step, 'Please select a doctor before continuing.');
        return false;
      }
      break;
    case 3:
      if (!bookingData.date) {
        showErrorMessage(step, 'Please select a date before continuing.');
        return false;
      }
      if (!bookingData.time) {
        showErrorMessage(step, 'Please select a time slot before continuing.');
        return false;
      }
      break;
  }
  return true;
}

// Show error message
function showErrorMessage(step, message) {
  const stepElement = document.getElementById(`step-${step}`);
  
  // Check if error message already exists
  let errorDiv = stepElement.querySelector('.error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message fade-in';
    errorDiv.style.color = '#EF4444';
    errorDiv.style.backgroundColor = '#FEE2E2';
    errorDiv.style.padding = '0.75rem 1rem';
    errorDiv.style.borderRadius = '0.5rem';
    errorDiv.style.marginTop = '1rem';
    errorDiv.style.fontWeight = '500';
    errorDiv.style.textAlign = 'center';
    stepElement.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
}

// Clear error message
function clearErrorMessage() {
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.remove());
}

// Handle next button click
function handleNext() {
  // Validate current step before proceeding
  if (!validateStep(currentStep)) {
    return;
  }

  if (currentStep < totalSteps) {
    currentStep++;
    updateStepDisplay();

    // If we're on step 3, load time slots if doctor and date are selected
    if (currentStep === 3) {
      if (bookingData.doctor && bookingData.date) {
        loadTimeSlots(bookingData.doctor, bookingData.date);
      }
    }

    // If we're on step 4, populate the confirmation summary with animations
    if (currentStep === 4) {
      populateConfirmation();
    }
  }
}

// Handle back button click
function handleBack() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

// Update step display with smooth transitions
function updateStepDisplay() {
  // Update form steps visibility
  formSteps.forEach((step, index) => {
    if (index + 1 === currentStep) {
      step.classList.add('active');
      step.classList.remove('section-hidden');
      step.classList.add('section-visible');
    } else {
      step.classList.remove('active');
      step.classList.add('section-hidden');
      step.classList.remove('section-visible');
    }
  });

  // Update progress bar with smooth animation
  progressSteps.forEach((step, index) => {
    if (index + 1 === currentStep) {
      step.classList.add('active');
    } else if (index + 1 < currentStep) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else {
      step.classList.remove('active', 'completed');
    }
  });

  // Update navigation buttons
  if (currentStep === 1) {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'inline-block';
  }

  if (currentStep === totalSteps) {
    nextBtn.style.display = 'none';
  } else {
    nextBtn.style.display = 'inline-block';
  }

  // Clear any error messages when changing steps
  clearErrorMessage();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Populate confirmation summary with fade-in animations
function populateConfirmation() {
  const fields = [
    { id: 'confirm-specialist', value: bookingData.specialistName || '--' },
    { id: 'confirm-doctor', value: bookingData.doctorName || '--' },
    { id: 'confirm-branch', value: bookingData.branchName || '--' }
  ];

  // Animate each field with staggered delays
  fields.forEach((field, index) => {
    const element = document.getElementById(field.id);
    if (element) {
      element.textContent = field.value;
      element.classList.add(`fade-in-delay-${index + 1}`);
    }
  });

  // Format and animate date
  const dateElement = document.getElementById('confirm-date');
  if (dateElement) {
    if (bookingData.date) {
      const dateObj = new Date(bookingData.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      dateElement.textContent = formattedDate;
    } else {
      dateElement.textContent = '--';
    }
    dateElement.classList.add('fade-in-delay-4');
  }
  
  // Format and animate time
  const timeElement = document.getElementById('confirm-time');
  if (timeElement) {
    if (bookingData.time) {
      const selectedSlot = document.querySelector(`.time-slot[data-time="${bookingData.time}"]`);
      timeElement.textContent = selectedSlot ? selectedSlot.textContent : '--';
    } else {
      timeElement.textContent = '--';
    }
    timeElement.classList.add('fade-in-delay-5');
  }
  
  // Check insurance coverage and display badge
  displayInsuranceCoverage();
}

// Display insurance coverage badge based on real API data
function displayInsuranceCoverage() {
  const insuranceBadge = document.getElementById('insurance-badge');
  if (!insuranceBadge) return;
  
  const selectedSpecialist = bookingData.specialistName;
  
  // Clear previous content and show loading state
  insuranceBadge.innerHTML = '';
  insuranceBadge.className = 'insurance-badge';
  insuranceBadge.innerHTML = '<span class="badge-text">Checking insurance coverage...</span>';
  
  // Fetch insurance coverage from API
  fetch(`${API_BASE}/insurance.php?specialist=${encodeURIComponent(selectedSpecialist)}`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (!result.success) {
      insuranceBadge.style.display = 'none';
      return;
    }

    const data = result.data;
    insuranceBadge.innerHTML = '';
    insuranceBadge.className = 'insurance-badge';
    
    // Case 1: No insurance on file (guest or no insurance)
    if (!data.patient_insurance) {
      insuranceBadge.classList.add('insurance-no-coverage');
      insuranceBadge.innerHTML = `
        <span class="badge-icon">ℹ️</span>
        <span class="badge-text">No insurance on file. Full self-pay applies. Check our pricing on the <a href="insurance.html" style="color: inherit; text-decoration: underline;">Insurance page</a>.</span>
      `;
    }
    // Case 2: Insurance is covered
    else if (data.is_covered) {
      insuranceBadge.classList.add('insurance-covered');
      insuranceBadge.innerHTML = `
        <span class="badge-icon">✅</span>
        <span class="badge-text">Covered by your insurance (${data.patient_insurance}) — ${data.coverage_percent}% covered. Your estimated co-pay is ${data.copay_percent}%.</span>
      `;
    }
    // Case 3: Insurance is not accepted for this specialist
    else {
      insuranceBadge.classList.add('insurance-not-covered');
      insuranceBadge.innerHTML = `
        <span class="badge-icon">⚠️</span>
        <span class="badge-text">Your insurance (${data.patient_insurance}) is not accepted for this specialist. Full out-of-pocket payment applies.</span>
      `;
    }
    
    insuranceBadge.classList.add('fade-in-delay-6');
  })
  .catch(error => {
    console.error('Error fetching insurance coverage:', error);
    insuranceBadge.innerHTML = '';
    insuranceBadge.className = 'insurance-badge insurance-no-coverage';
    insuranceBadge.innerHTML = `
      <span class="badge-icon">ℹ️</span>
      <span class="badge-text">Unable to verify insurance coverage. Please contact us for details.</span>
    `;
    insuranceBadge.classList.add('fade-in-delay-6');
  });
}

// Handle confirm booking with API call
function handleConfirmBooking() {
  const confirmBtn = document.querySelector('.confirm-button');
  const confirmationCard = document.querySelector('.confirmation-card');

  // Add loading state
  confirmBtn.classList.add('btn-loading');
  confirmBtn.disabled = true;

  // Prepare booking data for API
  const bookingPayload = {
    doctor_id: parseInt(bookingData.doctor),
    branch_id: parseInt(bookingData.branch),
    appointment_date: bookingData.date,
    appointment_time: bookingData.time
  };

  // Send booking request to API
  fetch(`${API_BASE}/bookings.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify(bookingPayload)
  })
  .then(response => response.json())
  .then(data => {
    // Remove loading state
    confirmBtn.classList.remove('btn-loading');

    if (data.success) {
      // Booking successful
      confirmBtn.style.opacity = '0.6';
      confirmBtn.style.cursor = 'not-allowed';
      confirmBtn.textContent = 'Booking Confirmed';

      // Create success message with animation
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message fade-in';
      successMessage.style.backgroundColor = '#D1FAE5';
      successMessage.style.color = '#065F46';
      successMessage.style.padding = '1rem';
      successMessage.style.borderRadius = '0.5rem';
      successMessage.style.marginTop = '1.5rem';
      successMessage.style.fontWeight = '500';
      successMessage.style.textAlign = 'center';
      successMessage.style.border = '2px solid var(--color-success)';
      successMessage.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">✓</div>
        <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Your appointment has been booked!</div>
        <div>We'll send you a confirmation shortly.</div>
      `;

      confirmationCard.appendChild(successMessage);

      // Hide the navigation buttons after successful booking
      const formNavigation = document.querySelector('.form-navigation');
      if (formNavigation) {
        formNavigation.style.display = 'none';
      }

      // Create action buttons container
      const actionButtons = document.createElement('div');
      actionButtons.className = 'booking-actions fade-in';
      actionButtons.style.display = 'flex';
      actionButtons.style.gap = '1rem';
      actionButtons.style.marginTop = '1.5rem';
      actionButtons.style.justifyContent = 'center';
      actionButtons.style.flexWrap = 'wrap';
      actionButtons.innerHTML = `
        <a href="index.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Return to Home</a>
        <a href="profile.html" class="btn-secondary" style="text-decoration: none; display: inline-block;">View My Appointments</a>
      `;
      
      confirmationCard.appendChild(actionButtons);

      // Scroll to success message
      setTimeout(() => {
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      // Booking failed
      confirmBtn.disabled = false;

      // Check if user needs to log in
      if (data.message.includes('log in')) {
        // Create error message for not logged in
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message fade-in';
        errorMessage.style.backgroundColor = '#FEE2E2';
        errorMessage.style.color = '#991B1B';
        errorMessage.style.padding = '1rem';
        errorMessage.style.borderRadius = '0.5rem';
        errorMessage.style.marginTop = '1.5rem';
        errorMessage.style.fontWeight = '500';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.border = '2px solid #EF4444';
        errorMessage.textContent = 'You need to be logged in to book. Redirecting to login...';
        
        // Remove any existing error messages
        const existingError = confirmationCard.querySelector('.error-message');
        if (existingError) {
          existingError.remove();
        }
        
        confirmationCard.appendChild(errorMessage);

        // Redirect to login after 2 seconds
        // COMMENTED OUT FOR FRONTEND DEMO
        // setTimeout(() => {
        //   window.location.href = 'login.html';
        // }, 2000);
      } else {
        // Show specific error message from API
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message fade-in';
        errorMessage.style.backgroundColor = '#FEE2E2';
        errorMessage.style.color = '#991B1B';
        errorMessage.style.padding = '1rem';
        errorMessage.style.borderRadius = '0.5rem';
        errorMessage.style.marginTop = '1.5rem';
        errorMessage.style.fontWeight = '500';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.border = '2px solid #EF4444';
        errorMessage.textContent = data.message || 'Booking failed. Please try again.';
        
        // Remove any existing error messages
        const existingError = confirmationCard.querySelector('.error-message');
        if (existingError) {
          existingError.remove();
        }
        
        confirmationCard.appendChild(errorMessage);

        // Scroll to error message
        setTimeout(() => {
          errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  })
  .catch(error => {
    console.error('Booking error:', error);
    
    // Remove loading state
    confirmBtn.classList.remove('btn-loading');
    confirmBtn.disabled = false;

    // Show generic error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message fade-in';
    errorMessage.style.backgroundColor = '#FEE2E2';
    errorMessage.style.color = '#991B1B';
    errorMessage.style.padding = '1rem';
    errorMessage.style.borderRadius = '0.5rem';
    errorMessage.style.marginTop = '1.5rem';
    errorMessage.style.fontWeight = '500';
    errorMessage.style.textAlign = 'center';
    errorMessage.style.border = '2px solid #EF4444';
    errorMessage.textContent = 'Booking failed. Please try again.';
    
    // Remove any existing error messages
    const existingError = confirmationCard.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    confirmationCard.appendChild(errorMessage);
  });
}

// Check for URL parameters (e.g., from symptom checker)
function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const specialistParam = urlParams.get('specialist');

  if (specialistParam) {
    // Find and select the matching specialist card
    const specialistCards = document.querySelectorAll('.specialist-card');
    
    specialistCards.forEach(card => {
      const specialistLabel = card.querySelector('.specialist-label').textContent;
      
      // Match the specialist name (case-insensitive)
      if (specialistLabel.toLowerCase().includes(specialistParam.toLowerCase())) {
        // Auto-select this card
        selectSpecialist(card);
      }
    });
  }
}

