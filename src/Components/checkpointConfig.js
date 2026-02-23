// ✅ CHECKPOINT CONFIGURATION - FRESH VERSION
// getCheckpointsByArea(centerType, placementApplicable)

export function getCheckpointsByArea(centerType, placementApplicable) {
  const isNA = placementApplicable === 'no';
  
  // DTV Configuration
  if (centerType === 'DTV') {
    return {
      frontOffice: {
        areaName: 'Front Office',
        totalScore: 30,
        checkpoints: [
          { id: 'FO1', name: 'Enquires Entered in Pulse(Y/N)', weightage: 30, maxScore: 9 },
          { id: 'FO2', name: 'Enrolment form available in Pulse(Y/N)', weightage: 20, maxScore: 6 },
          { id: 'FO3', name: 'Pre assessment Available(Y/N)', weightage: 0, maxScore: 0 },
          { id: 'FO4', name: 'Documents uploaded in Pulse(Y/N)', weightage: 40, maxScore: 12 },
          { id: 'FO5', name: 'Availability of Marketing Material(Y/N)', weightage: 10, maxScore: 3 }
        ]
      },
      deliveryProcess: {
        areaName: 'Delivery Process',
        totalScore: isNA ? 45 : 40,
        checkpoints: [
          { id: 'DP1', name: 'Batch file maintained for all running batches', weightage: isNA ? 20 : 15, maxScore: isNA ? 9 : 6 },
          { id: 'DP2', name: 'Batch Heath Card available for all batches where batch duration is >= 30 days', weightage: isNA ? 0 : 10, maxScore: isNA ? 0 : 4 },
          { id: 'DP3', name: 'Attendance marked in EDL sheets correctly', weightage: isNA ? 20 : 15, maxScore: isNA ? 9 : 6 },
          { id: 'DP4', name: 'BMS maintained with observations >= 30 days', weightage: 5, maxScore: isNA ? 2.25 : 2 },
          { id: 'DP5', name: 'FACT Certificate available at Center (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP6', name: 'Post Assessment if applicable', weightage: 0, maxScore: 0 },
          { id: 'DP7', name: 'Appraisal sheet is maintained (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP8', name: 'Appraisal status updated in Pulse(Y/N)', weightage: 5, maxScore: isNA ? 2.25 : 2 },
          { id: 'DP9', name: 'Certification Status of eligible students', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP10', name: 'Student signature obtained while issuing certificates', weightage: 10, maxScore: isNA ? 4.5 : 4 },
          { id: 'DP11', name: 'Verification between System issue date Vs actual certificate issue date', weightage: 10, maxScore: isNA ? 4.5 : 4 }
        ]
      },
      placementProcess: {
        areaName: 'Placement Process',
        totalScore: isNA ? 0 : 10,
        isNA: isNA,
        checkpoints: isNA ? [] : [
          { id: 'PP1', name: 'Student Placement Response', weightage: 15, maxScore: 1.5 },
          { id: 'PP2', name: 'CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation', weightage: 10, maxScore: 1.0 },
          { id: 'PP3', name: 'Placement Bank & Aging', weightage: 15, maxScore: 1.5 },
          { id: 'PP4', name: 'Placement Proof Upload', weightage: 60, maxScore: 6.0 }
        ]
      },
      managementProcess: {
        areaName: 'Management Process',
        totalScore: isNA ? 25 : 20,
        checkpoints: [
          { id: 'MP1', name: 'Courseware issue to students done on time/Usage of LMS', weightage: 5, maxScore: isNA ? 1.25 : 1 },
          { id: 'MP2', name: 'Log book for Genset & Vehicle (Y/N)', weightage: isNA ? 20 : 10, maxScore: isNA ? 5 : 2 },
          { id: 'MP3', name: 'TIRM details register', weightage: isNA ? 30 : 20, maxScore: isNA ? 7.5 : 4 },
          { id: 'MP4', name: 'Availability and requirement of Biometric (Y/N) as per MOU', weightage: isNA ? 25 : 5, maxScore: isNA ? 6.25 : 1 },
          { id: 'MP5', name: 'Physical asset verification', weightage: isNA ? 10 : 25, maxScore: isNA ? 2.5 : 5 },
          { id: 'MP6', name: 'Monthly Centre Review Meeting is conducted', weightage: isNA ? 5 : 30, maxScore: isNA ? 1.25 : 6 },
          { id: 'MP7', name: 'Verification of bill authenticity', weightage: 5, maxScore: isNA ? 1.25 : 1 }
        ]
      }
    };
  }
  
  // CDC/SDC Configuration
  return {
    frontOffice: {
      areaName: 'Front Office',
      totalScore: isNA ? 35 : 30,
      checkpoints: [
        { id: 'FO1', name: 'Enquires Entered in Pulse(Y/N)', weightage: 30, maxScore: isNA ? 10.5 : 9 },
        { id: 'FO2', name: 'Enrolment form available in Pulse(Y/N)', weightage: 20, maxScore: isNA ? 7 : 6 },
        { id: 'FO3', name: 'Pre assessment Available(Y/N)', weightage: 0, maxScore: 0 },
        { id: 'FO4', name: 'Documents uploaded in Pulse(Y/N)', weightage: 40, maxScore: isNA ? 14 : 12 },
        { id: 'FO5', name: 'Availability of Marketing Material(Y/N)', weightage: 10, maxScore: isNA ? 3.5 : 3 }
      ]
    },
    deliveryProcess: {
      areaName: 'Delivery Process',
      totalScore: isNA ? 45 : 40,
      checkpoints: [
        { id: 'DP1', name: 'Batch file maintained for all running batches', weightage: 15, maxScore: isNA ? 6.75 : 6 },
        { id: 'DP2', name: 'Batch Heath Card available for all batches where batch duration is >= 30 days', weightage: 10, maxScore: isNA ? 4.5 : 4 },
        { id: 'DP3', name: 'Attendance marked in EDL sheets correctly', weightage: 15, maxScore: isNA ? 6.75 : 6 },
        { id: 'DP4', name: 'BMS maintained with observations >= 30 days', weightage: 5, maxScore: isNA ? 2.25 : 2 },
        { id: 'DP5', name: 'FACT Certificate available at Center (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
        { id: 'DP6', name: 'Post Assessment if applicable', weightage: 0, maxScore: 0 },
        { id: 'DP7', name: 'Appraisal sheet is maintained (Y/N)', weightage: 10, maxScore: isNA ? 4.5 : 4 },
        { id: 'DP8', name: 'Appraisal status updated in Pulse(Y/N)', weightage: 5, maxScore: isNA ? 2.25 : 2 },
        { id: 'DP9', name: 'Certification Status of eligible students', weightage: 10, maxScore: isNA ? 4.5 : 4 },
        { id: 'DP10', name: 'Student signature obtained while issuing certificates', weightage: 10, maxScore: isNA ? 4.5 : 4 },
        { id: 'DP11', name: 'Verification between System issue date Vs actual certificate issue date', weightage: 10, maxScore: isNA ? 4.5 : 4 }
      ]
    },
    placementProcess: {
      areaName: 'Placement Process',
      totalScore: isNA ? 0 : 15,
      isNA: isNA,
      checkpoints: isNA ? [] : [
        { id: 'PP1', name: 'Student Placement Response', weightage: 15, maxScore: 2.25 },
        { id: 'PP2', name: 'CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation', weightage: 10, maxScore: 1.50 },
        { id: 'PP3', name: 'Placement Bank & Aging', weightage: 15, maxScore: 2.25 },
        { id: 'PP4', name: 'Placement Proof Upload', weightage: 60, maxScore: 9.00 }
      ]
    },
    managementProcess: {
      areaName: 'Management Process',
      totalScore: isNA ? 20 : 15,
      checkpoints: [
        { id: 'MP1', name: 'Courseware issue to students done on time/Usage of LMS', weightage: 5, maxScore: isNA ? 1 : 0.75 },
        { id: 'MP2', name: 'TIRM details register', weightage: 20, maxScore: isNA ? 4 : 3.00 },
        { id: 'MP3', name: 'Monthly Centre Review Meeting is conducted', weightage: 35, maxScore: isNA ? 7 : 5.25 },
        { id: 'MP4', name: 'Physical asset verification', weightage: 30, maxScore: isNA ? 6 : 4.50 },
        { id: 'MP5', name: 'Verification of bill authenticity', weightage: 10, maxScore: isNA ? 2 : 1.50 }
      ]
    }
  };
}