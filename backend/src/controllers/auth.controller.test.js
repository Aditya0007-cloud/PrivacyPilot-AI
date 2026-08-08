import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { runController } from "../test-utils/controller.js";
import { getCurrentUser, login, register } from "./auth.controller.js";

const originalMethods = {
  create: User.create,
  findById: User.findById,
  findOne: User.findOne,
};

const users = new Map();

const publicUser = (user) => ({
  _id: {
    toString: () => user.id,
  },
  name: user.name,
  email: user.email,
  password: user.password,
  role: user.role,
  createdAt: user.createdAt,
});

const findByEmail = (email) => {
  const user = [...users.values()].find((item) => item.email === email);
  return user ? publicUser(user) : null;
};

const findById = (id) => {
  const user = users.get(id);
  return user ? publicUser(user) : null;
};

const registerPayload = {
  name: "Asha Kapoor",
  email: "Asha@Example.com",
  password: "secure123",
  role: "company",
};

beforeEach(() => {
  users.clear();

  User.findOne = (query) => ({
    select: async () => findByEmail(query.email),
    then: (resolve) => resolve(findByEmail(query.email)),
  });

  User.findById = async (id) => findById(id);

  User.create = async (payload) => {
    const user = {
      id: `${users.size + 1}`,
      ...payload,
      createdAt: new Date("2026-08-08T00:00:00.000Z"),
    };

    users.set(user.id, user);
    return publicUser(user);
  };
});

afterEach(() => {
  User.create = originalMethods.create;
  User.findById = originalMethods.findById;
  User.findOne = originalMethods.findOne;
});

describe("auth controllers", () => {
  it("registers a company user, hashes the password, and returns a token", async () => {
    const { res } = await runController(register, {
      body: registerPayload,
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.name, "Asha Kapoor");
    assert.equal(res.body.user.email, "asha@example.com");
    assert.equal(res.body.user.role, "company");
    assert.ok(res.body.token);
    assert.equal(res.body.user.password, undefined);

    const savedUser = users.get("1");
    assert.notEqual(savedUser.password, "secure123");
    assert.equal(await bcrypt.compare("secure123", savedUser.password), true);
  });

  it("rejects duplicate email registration", async () => {
    await runController(register, { body: registerPayload });
    const { res } = await runController(register, { body: registerPayload });

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already exists/i);
  });

  it("rejects missing registration fields and invalid roles", async () => {
    const missingResponse = await runController(register, {
      body: {
        email: "missing@example.com",
        password: "secure123",
        role: "user",
      },
    });

    const roleResponse = await runController(register, {
      body: {
        name: "Bad Role",
        email: "role@example.com",
        password: "secure123",
        role: "admin",
      },
    });

    assert.equal(missingResponse.res.statusCode, 400);
    assert.equal(roleResponse.res.statusCode, 400);
  });

  it("logs in and returns the current user for a valid JWT", async () => {
    await runController(register, {
      body: {
        name: "Dia Shah",
        email: "dia@example.com",
        password: "secure123",
        role: "user",
      },
    });

    const loginResponse = await runController(login, {
      body: {
        email: "dia@example.com",
        password: "secure123",
      },
    });

    assert.equal(loginResponse.res.statusCode, 200);
    assert.equal(loginResponse.res.body.user.role, "user");
    assert.ok(loginResponse.res.body.token);

    const authResponse = await runController(requireAuth, {
      headers: {
        authorization: `Bearer ${loginResponse.res.body.token}`,
      },
    });

    assert.equal(authResponse.res.statusCode, 200);
    assert.equal(authResponse.req.user.email, "dia@example.com");

    const meResponse = await runController(getCurrentUser, {
      user: authResponse.req.user,
    });

    assert.equal(meResponse.res.statusCode, 200);
    assert.equal(meResponse.res.body.user.email, "dia@example.com");
  });

  it("rejects invalid credentials and invalid or expired JWTs", async () => {
    await runController(register, {
      body: {
        name: "Nikhil Rao",
        email: "nikhil@example.com",
        password: "secure123",
        role: "company",
      },
    });

    const badLoginResponse = await runController(login, {
      body: {
        email: "nikhil@example.com",
        password: "wrong-password",
      },
    });

    const badTokenResponse = await runController(requireAuth, {
      headers: {
        authorization: "Bearer not-a-real-token",
      },
    });

    const expiredToken = jwt.sign({ sub: "1", role: "company" }, env.JWT_SECRET, {
      expiresIn: "-1s",
    });

    const expiredTokenResponse = await runController(requireAuth, {
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    });

    assert.equal(badLoginResponse.res.statusCode, 401);
    assert.equal(badTokenResponse.res.statusCode, 401);
    assert.equal(expiredTokenResponse.res.statusCode, 401);
  });
});
