import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  );
