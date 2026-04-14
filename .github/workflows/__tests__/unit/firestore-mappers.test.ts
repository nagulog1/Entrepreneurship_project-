/**
 * Unit tests for Firestore mapper utilities.
 */

import { mapUserToLeaderboardUser } from '@/lib/utils/firestoreMappers';

// Read the actual mapper to understand its interface
describe('firestoreMappers', () => {
  describe('mapUserToLeaderboardUser', () => {
    it('maps a full user document to leaderboard format', () => {
      const firestoreUser = {
        id: 'user123',
        uid: 'user123',
        displayName: 'Test User',
        college: 'IIT Bombay',
        photoURL: 'https://example.com/photo.jpg',
        skills: ['React', 'Python'],
        stats: {
          xp: 1500,
          totalChallengesSolved: 10,
          currentStreak: 5,
          globalRank: 3,
        },
      };

      const result = mapUserToLeaderboardUser(firestoreUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('user123');
      expect(typeof result.name).toBe('string');
      expect(typeof result.score).toBe('number');
    });

    it('handles missing optional fields gracefully', () => {
      const minimalUser = {
        id: 'user456',
      };

      const result = mapUserToLeaderboardUser(minimalUser);
      expect(result).toBeDefined();
      expect(result.id).toBe('user456');
    });
  });
});
