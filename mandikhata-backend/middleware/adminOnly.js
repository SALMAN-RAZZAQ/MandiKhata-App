const adminOnly = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      error: 'Bhai jan! Yeh kaam sirf Seth (Admin) kar sakta hai!' 
    });
  }
  next();
};

module.exports = adminOnly;