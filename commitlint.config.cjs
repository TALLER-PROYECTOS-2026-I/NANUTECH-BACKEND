module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // nueva funcionalidad
        "fix", // corrección de bug
        "docs", // documentación
        "style", // formato, sin cambio de lógica
        "refactor", // refactorización
        "test", // tests
        "chore", // tareas de mantenimiento
        "perf", // mejora de rendimiento
        "ci", // cambios de CI/CD
        "build", // cambios de build/deploy
        "revert", // revertir commit
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-max-length": [2, "always", 72],
    "scope-case": [2, "always", "lower-case"],
  },
};
