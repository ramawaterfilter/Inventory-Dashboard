# Rama Inventory Dashboard — Static Prototype

This is a frontend-only functional prototype created from the supplied `Rama Inventory Dashboard For Nice.xlsx`.

## Run

No backend or build step is required.

1. Keep `index.html`, `styles.css`, `app.js`, and `mock-data.json` in the same folder.
2. Open `index.html` in a browser.

If the browser blocks local JSON loading, run a tiny local static server:

```bash
python -m http.server 5500
```

Then open:

`http://localhost:5500`

## Included

- Dashboard
- Inventory search/filter
- SKU detail modal
- Inventory movement/history
- Inbound shipments
- Fixed/SKU-specific/sales-velocity stock rules
- Pipeline monitoring
- User & role management
- CSV export
- Browser print-to-PDF report
- Mock factory Excel import flow
- Mock sync flow

## Not included yet

- FastAPI
- PostgreSQL
- Real authentication
- Amazon API
- Eshopbox API
- Real Excel persistence
- Background jobs
- AI services

The prototype intentionally keeps the data layer static so the UI/UX can be reviewed before the backend is built.
