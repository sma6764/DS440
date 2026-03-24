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

const specialistIcons = {
  'General Practitioner': '🩺',
  'Cardiologist': '❤️',
  'Dermatologist': '🔬',
  'Pediatrician': '👶',
  'Neurologist': '🧠',
  'Orthopedic': '🦴'
};

const mockDoctors = [
  { name: 'Dr. James Mitchell', specialty: 'General Practitioner', branch: 'Philadelphia Main', rating: 4.8 },
  { name: 'Dr. Sarah Chen', specialty: 'Cardiologist', branch: 'Philadelphia Main', rating: 4.9 },
  { name: 'Dr. Robert Williams', specialty: 'Dermatologist', branch: 'Pittsburgh Branch', rating: 4.7 },
  { name: 'Dr. Emily Davis', specialty: 'Pediatrician', branch: 'Philadelphia Main', rating: 4.9 },
  { name: 'Dr. Michael Brown', specialty: 'Neurologist', branch: 'Allentown Branch', rating: 4.6 },
  { name: 'Dr. Jessica Taylor', specialty: 'Orthopedic', branch: 'Pittsburgh Branch', rating: 4.8 },
  { name: 'Dr. David Anderson', specialty: 'General Practitioner', branch: 'Allentown Branch', rating: 4.7 },
  { name: 'Dr. Ashley Johnson', specialty: 'Cardiologist', branch: 'Pittsburgh Branch', rating: 4.8 },
  { name: 'Dr. Christopher Lee', specialty: 'Dermatologist', branch: 'Philadelphia Main', rating: 4.9 },
  { name: 'Dr. Amanda Wilson', specialty: 'Pediatrician', branch: 'Allentown Branch', rating: 4.7 },
  { name: 'Dr. Daniel Martinez', specialty: 'Neurologist', branch: 'Philadelphia Main', rating: 4.8 },
  { name: 'Dr. Stephanie Thomas', specialty: 'Orthopedic', branch: 'Philadelphia Main', rating: 4.9 }
];

let currentStep = 1;
const totalSteps = 4;

const nextBtn = document.getElementById('next-btn');
const backBtn = document.getElementById('back-btn');
const progressSteps = document.querySelectorAll('.progress-step');
const formSteps = document.querySelectorAll('.form-step');

document.addEventListener('DOMContentLoaded', () => {
  loadSpecialists();
  loadBranches();
  initializeEventListeners();
  initializeDatePicker();
  updateStepDisplay();
  addCardAnimationClasses();
});

function addCardAnimationClasses() {
  document.querySelectorAll('.specialist-card, .doctor-card, .time-slot').forEach((card) => {
    card.classList.add('card-animate');
  });
}

function initializeEventListeners() {
  nextBtn.addEventListener('click', handleNext);
  backBtn.addEventListener('click', handleBack);

  const specialistGrid = document.getElementById('specialist-grid');
  if (specialistGrid) {
    specialistGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.specialist-card');
      if (card) {
        selectSpecialist(card);
      }
    });
  }

  const branchSelect = document.getElementById('branch-select');
  branchSelect.addEventListener('change', (e) => {
    bookingData.branch = e.target.value;
    bookingData.branchName = e.target.options[e.target.selectedIndex]?.text || '--';
    renderFilteredDoctors();
  });

  const dateInput = document.getElementById('appointment-date');
  dateInput.addEventListener('change', (e) => {
    bookingData.date = e.target.value;
    bookingData.time = null;
    renderStaticTimeSlots();
  });

  const confirmBtn = document.querySelector('.confirm-button');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirmBooking);
  }
}

function loadSpecialists() {
  const specialistGrid = document.getElementById('specialist-grid');
  if (!specialistGrid) return;

  const specialists = [
    { id: 'general', name: 'General Practitioner', icon: specialistIcons['General Practitioner'] },
    { id: 'cardiology', name: 'Cardiologist', icon: specialistIcons['Cardiologist'] },
    { id: 'dermatology', name: 'Dermatologist', icon: specialistIcons['Dermatologist'] },
    { id: 'pediatrics', name: 'Pediatrician', icon: specialistIcons['Pediatrician'] },
    { id: 'neurology', name: 'Neurologist', icon: specialistIcons['Neurologist'] },
    { id: 'orthopedic', name: 'Orthopedic', icon: specialistIcons['Orthopedic'] }
  ];

  specialistGrid.innerHTML = specialists.map((specialist) => `
    <div class="specialist-card" data-specialist="${specialist.id}">
      <div class="specialist-icon">${specialist.icon}</div>
      <div class="specialist-label">${specialist.name}</div>
    </div>
  `).join('');

  addCardAnimationClasses();
  checkURLParameters();
}

