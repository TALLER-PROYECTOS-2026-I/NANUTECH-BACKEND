import { describe, it, expect } from "@jest/globals";
import { UserModel } from "../../../src/functions/auth-services/authModel.mjs";

describe("AuthModel", () => {
  it("expone la estructura base de usuario local", () => {
    expect(UserModel).toEqual({
      email: "",
      password: "",
      role: "",
      attempts: 0,
      locked: false,
    });
  });
});
