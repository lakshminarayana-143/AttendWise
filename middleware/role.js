const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    if (
      req.user.role === "faculty" &&
      !req.user.isApproved
    ) {
      return res.status(403).json({
        success: false,
        message: "Your faculty account is awaiting approval.",
      });
    }

    next();
  };
};

module.exports = roleMiddleware;