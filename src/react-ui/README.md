# Grocery Restocking System - React UI

A simple React-based user interface for the Grocery Restocking System.

## Features

- ✅ Add grocery items with name, category, quantity, and price
- ✅ Mark items as consumed (finished) with checkbox
- ✅ Buy again functionality to restock items
- ✅ Real-time quantity tracking
- ✅ Clean, todo-list style interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API URL:
   - Update the `DEFAULT_API_BASE_URL` in `src/App.js` with your actual API Gateway URL
   - Or enter it in the API configuration field in the UI (it will be saved to localStorage)

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## API Endpoints Used

- `POST /items` - Add a new grocery item
- `POST /consume-item` - Mark an item as consumed
- `PUT /items/{id}` - Update item quantity (for buy again)

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Notes

- The API Base URL can be configured in the UI and is saved to browser localStorage
- Make sure your API Gateway allows CORS requests from your React app's origin
- The app uses mock data for demonstration when no items are loaded

