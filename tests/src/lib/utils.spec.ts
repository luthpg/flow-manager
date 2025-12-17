import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const condition = true;
      const result = cn(
        'class1',
        condition && 'class2',
        !condition && 'class3',
      );
      expect(result).toBe('class1 class2');
    });

    it('should merge tailwind classes properly (twMerge)', () => {
      // p-2 と p-4 が競合する場合、後勝ちになるべき
      const result = cn('p-2', 'p-4');
      expect(result).toBe('p-4');
    });

    it('should handle array inputs', () => {
      const result = cn(['class1', 'class2']);
      expect(result).toBe('class1 class2');
    });
  });
});
