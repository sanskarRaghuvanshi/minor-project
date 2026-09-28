export const COLLEGE_TIME_SLOTS = [
  { id: 'slot-1', slotNumber: 1, label: 'Period 1 (09:45 - 10:35 AM)', timeRange: '09:45 - 10:35', start: '09:45', end: '10:35' },
  { id: 'slot-2', slotNumber: 2, label: 'Period 2 (10:35 - 11:25 AM)', timeRange: '10:35 - 11:25', start: '10:35', end: '11:25' },
  { id: 'break-1', isBreak: true, label: 'Short Break (11:25 - 11:30 AM)', timeRange: '11:25 - 11:30' },
  { id: 'slot-3', slotNumber: 3, label: 'Period 3 (11:30 - 12:20 PM)', timeRange: '11:30 - 12:20', start: '11:30', end: '12:20' },
  { id: 'slot-4', slotNumber: 4, label: 'Period 4 (12:20 - 01:10 PM)', timeRange: '12:20 - 01:10', start: '12:20', end: '13:10' },
  { id: 'break-2', isBreak: true, label: 'Lunch Break (01:10 - 01:40 PM)', timeRange: '01:10 - 01:40' },
  { id: 'slot-5', slotNumber: 5, label: 'Period 5 (01:40 - 02:30 PM)', timeRange: '01:40 - 02:30', start: '13:40', end: '14:30' },
  { id: 'slot-6', slotNumber: 6, label: 'Period 6 (02:30 - 03:20 PM)', timeRange: '02:30 - 03:20', start: '14:30', end: '15:20' },
  { id: 'slot-7', slotNumber: 7, label: 'Period 7 (03:20 - 04:05 PM)', timeRange: '03:20 - 04:05', start: '15:20', end: '16:05' },
  { id: 'slot-8', slotNumber: 8, label: 'Period 8 (04:05 - 04:50 PM)', timeRange: '04:05 - 04:50', start: '16:05', end: '16:50' },
];

export const LECTURE_SLOTS = COLLEGE_TIME_SLOTS.filter((s) => !s.isBreak);

export const getCurrentSlot = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of LECTURE_SLOTS) {
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (currentMinutes >= startTotal && currentMinutes <= endTotal) {
      return slot;
    }
  }
  return null;
};
