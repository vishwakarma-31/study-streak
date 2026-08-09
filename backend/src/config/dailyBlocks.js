const DAILY_BLOCKS = {
  weekday: [
    { index: 0, label: 'Watch/learn', time: '4:15 am' },
    { index: 1, label: 'Practice', time: '5:05 am' },
    { index: 2, label: 'Apply/project', time: '8:00 pm' },
    { index: 3, label: null, time: '8:50 pm' }, // DSA Mon/Wed/Fri, Revision Tue/Thu
  ],
  saturday: [
    { index: 0, label: 'Project AM', time: '4:15 am' },
    { index: 1, label: 'Project AM continued', time: '7:00 am' },
    { index: 2, label: 'Extended DSA', time: '9:30 am' },
    { index: 3, label: 'Project PM', time: '2:00 pm' },
  ],
  sunday: [
    { index: 0, label: 'Topic review', time: '4:15 am' },
    { index: 1, label: 'DSA review', time: '7:00 am' },
    { index: 2, label: 'Bug fixes', time: '2:00 pm' },
    { index: 3, label: 'Weekly planning', time: '8:00 pm' },
  ],
};

module.exports = DAILY_BLOCKS;
