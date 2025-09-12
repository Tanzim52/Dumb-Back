// simple middleware to require admin role
module.exports = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.user.userType !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
};
