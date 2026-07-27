Blush & Buy — Makeup Recommendation App (Backend)

A Node.js/Express backend powering an AI-driven makeup recommendation and e-commerce app. This API handles facial landmark detection to generate personalized product recommendations, alongside standard e-commerce functionality (products, orders, users). The companion Flutter frontend lives at makeup-recommender-flutter.

Overview

The backend receives face images from the mobile app, runs facial landmark detection through a face model to extract relevant features, and uses those features to generate personalized makeup product recommendations. It also serves as the API layer for the app's e-commerce functionality — products, brands, categories, cart, orders, and user accounts.

Features


Facial landmark detection — processes face images to extract features used for recommendations
Recommendation engine — maps detected facial features to suggested products, shades, and brands
Product catalog API — CRUD endpoints for products, brands, categories, and shades
Order management — cart, checkout, and order history endpoints
User authentication — registration, login, and session handling
Admin endpoints — product, brand, category, and order management for the admin panel


Tech Stack


Runtime: Node.js
Framework: Express
ORM / Database: Prisma
Computer vision: Facial landmark detection model
Frontend: Flutter (see frontend repo)


Getting Started


Clone the repo and install dependencies:


   git clone https://github.com/samirajubaii/makeup-recommender-backend.git
   cd makeup-recommender-backend
   npm install


Set up your environment variables (database connection string, any model/API keys) in a .env file — see .env.example if provided, or check prisma/schema.prisma for the expected database config.
Run Prisma migrations:


   npx prisma migrate dev


Start the server:


   npm start

API

The API serves the Flutter mobile app. Update the base URL in the frontend's lib/api.dart and lib/core/api/constants.dart to point to wherever this backend is running.

Author

Samira Jubaii
