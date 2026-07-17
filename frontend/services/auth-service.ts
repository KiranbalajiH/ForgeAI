export const authService = {
  login: async (data: unknown) => {
    console.log("Login", data);
  },

  signup: async (data: unknown) => {
    console.log("Signup", data);
  },

  forgotPassword: async (data: unknown) => {
    console.log("Forgot Password", data);
  },
};