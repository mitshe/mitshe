---
description: Jest and Vitest unit testing patterns
---

## Unit Testing

### Jest

```bash
# Run all tests
npx jest

# Watch mode
npx jest --watch

# Specific file
npx jest src/utils/auth.test.ts

# Coverage
npx jest --coverage
```

### Vitest

```bash
npx vitest
npx vitest run           # single run (no watch)
npx vitest --coverage    # with coverage
npx vitest --ui          # browser UI
```

### Writing tests

```typescript
describe('calculateTotal', () => {
  it('should sum items correctly', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should throw on negative prices', () => {
    expect(() => calculateTotal([{ price: -1 }])).toThrow();
  });
});
```

### Mocking

```typescript
// Mock module
jest.mock('./database', () => ({
  query: jest.fn().mockResolvedValue([{ id: 1 }]),
}));

// Mock function
const callback = jest.fn();
callback.mockReturnValue(42);

// Spy
const spy = jest.spyOn(service, 'save');
expect(spy).toHaveBeenCalledWith({ name: 'test' });
```

### Vitest mocking

```typescript
import { vi } from 'vitest';

vi.mock('./database', () => ({
  query: vi.fn().mockResolvedValue([{ id: 1 }]),
}));
```

### Best practices

- Test behavior, not implementation
- One assertion per test (where practical)
- Use descriptive test names: "should return 404 when user not found"
- Arrange-Act-Assert pattern
- Don't test external libraries
- Keep tests fast — mock I/O
