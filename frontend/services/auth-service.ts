import { api } from "@/lib/axios";

export const authService = {
  async login(data: unknown) {
    console.log("Login Request:", data);

    // Future backend integration:
    // return api.post("/auth/login", data);

    return Promise.resolve();
  },

  async signup(data: unknown) {
    console.log("Signup Request:", data);

    // return api.post("/auth/signup", data);

    return Promise.resolve();
  },

  async forgotPassword(data: unknown) {
    console.log("Forgot Password:", data);

    // return api.post("/auth/forgot-password", data);

    return Promise.resolve();
  },
};