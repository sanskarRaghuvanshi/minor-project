export const calculatePercentage = (present, total) => {
  if (total === 0) return 0;
  return Math.round((present / total) * 100 * 100) / 100;
};

export const calculateNeededFor75 = (present, total) => {
  if (total === 0) return 0;
  const x = Math.ceil((0.75 * total - present) / 0.25);
  return x < 0 ? 0 : x;
};

export const isEligible = (percentage) => percentage >= 75;

export const computeEligibility = (present, total) => {
  const percentage = calculatePercentage(present, total);
  return {
    currentPercentage: percentage,
    totalClasses: total,
    presentClasses: present,
    neededFor75: calculateNeededFor75(present, total),
    isEligible: isEligible(percentage),
  };
};
