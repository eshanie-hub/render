const User = require('../mongodb/register');

exports.register = async (req, res) => {
  try {
    const { medicineBoxId, userRole, password } = req.body;


    let prefix = '';
    if (userRole === 'driver') prefix = 'd';
    else if (userRole === 'report') prefix = 'r';
    else if (userRole === 'system') prefix = 's';

  
    let isUnique = false;
    let generatedId = '';
    
    while (!isUnique) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      generatedId = `${prefix}${randomDigits}`;
      

      const existing = await User.findOne({ userId: generatedId });
      if (!existing) isUnique = true;
    }

  
    const newUser = new User({
      medicineBoxId,
      userRole,
      userId: generatedId,
      password 
    });

    await newUser.save();

    res.status(201).json({ 
      success: true, 
      generatedUserId: generatedId 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { medicineBoxId, userId, password } = req.body;

    const user = await User.findOne({ userId, medicineBoxId });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid User ID or Box ID" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    res.status(200).json({
      success: true,
      user: {
        userId: user.userId,
        userRole: user.userRole
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};