const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  medicineBoxId: { type: String, required: true },
  userRole: { 
    type: String, 
    required: true, 
    enum: ['driver', 'report', 'system'] 
  },
  userId: { type: String, required: true, unique: true }, 
  password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);