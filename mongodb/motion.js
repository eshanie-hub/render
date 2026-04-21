const mongoose = require('mongoose');

const MotionSchema = new mongoose.Schema({
  
  time: { 
    type: String, 
    required: true
  },
  
  
  total_g: { 
    type: Number, 
    required: true 
  },
  
  net_g: { 
    type: Number, 
    required: true 
  },
  
  // Rule-based Status 
  status: { 
    type: String, 
    required: true,
  },
  
  // Machine Learning Output 
  ml_class: {
    type: String,
    required: true
  },

  // ML Confidence Percentage 
  ml_conf: {
    type: Number,
    required: true
  },

  // Calculated Risk Level 
  risk_score: {
    type: Number,
    required: true
  },
  rolling_risk: {
    type: Number,
    default: 0
},

  
  alert: { 
    type: Boolean, 
    required: true 
  }
  
}, { 
  
  timestamps: true 
});


MotionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MotionLog', MotionSchema);