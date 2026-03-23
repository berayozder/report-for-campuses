/**
 * Gamification module — Safety Points & Badges
 * Calculates points, badges, and leaderboard from report data.
 */

// ─── Point Rules ───
const POINTS = {
  REPORT_CREATED: 10,
  UPVOTE_RECEIVED: 2,
  REPORT_RESOLVED: 20,
};

// ─── Badge Definitions ───
export const BADGES = [
  {
    id: 'first_report',
    label: 'İlk Adım',
    labelEn: 'First Step',
    icon: 'flag',
    description: 'İlk ihbarını gönder',
    condition: (stats) => stats.reportCount >= 1,
  },
  {
    id: 'safety_scout',
    label: 'Güvenlik Gözcüsü',
    labelEn: 'Safety Scout',
    icon: 'visibility',
    description: '5 ihbar gönder',
    condition: (stats) => stats.reportCount >= 5,
  },
  {
    id: 'campus_hero',
    label: 'Kampüs Kahramanı',
    labelEn: 'Campus Hero',
    icon: 'military_tech',
    description: '10 ihbar gönder',
    condition: (stats) => stats.reportCount >= 10,
  },
  {
    id: 'community_star',
    label: 'Topluluk Yıldızı',
    labelEn: 'Community Star',
    icon: 'star',
    description: '50 toplam oy al',
    condition: (stats) => stats.totalUpvotesReceived >= 50,
  },
  {
    id: 'problem_solver',
    label: 'Çözüm Ustası',
    labelEn: 'Problem Solver',
    icon: 'verified',
    description: '3 ihbarı çözüme kavuştur',
    condition: (stats) => stats.resolvedCount >= 3,
  },
];

/**
 * Calculate stats for a user from report data.
 * @param {Array} reports - all reports
 * @param {string} userId
 * @returns {Object} stats
 */
function getUserStats(reports, userId) {
  const userReports = reports.filter((r) => r.userId === userId);
  const reportCount = userReports.length;
  const resolvedCount = userReports.filter((r) => r.status === 'Çözüldü').length;
  const totalUpvotesReceived = userReports.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  return { reportCount, resolvedCount, totalUpvotesReceived };
}

/**
 * Calculate total points for a user.
 * @param {Array} reports
 * @param {string} userId
 * @returns {number}
 */
export function calculateUserPoints(reports, userId) {
  if (!userId) return 0;
  const userReports = reports.filter((r) => r.userId === userId);

  let points = 0;
  points += userReports.length * POINTS.REPORT_CREATED;
  points += userReports.reduce((sum, r) => sum + (r.upvotes || 0), 0) * POINTS.UPVOTE_RECEIVED;
  points += userReports.filter((r) => r.status === 'Çözüldü').length * POINTS.REPORT_RESOLVED;

  return points;
}

/**
 * Get badges earned by a user.
 * @param {Array} reports
 * @param {string} userId
 * @returns {Array} earned badges
 */
export function getUserBadges(reports, userId) {
  if (!userId) return [];
  const stats = getUserStats(reports, userId);
  return BADGES.filter((badge) => badge.condition(stats));
}

/**
 * Get leaderboard — top reporters sorted by points.
 * @param {Array} reports
 * @returns {Array} [{userId, userName, points, reportCount, badges}]
 */
export function getLeaderboard(reports) {
  // Group by userId
  const userMap = new Map();

  reports.forEach((report) => {
    if (!report.userId) return; // skip anonymous
    if (!userMap.has(report.userId)) {
      userMap.set(report.userId, {
        userId: report.userId,
        userName: report.userName || 'Anonim',
        reportCount: 0,
      });
    }
    userMap.get(report.userId).reportCount++;
  });

  // Calculate points and badges for each user
  const leaderboard = Array.from(userMap.values()).map((user) => ({
    ...user,
    points: calculateUserPoints(reports, user.userId),
    badges: getUserBadges(reports, user.userId),
  }));

  // Sort by points descending
  leaderboard.sort((a, b) => b.points - a.points);

  return leaderboard;
}

/** Point rules (exported for display purposes) */
export const POINT_RULES = POINTS;
