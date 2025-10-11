🛍️ CodeAlpha E-commerce Store

This is a **fully functional mini E-commerce web application** built as part of the CodeAlpha internship program.  
It includes both **frontend and backend** implementations, with user authentication, dynamic product display, and cart management.

---

1.## 🚀 Features

### 🧩 Frontend (HTML, CSS, JavaScript)
- Beautiful, responsive interface
- Product listing by category (T-Shirts, Shoes, Watches, Bags)
- Add to Cart, Remove, and Quantity Update features
- Real-time Cart Badge counter
- Checkout simulation popup
- Login and Signup pages with styled forms
- LocalStorage integration for user sessions

2.### ⚙️ Backend (Node.js + Express + MongoDB)
- User registration & login with JWT authentication
- Secure password hashing using **bcrypt**
- Environment variable management with **dotenv**
- Database connection via **MongoDB Atlas**
- Organized project structure for scalability

---

3.## 🧠 Technologies Used

| Area | Technology |
|------|-------------|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas) |
| Security | JWT, bcrypt.js |
| Tools | Nodemon, Git, VS Code |

---

4.## 🖥️ How to Run the Project

5.### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Muzammil-s/CodeAlpha-Ecommerence-store.git
cd CodeAlpha-Ecommerence-store
2️⃣ Backend Setup
bash
Copy code
cd backend
npm install
Create a .env file inside the backend folder and add:

ini
Copy code
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=mysecretkey
Start the backend server:

bash
Copy code
npm run dev
3️⃣ Frontend Setup
Just open index.html in your browser or use VS Code’s Live Server extension.

6.💾 Folder Structure
pgsql
Copy code
CodeAlpha-Ecommerence-store/
│
├── backend/
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── index.html
│   ├── cart.html
│   ├── login.html
│   ├── signup.html
│   ├── app.js
│   └── style.css
│
└── README.md
7.🧑‍💻 Author
Muzammil
🌐 https://github.com/Muzammil-s/CodeAlpha-Ecommerence-store

