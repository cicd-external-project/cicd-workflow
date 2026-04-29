import { createGreeting } from "./app.service.js";

export function bootstrap() {
  return createGreeting("nestjs");
}
