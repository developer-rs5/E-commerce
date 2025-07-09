import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true, // required for SameSite: "none"
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return token; // ✅ Return it here
};

export default generateToken;
