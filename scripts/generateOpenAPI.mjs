import swaggerJsdoc from "swagger-jsdoc";
import fs from "node:fs";
import path from "node:path";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Backend",
      version: "1.0.0",
      description: "Documentación auto-generada desde JSDoc",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000",
        description: "Ambiente actual",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      // Schemas reutilizables para no repetirlos en cada endpoint
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operación exitosa" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error descripción" },
            code: { type: "string", example: "AUTH_ERROR" },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            nombres: { type: "string", nullable: true },
            apellidos: { type: "string", nullable: true },
            role: {
              type: "string",
              enum: ["admin", "chofer", "gerente"],
              nullable: true,
            },
            estado: { type: "string", nullable: true },
          },
        },
        SessionInfo: {
          type: "object",
          properties: {
            provider: { type: "string", example: "local" },
            accessToken: { type: "string" },
            tokenType: { type: "string", example: "Bearer" },
            expiresIn: { type: "integer", example: 3600 },
            expiresAt: { type: "string", format: "date-time" },
            isAuthenticated: { type: "boolean", example: true },
          },
        },
      },
    },
  },
  // Apunta a todos tus controllers de todas las functions
  apis: [
    "./src/open_api/**/*.docs.mjs",
    "./src/functions/**/*.mjs",
    "./src/functions/**/*Controller.mjs",
    "./open_api/**/*.mjs",
  ],
};

const spec = swaggerJsdoc(options);

const outputDir = path.resolve("./docs");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputFile = path.join(outputDir, "openapi.json");

fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));

console.log("══════════════════════════════════════");
console.log("✅ OpenAPI generado correctamente");
console.log("══════════════════════════════════════");
console.log(`📄 Archivo: ${outputFile}`);
console.log(`🌐 Server: ${process.env.API_URL || "http://localhost:3000"}`);
console.log(`📌 Paths detectados: ${Object.keys(spec.paths || {}).length}`);
console.log("══════════════════════════════════════");