function loadBranches() {
  const branchSelect = document.getElementById('branch-select');
  if (!branchSelect) return;

  const branches = ['Philadelphia Main', 'Pittsburgh Branch', 'Allentown Branch'];
  branchSelect.innerHTML = '<option value="">Choose a branch...</option>';

  branches.forEach((branch) => {
    const option = document.createElement('option');
    option.value = branch;
    option.textContent = branch;
    branchSelect.appendChild(option);
  });
}

function selectSpecialist(selectedCard) {
  document.querySelectorAll('.specialist-card').forEach((card) => {
    card.classList.remove('selected', 'card-selected');
  });

  selectedCard.classList.add('selected', 'card-selected');
  bookingData.specialist = selectedCard.dataset.specialist;
  bookingData.specialistName = selectedCard.querySelector('.specialist-label')?.textContent || '--';
  bookingData.doctor = null;
  bookingData.doctorName = null;
  clearErrorMessage();

  renderFilteredDoctors();

  setTimeout(() => {
    if (currentStep === 1 && bookingData.specialist) {
      handleNext();
    }
  }, 400);
}

function renderFilteredDoctors() {
  const container = document.querySelector('.doctor-cards');
  if (!container) return;

  if (!bookingData.specialistName) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6B7280;">Choose a specialist to load doctors.</div>';
    return;
  }

  const doctors = mockDoctors.filter((doctor) => {
    const specialtyMatches = doctor.specialty === bookingData.specialistName;
    const branchMatches = !bookingData.branch || doctor.branch === bookingData.branch;
    return specialtyMatches && branchMatches;
  });

  if (!doctors.length) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6B7280;">No doctors available for this selection.</div>';
    return;
  }

  container.innerHTML = '';
  doctors.forEach((doctor) => {
    const doctorCard = document.createElement('div');
    doctorCard.className = 'doctor-card card-animate';
    doctorCard.dataset.doctor = doctor.name;
    doctorCard.dataset.branchId = doctor.branch;

    doctorCard.innerHTML = `
      <div class="doctor-photo">👨‍⚕️</div>
      <div class="doctor-info">
        <h4 class="doctor-name">${doctor.name}</h4>
        <p class="doctor-specialty">${doctor.specialty}</p>
        <p class="doctor-branch" style="font-size: 0.875rem; color: #6B7280;">📍 ${doctor.branch}</p>
        <div class="doctor-rating">⭐ ${doctor.rating}</div>
      </div>
    `;

    doctorCard.addEventListener('click', () => selectDoctor(doctorCard));
    container.appendChild(doctorCard);
  });
}

function selectDoctor(selectedCard) {
  document.querySelectorAll('.doctor-card').forEach((card) => {
    card.classList.remove('selected', 'card-selected');
  });

  selectedCard.classList.add('selected', 'card-selected');
  bookingData.doctor = selectedCard.dataset.doctor;
  bookingData.doctorName = selectedCard.querySelector('.doctor-name')?.textContent || '--';
  bookingData.branch = selectedCard.dataset.branchId || bookingData.branch;

  const doctorBranch = selectedCard.querySelector('.doctor-branch');
  if (doctorBranch) {
    bookingData.branchName = doctorBranch.textContent.replace('📍 ', '');
  }

  const branchSelect = document.getElementById('branch-select');
  if (branchSelect && bookingData.branchName) {
    branchSelect.value = bookingData.branchName;
    bookingData.branch = bookingData.branchName;
  }

  clearErrorMessage();

  setTimeout(() => {
    if (currentStep === 2 && bookingData.doctor) {
      handleNext();
    }
  }, 400);
}

