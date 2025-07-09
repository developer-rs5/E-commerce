// makeAdmin.js
import mongoose from 'mongoose'
// Replace with your MongoDB connection string
const MONGO_URI = 'mongodb+srv://rsnetwork98:Network.rs.99%23%23@e-commerce.b1rumi2.mongodb.net/E-commerce';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  makeUserAdmin();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  isAdmin: Boolean
}, { strict: false }); // allow other fields too

const User = mongoose.model('User', userSchema);

// Update the user to be admin
async function makeUserAdmin() {
  const email = 'ravikantkemkc@fuck.you'; // <-- change this

  try {
    const result = await User.updateOne(
      { email },
      { $set: { isAdmin: true } }
    );

    if (result.modifiedCount === 0) {
      console.log('No user found or already admin.');
    } else {
      console.log(`User ${email} is now an admin.`);
    }
  } catch (err) {
    console.error('Error updating user:', err);
  } finally {
    mongoose.disconnect();
  }
}
