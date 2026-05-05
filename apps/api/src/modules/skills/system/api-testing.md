---
description: REST/GraphQL API testing with httpie, curl, and k6
---

## API Testing

### Quick requests with httpie

```bash
# GET
http GET http://localhost:3000/api/users

# POST with JSON
http POST http://localhost:3000/api/users name=John email=john@test.com

# With auth header
http GET http://localhost:3000/api/me Authorization:"Bearer $TOKEN"

# Upload file
http --form POST http://localhost:3000/api/upload file@./data.csv
```

### curl for complex requests

```bash
# POST with JSON body
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@test.com"}'

# With cookies
curl -b cookies.txt -c cookies.txt http://localhost:3000/api/session
```

### Testing patterns

**Status code assertions:**
```bash
# Check response code
http --check-status GET http://localhost:3000/api/health
```

**Response body validation with jq:**
```bash
curl -s http://localhost:3000/api/users | jq '.data | length'
curl -s http://localhost:3000/api/users | jq '.data[0].email'
```

### GraphQL

```bash
http POST http://localhost:3000/graphql \
  query='{ users { id name email } }'
```

### Load testing with k6 (if installed)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 10, duration: '30s' };

export default function() {
  const res = http.get('http://localhost:3000/api/health');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run load-test.js
```

### Mock server

```bash
# Quick JSON mock with json-server
npx json-server --watch db.json --port 4000
```
