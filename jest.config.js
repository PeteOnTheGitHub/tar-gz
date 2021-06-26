module.exports = {
    "transform": {
        "^.+\\.tsx?$": "ts-jest",
    },
    "collectCoverageFrom": [
      "index.ts",
    ],
    "coverageReporters": [
      "cobertura",
      "lcov",
      "text-summary"
    ],
    "coverageDirectory": "<rootDir>/test",
    "moduleFileExtensions": [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json"
    ],
    "testMatch": [
      "<rootDir>/**/?(*.)(spec|test).ts?(x)"
    ],
    "testPathIgnorePatterns": ["/lib/", "/node_modules/"],
    "transformIgnorePatterns": [
      "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$"
    ]
  }