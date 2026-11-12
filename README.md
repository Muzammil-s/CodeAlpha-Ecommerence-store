# E-Commerce Store

A learning full-stack e-commerce project with a browser-based storefront and a Node.js/Express API backed by MongoDB.

## Features

### Frontend
- Responsive product catalogue and category sections
- Add and remove cart items
- Update item quantities and cart count
- Cart page and checkout interaction prototype
- Login and signup screens
- Browser storage for selected client-side state

### Backend
- Express API with authentication routes
- MongoDB persistence through Mongoose
- Password hashing with bcryptjs
- JWT-based authentication flow
- Environment-based configuration with dotenv

> The checkout flow is a demonstration, not a live payment integration. Do not describe it as a production payment system unless a payment provider has actually been integrated and tested.

## Tech stack

HTML, CSS, JavaScript, Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, and Git.

## Run locally

1. Clone the repository and enter the backend folder:

   ```bash
   git clone https://github.com/Muzammil-s/CodeAlpha-Ecommerence-store.git
   cd CodeAlpha-Ecommerence-store/backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `backend/.env` with local values based on `.env.example`:

   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/ecommerce_store
   JWT_SECRET=replace_with_a_long_random_secret
   ```

4. Start the backend:

   ```bash
   npm run dev
   ```

5. Open the frontend entry page from `frontend/` in a browser or with VS Code Live Server. Check the API base URL in the frontend scripts and make sure it matches the local backend.

## Security and repository hygiene

- Keep real `.env` files out of Git.
- Keep `node_modules/` out of Git; install dependencies with `npm install` from `package.json`.
- Rotate any database password or signing secret that was previously committed publicly.

## Repository

[github.com/Muzammil-s/CodeAlpha-Ecommerence-store](https://github.com/Muzammil-s/CodeAlpha-Ecommerence-store)
