const jwt = require('jsonwebtoken');

const adminLogin = (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required',
    });
  }

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
    });
  }

  const token = jwt.sign(
    {
      sub: 'admin',
      role: 'admin',
      email,
      isAdminToken: true,
      name: process.env.ADMIN_NAME || 'Admin',
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '12h' },
  );

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      admin: {
        name: process.env.ADMIN_NAME || 'Admin',
        email,
      },
    },
  });
};

module.exports = { adminLogin };


