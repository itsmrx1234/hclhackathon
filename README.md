# hclhackathon

Retail ordering platform backend (Spring Boot) with a React-based frontend served from `backend/src/main/resources/static`.

## Website scope implemented

- Customer browsing for Pizza, Cold Drinks, Breads, and other catalog items
- Cart operations and order placement
- Order history with quick reorder
- Promotions UI (coupon preview) and loyalty points display
- Centralized category visibility (brand + packaging)
- Admin catalog, inventory, and order-status operations

## Frontend stack

- React 18 (UMD) + ReactDOM
- Babel standalone for JSX transform in browser
- Existing static stylesheet (`styles.css`)

## Run

1. Set database env vars expected by `application.properties`:
   - `DB_URL`
   - `DB_USER`
   - `DB_PWD`
2. Start backend:
   - `cd backend`
   - `sh mvnw spring-boot:run`
3. Open `http://localhost:8080`