function renderStaticTimeSlots() {
  const timeSlotsContainer = document.querySelector('.time-slots');
  if (!timeSlotsContainer) return;

  timeSlotsContainer.innerHTML = '';

  const slots = ['9:00 AM', '10:30 AM', '1:00 PM', '3:30 PM'];
  slots.forEach((slot) => {
    const slotButton = document.createElement('button');
    slotButton.className = 'time-slot card-animate';
    slotButton.dataset.time = slot;
    slotButton.textContent = slot;
    slotButton.addEventListener('click', () => selectTimeSlot(slotButton));
    timeSlotsContainer.appendChild(slotButton);
  });
}

function selectTimeSlot(selectedSlot) {
  document.querySelectorAll('.time-slot').forEach((slot) => {
    slot.classList.remove('selected', 'card-selected');
  });

  selectedSlot.classList.add('selected', 'card-selected');
  bookingData.time = selectedSlot.dataset.time;
  clearErrorMessage();

  setTimeout(() => {
    if (currentStep === 3 && bookingData.date && bookingData.time) {
      handleNext();
    }
  }, 400);
}

function initializeDatePicker() {
  const dateInput = document.getElementById('appointment-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.setAttribute('min', `${yyyy}-${mm}-${dd}`);
  }
}

function validateStep(step) {
  clearErrorMessage();

  if (step === 1 && !bookingData.specialist) {
    showErrorMessage(step, 'Please select a specialist before continuing.');
    return false;
  }

  if (step === 2 && !bookingData.doctor) {
    showErrorMessage(step, 'Please select a doctor before continuing.');
    return false;
  }

  if (step === 3) {
    if (!bookingData.date) {
      showErrorMessage(step, 'Please select a date before continuing.');
      return false;
    }
    if (!bookingData.time) {
      showErrorMessage(step, 'Please select a time slot before continuing.');
      return false;
    }
  }

  return true;
}

function showErrorMessage(step, message) {
  const stepElement = document.getElementById(`step-${step}`);
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

function clearErrorMessage() {
  document.querySelectorAll('.error-message').forEach((msg) => msg.remove());
}

function handleNext() {
  if (!validateStep(currentStep)) return;

  if (currentStep < totalSteps) {
    currentStep++;
    updateStepDisplay();

    if (currentStep === 4) {
      populateConfirmation();
    }
  }
}

function handleBack() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

function updateStepDisplay() {
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

  backBtn.style.display = currentStep === 1 ? 'none' : 'inline-block';
  nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-block';

  clearErrorMessage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populateConfirmation() {
  const fields = [
    { id: 'confirm-specialist', value: bookingData.specialistName || '--' },
    { id: 'confirm-doctor', value: bookingData.doctorName || '--' },
    { id: 'confirm-branch', value: bookingData.branchName || '--' }
  ];

  fields.forEach((field, index) => {
    const element = document.getElementById(field.id);
    if (element) {
      element.textContent = field.value;
      element.classList.add(`fade-in-delay-${index + 1}`);
    }
  });

  const dateElement = document.getElementById('confirm-date');
  if (dateElement) {
    if (bookingData.date) {
      const dateObj = new Date(bookingData.date);
      dateElement.textContent = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      dateElement.textContent = '--';
    }
    dateElement.classList.add('fade-in-delay-4');
  }

  const timeElement = document.getElementById('confirm-time');
  if (timeElement) {
    timeElement.textContent = bookingData.time || '--';
    timeElement.classList.add('fade-in-delay-5');
  }

  displayInsuranceCoverage();
}

function displayInsuranceCoverage() {
  const insuranceBadge = document.getElementById('insurance-badge');
  if (!insuranceBadge) return;

  insuranceBadge.className = 'insurance-badge insurance-no-coverage';
  insuranceBadge.innerHTML = `
    <span class="badge-icon">INFO</span>
    <span class="badge-text">Insurance verification is currently unavailable.</span>
  `;
  insuranceBadge.classList.add('fade-in-delay-6');
}

function handleConfirmBooking() {
  // Intentionally left empty.
}

function checkURLParameters() {
  const specialistParam = new URLSearchParams(window.location.search).get('specialist');
  if (!specialistParam) return;

  document.querySelectorAll('.specialist-card').forEach((card) => {
    const label = card.querySelector('.specialist-label')?.textContent || '';
    if (label.toLowerCase().includes(specialistParam.toLowerCase())) {
      selectSpecialist(card);
    }
  });
}
