// ✅ CHECKPOINT CONFIGURATION
// getCheckpointsByArea(centerType, placementApplicable)
//
// Values that change when placement is not applicable are written as
// [normalValue, naValue]. Plain numbers are the same in both cases.
// Each checkpoint row is: [id, name, weightage, maxScore]

const NORMAL = 0;
const NA = 1;

const resolve = (value, idx) => (Array.isArray(value) ? value[idx] : value);

const buildArea = (idx, areaName, totalScore, rows, extra = {}) => ({
  areaName,
  totalScore: resolve(totalScore, idx),
  ...extra,
  checkpoints: rows.map(([id, name, weightage, maxScore]) => ({
    id,
    name,
    weightage: resolve(weightage, idx),
    maxScore: resolve(maxScore, idx),
  })),
});

// Placement is empty (and scores 0) when placement is not applicable
const buildPlacementArea = (isNA, idx, normalTotal, rows) =>
  buildArea(idx, 'Placement Process', [normalTotal, 0], isNA ? [] : rows, { isNA });

// ========================================
// DTV
// ========================================
const DTV_CONFIG = {
  frontOffice: {
    total: 30,
    rows: [
      ['FO1', 'Enquires Entered in Pulse(Y/N)', 30, 9],
      ['FO2', 'Enrolment form available in Pulse(Y/N)', 20, 6],
      ['FO3', 'Pre assessment Available(Y/N)', 0, 0],
      ['FO4', 'Documents uploaded in Pulse(Y/N)', 40, 12],
      ['FO5', 'Availability of Marketing Material(Y/N)', 10, 3],
    ],
  },
  deliveryProcess: {
    total: [40, 45],
    rows: [
      ['DP1', 'Batch file maintained for all running batches', [15, 20], [6, 9]],
      ['DP2', 'Batch Heath Card available for all batches where batch duration is >= 30 days', [10, 0], [4, 0]],
      ['DP3', 'Attendance marked in EDL sheets correctly', [15, 20], [6, 9]],
      ['DP4', 'BMS maintained with observations >= 30 days', 5, [2, 2.25]],
      ['DP5', 'FACT Certificate available at Center (Y/N)', 10, [4, 4.5]],
      ['DP6', 'Post Assessment if applicable', 0, 0],
      ['DP7', 'Appraisal sheet is maintained (Y/N)', 10, [4, 4.5]],
      ['DP8', 'Appraisal status updated in Pulse(Y/N)', 5, [2, 2.25]],
      ['DP9', 'Certification Status of eligible students', 10, [4, 4.5]],
      ['DP10', 'Student signature obtained while issuing certificates', 10, [4, 4.5]],
      ['DP11', 'Verification between System issue date Vs actual certificate issue date', 10, [4, 4.5]],
    ],
  },
  placementProcess: {
    total: 10,
    rows: [
      ['PP1', 'Student Placement Response', 15, 1.5],
      ['PP2', 'CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation', 10, 1.0],
      ['PP3', 'Placement Bank & Aging', 15, 1.5],
      ['PP4', 'Placement Proof Upload', 60, 6.0],
    ],
  },
  managementProcess: {
    total: [20, 25],
    rows: [
      ['MP1', 'Courseware issue to students done on time/Usage of LMS', 5, [1, 1.25]],
      ['MP2', 'Log book for Genset & Vehicle (Y/N)', [10, 20], [2, 5]],
      ['MP3', 'TIRM details register', [20, 30], [4, 7.5]],
      ['MP4', 'Availability and requirement of Biometric (Y/N) as per MOU', [5, 25], [1, 6.25]],
      ['MP5', 'Physical asset verification', [25, 10], [5, 2.5]],
      ['MP6', 'Monthly Centre Review Meeting is conducted', [30, 5], [6, 1.25]],
      ['MP7', 'Verification of bill authenticity', 5, [1, 1.25]],
    ],
  },
};

// ========================================
// CDC / SDC
// ========================================
const CDC_CONFIG = {
  frontOffice: {
    total: [30, 35],
    rows: [
      ['FO1', 'Enquires Entered in Pulse(Y/N)', 30, [9, 10.5]],
      ['FO2', 'Enrolment form available in Pulse(Y/N)', 20, [6, 7]],
      ['FO3', 'Pre assessment Available(Y/N)', 0, 0],
      ['FO4', 'Documents uploaded in Pulse(Y/N)', 40, [12, 14]],
      ['FO5', 'Availability of Marketing Material(Y/N)', 10, [3, 3.5]],
    ],
  },
  deliveryProcess: {
    total: [40, 45],
    rows: [
      ['DP1', 'Batch file maintained for all running batches', 15, [6, 6.75]],
      ['DP2', 'Batch Heath Card available for all batches where batch duration is >= 30 days', 10, [4, 4.5]],
      ['DP3', 'Attendance marked in EDL sheets correctly', 15, [6, 6.75]],
      ['DP4', 'BMS maintained with observations >= 30 days', 5, [2, 2.25]],
      ['DP5', 'FACT Certificate available at Center (Y/N)', 10, [4, 4.5]],
      ['DP6', 'Post Assessment if applicable', 0, 0],
      ['DP7', 'Appraisal sheet is maintained (Y/N)', 10, [4, 4.5]],
      ['DP8', 'Appraisal status updated in Pulse(Y/N)', 5, [2, 2.25]],
      ['DP9', 'Certification Status of eligible students', 10, [4, 4.5]],
      ['DP10', 'Student signature obtained while issuing certificates', 10, [4, 4.5]],
      ['DP11', 'Verification between System issue date Vs actual certificate issue date', 10, [4, 4.5]],
    ],
  },
  placementProcess: {
    total: 15,
    rows: [
      ['PP1', 'Student Placement Response', 15, 2.25],
      ['PP2', 'CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation', 10, 1.5],
      ['PP3', 'Placement Bank & Aging', 15, 2.25],
      ['PP4', 'Placement Proof Upload', 60, 9.0],
    ],
  },
  managementProcess: {
    total: [15, 20],
    rows: [
      ['MP1', 'Courseware issue to students done on time/Usage of LMS', 5, [0.75, 1]],
      ['MP2', 'TIRM details register', 20, [3, 4]],
      ['MP3', 'Monthly Centre Review Meeting is conducted', 35, [5.25, 7]],
      ['MP4', 'Physical asset verification', 30, [4.5, 6]],
      ['MP5', 'Verification of bill authenticity', 10, [1.5, 2]],
    ],
  },
};

export function getCheckpointsByArea(centerType, placementApplicable) {
  const isNA = placementApplicable === 'no';
  const idx = isNA ? NA : NORMAL;
  const config = centerType === 'DTV' ? DTV_CONFIG : CDC_CONFIG;

  return {
    frontOffice: buildArea(idx, 'Front Office', config.frontOffice.total, config.frontOffice.rows),
    deliveryProcess: buildArea(idx, 'Delivery Process', config.deliveryProcess.total, config.deliveryProcess.rows),
    placementProcess: buildPlacementArea(isNA, idx, config.placementProcess.total, config.placementProcess.rows),
    managementProcess: buildArea(idx, 'Management Process', config.managementProcess.total, config.managementProcess.rows),
  };
}