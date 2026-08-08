import { api } from "@/lib/axios";

export const authService = {
  async login(data: unknown) {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async signup(data: unknown) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async forgotPassword(data: unknown) {
    console.log("Forgot Password:", data);

    return Promise.resolve();
  },
};