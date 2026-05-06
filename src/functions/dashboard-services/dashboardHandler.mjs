import { getDashboardController } from "./dashboardController.mjs";

export const handler = async (event) => {
  return await getDashboardController(event);
};