import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { startPgMem, stopPgMem } from "../../helpers/pgMemDb.mjs";
import { CamionRepository } from "../../../src/functions/camion-services/camionRepository.mjs";

describe("CamionRepository con pg-mem", () => {
  beforeAll(async () => {
    await startPgMem();
  });

  afterAll(async () => {
    await stopPgMem();
  });

  it("debe obtener todos los camiones", async () => {
    const repository = new CamionRepository();
    const result = await repository.getAll();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("placa");
  });
});