import {
  calculatePercentage,
  calculateNeededFor75,
  isEligible,
  computeEligibility,
  computeOverallStats,
} from '../../services/eligibilityService.js';

describe('Eligibility Service', () => {
  describe('calculatePercentage', () => {
    it('returns 0 when total is 0', () => {
      expect(calculatePercentage(0, 0)).toBe(0);
    });

    it('returns 100 when all present', () => {
      expect(calculatePercentage(10, 10)).toBe(100);
    });

    it('returns 0 when none present', () => {
      expect(calculatePercentage(0, 10)).toBe(0);
    });

    it('returns 75 for 3 out of 4', () => {
      expect(calculatePercentage(3, 4)).toBe(75);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculatePercentage(1, 3)).toBe(33.33);
    });
  });

  describe('calculateNeededFor75', () => {
    it('returns 0 when already eligible', () => {
      expect(calculateNeededFor75(10, 10)).toBe(0);
    });

    it('returns correct number for 50%', () => {
      // (5 + x) / (10 + x) >= 0.75 => x >= 10
      expect(calculateNeededFor75(5, 10)).toBe(10);
    });

    it('returns 0 when total is 0', () => {
      expect(calculateNeededFor75(0, 0)).toBe(0);
    });
  });

  describe('isEligible', () => {
    it('returns true for 75%', () => {
      expect(isEligible(75)).toBe(true);
    });

    it('returns false for below 75%', () => {
      expect(isEligible(74.99)).toBe(false);
    });
  });

  describe('computeEligibility', () => {
    it('returns correct values for 50%', () => {
      const result = computeEligibility(5, 10);
      expect(result.currentPercentage).toBe(50);
      expect(result.neededFor75).toBe(10);
      expect(result.isEligible).toBe(false);
    });

    it('returns eligible for 100%', () => {
      const result = computeEligibility(10, 10);
      expect(result.isEligible).toBe(true);
    });
  });

  describe('computeOverallStats', () => {
    it('aggregates subject stats correctly', () => {
      const result = computeOverallStats([
        { subject: 'Math', total: 10, present: 8, absent: 2 },
        { subject: 'Science', total: 10, present: 6, absent: 4 },
      ]);
      expect(result.total).toBe(20);
      expect(result.present).toBe(14);
      expect(result.percentage).toBe(70);
    });

    it('returns 0 for empty stats', () => {
      const result = computeOverallStats([]);
      expect(result.percentage).toBe(0);
    });
  });
});
