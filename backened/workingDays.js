// ========================================
// WORKING DAYS CALCULATOR
// Mon-Fri only, Indian Public Holidays skip
// ========================================

// Indian Public Holidays (add/remove as needed)
// Format: 'MM-DD' (month-day, year-independent)
const INDIAN_PUBLIC_HOLIDAYS = [
  '01-26', // Republic Day
  '03-17', // Holi (approx - changes yearly)
  '04-14', // Ambedkar Jayanti / Baisakhi
  '04-18', // Good Friday (approx)
  '05-01', // Labour Day
  '06-17', // Eid ul-Adha (approx)
  '08-15', // Independence Day
  '09-07', // Janmashtami (approx)
  '10-02', // Gandhi Jayanti
  '10-12', // Dussehra (approx)
  '10-20', // Diwali (approx)
  '11-01', // Diwali Padwa (approx)
  '11-05', // Guru Nanak Jayanti (approx)
  '12-25', // Christmas
];

// Year-specific holidays (exact dates) - update yearly
const YEAR_SPECIFIC_HOLIDAYS = {
  2025: [
    '2025-01-26', // Republic Day
    '2025-03-14', // Holi
    '2025-04-14', // Ambedkar Jayanti
    '2025-04-18', // Good Friday
    '2025-05-01', // Labour Day
    '2025-08-15', // Independence Day
    '2025-08-16', // Janmashtami
    '2025-10-02', // Gandhi Jayanti
    '2025-10-02', // Dussehra
    '2025-10-20', // Diwali
    '2025-11-05', // Guru Nanak Jayanti
    '2025-12-25', // Christmas
  ],
  2026: [
    '2026-01-26', // Republic Day
    '2026-03-03', // Holi
    '2026-04-03', // Good Friday
    '2026-04-14', // Ambedkar Jayanti
    '2026-05-01', // Labour Day
    '2026-08-15', // Independence Day
    '2026-09-04', // Janmashtami
    '2026-10-02', // Gandhi Jayanti
    '2026-10-19', // Dussehra
    '2026-11-08', // Diwali
    '2026-11-24', // Guru Nanak Jayanti
    '2026-12-25', // Christmas
  ]
};

/**
 * Check if a date is a public holiday
 */
const isPublicHoliday = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

  // Check year-specific list first
  if (YEAR_SPECIFIC_HOLIDAYS[year]) {
    return YEAR_SPECIFIC_HOLIDAYS[year].includes(dateStr);
  }

  // Fallback: check MM-DD pattern
  const mmdd = dateStr.slice(5); // MM-DD
  return INDIAN_PUBLIC_HOLIDAYS.includes(mmdd);
};

/**
 * Check if a date is a working day (Mon-Fri, not holiday)
 */
const isWorkingDay = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false; // Weekend
  if (isPublicHoliday(d)) return false;     // Holiday
  return true;
};

/**
 * Add N working days to a start date
 * Returns the deadline date
 */
const addWorkingDays = (startDate, days) => {
  let d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  let count = 0;

  while (count < days) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d)) count++;
  }

  return d;
};

/**
 * Count working days between two dates
 */
const countWorkingDays = (startDate, endDate) => {
  let d = new Date(startDate);
  const end = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d)) count++;
  }
  return count;
};

/**
 * Get remaining working days from today to deadline
 * Returns negative if overdue
 */
const getRemainingWorkingDays = (deadlineDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);

  if (today > deadline) {
    // Overdue: count working days past deadline (negative)
    return -countWorkingDays(deadline, today);
  }

  return countWorkingDays(today, deadline);
};

module.exports = {
  addWorkingDays,
  countWorkingDays,
  getRemainingWorkingDays,
  isWorkingDay,
  isPublicHoliday
};