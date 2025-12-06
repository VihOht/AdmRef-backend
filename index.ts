import app from './src';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT || 3000}`);
})